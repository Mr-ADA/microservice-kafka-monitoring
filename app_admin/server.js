/*
  Author: Allen Dylan Antony
  Date: 17 June 2023
  Functionality: server.js acts a server for account microservices and handle entries
*/

//=================== DEVELOPMENT ENVIRONMENT ===============================
//import express to handle server
const express = require("express");
const app = express();

const path = require("path");
const mongoose = require("mongoose");

//import body parser to handle file formatting
const body_parser = require("body-parser");
var http = require("http");
//=================== KAFKA ENVIRONMENT ===============================

const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  brokers: ["kafka:9092"],
});

//============================= PRODUCER CONFIGURATION =====================================
const producer = kafka.producer({
  transactionTimeout: 30000,
});
producer.connect();

//============================= ADMIN CONFIGURATION =====================================
const admin = kafka.admin();
admin.connect();

//============================= ADMIN CONFIGURATION =====================================

//monitoring_helper is created to send message to monitoring microservces that the current service is available
const monitoring_helper = require("./monitoring_helper.js");
monitoring_helper.reportToMonitoring(admin, producer);

//================== MONGODB ENVIRONMENT ================================================
const servicesRunning = async () => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
    console.log("MongoDB is connected");
  });
};

servicesRunning();

// =========================== ACCOUNT SCHEMA ===========================================
const Schema = mongoose.Schema;

//define account schema
const accountSchema = new Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  phonenum: {
    type: String,
    required: true,
  },
  usertype: {
    type: String,
    required: true,
  },
});

//create model based on accountSchema
const Account = mongoose.model("Account", accountSchema);

//listen to port 3000 (localhost)
app.listen(3000);

//encode url
var url_encoded_parser = body_parser.urlencoded({ extended: true });

//set view engine for the project => dynamic content
app.set("view engine", "ejs");

// Serve static files from the "views" directory
app.use(express.static(path.join(__dirname, "views")));
app.use(express.json());
app.use(body_parser.json());
app.use(url_encoded_parser);

//============================== MIDDLEWARE & WEB ROUTING ==========================================
app.get("/", (req, res) => {
  res.render("login_view.ejs");
});

app.get("/register", (req, res) => {
  res.render("register_view.ejs");
});

app.get("/monitor", (req, res) => {
  app.listen = () => {
    var server = http.createServer(this);
    return server.listen.apply(server);
  };
  console.log("Listening to port 3002");
  res.writeHead(302, {
    Location: "localhost:3002/monitoring",
  });
  res.end();
});

//register new account and fill in into database
app.post("/registration-success", url_encoded_parser, (req, res) => {
  var entry = req.body;
  const account = new Account({
    username: entry.username,
    email: entry.email,
    password: entry.password,
    phonenum: entry.phonenum,
    usertype: entry.usertype,
  });

  account
    .save()
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.log("================================ ERROR OCCURED ======================================");
      console.log(err);
    });
  console.log(account);
  res.redirect("/admin-home");
});

//fill in table with data
app.get("/admin-home", (req, res) => {
  Account.find({})
    .then((accounts) => {
      res.render("./admin_home_view", { accounts });
    })
    .catch((error) => {
      console.error("Error retrieving data from MongoDB", error);
    });
});

//admin update account
app.post("/admin-update/:id", (req, res) => {
  var id = req.params.id;
  console.log(id);
  Account.findById(id)
    .then((account) => {
      console.log(account);
      res.render("admin_update_acc_view.ejs", { account });
    })
    .catch((error) => {
      console.error("Error retrieving data from MongoDB", error);
    });
});

//get form input from login_view
app.post("/admin-home", url_encoded_parser, (req, res) => {
  res.redirect("/admin-home");
  //============================ KAFKA PRODUCER =====================================
  var login_request = {
    name: req.body.username,
    password: req.body.password,
    timestamp: Date.now(),
    status: true,
  };
  admin.createTopics({
    timeout: 5000,
    topics: [
      {
        topic: "login-message",
        numPartitions: 1,
        replicationFactor: 1,
      },
    ],
  });
  console.log("================================ TOPIC IS CREATED! ======================================");

  //send a message after successful registration
  producer.send({
    topic: "login-message",
    messages: [{ key: "acc", value: JSON.stringify(login_request) }],
    timeout: 30000,
  });
  console.log("================================ MESSAGE IS SENT! ======================================");
});

app.post("/update-success", url_encoded_parser, (req, res) => {
  var updateEntry = req.body;
  Account.findOneAndUpdate(
    { id: updateEntry._id },
    {
      $set: {
        username: updateEntry.username,
        email: updateEntry.email,
        password: updateEntry.password,
        phonenum: updateEntry.phonenum,
        usertype: updateEntry.usertype,
      },
    },
    { new: true }
  )
    .then((result) => {
      console.log(result);
      res.redirect("/admin-home");
    })
    .catch((err) => {
      console.log(err);
    });
});

app.post("/admin-delete/:id", url_encoded_parser, (req, res) => {
  var accId = req.params.id;
  Account.findOneAndDelete({ _id: accId })
    .then((result) => {
      console.log(result);
      res.redirect("/admin-home");
    })
    .catch((err) => {
      console.log(err);
    });
});

//in case of page not found, display 404 page
app.use((req, res) => {
  res.status(404).render("404", { root: __dirname });
});

producer.disconnect();
admin.disconnect();
