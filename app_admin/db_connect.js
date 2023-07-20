/*
  Author: Allen Dylan Antony
  Date: 16 June 2023
  Functionality: Creating a connection from web app to database (MongoDB)
*/
// const fs = require("fs");
const mongoose = require("mongoose");
const kafka = require("kafka-node");
// require("./kafka-admin.js");
const topic_name = process.env.KAFKA_TOPIC;
console.log(topic_name);
// const clusterName = "account";
// const { MongoClient } = require("mongodb").MongoClient;

// const dbURI = "mongodb//localhost:27017";

/*
var settings = readSettings();
const dbURI = `mongodb+srv://${settings.username}:${settings.password}@account.ojthvyu.mongodb.net/${clusterName}?retryWrites=true&w=majority`; //database URL
const dbName = "account";

//create connection to mongodb
function connectDB() {
  var settings = readSettings();
  const dbURI = `mongodb+srv://${settings.username}:${settings.password}@account.ojthvyu.mongodb.net/${clusterName}?retryWrites=true&w=majority`; //database URL

  mongoose
    .connect(dbURI, { useNewURLParser: true, useUnifiedTopology: true })
    .then((result) => {
      console.log("MongoDB is connected!");
    })
    .catch((err) => {
      console.log(err);
    });
}

function readCollection() {
  MongoClient.connect(dbURI, { useUnifiedTopology: true }, (err, client) => {
    try {
      if (err) {
        console.error("Error connecting to the database", err);
        return;
      }

      const db = client.db(dbName);

      const collection = db.collection("accounts");

      collection.find({}).toArray((err, documents) => {
        if (err) {
          console.error("Error retrieving data from the collection", err);
          return;
        }
      });

      return collection;
    } catch (err) {
    } finally {
      client.close();
    }
  });
}

function readSettings() {
  var JSONSettings = fs.readFileSync("./settings.json");
  return JSON.parse(JSONSettings);
}

module.exports = { connectDB, readCollection };

*/

const servicesRunning = async () => {
  mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  db.on("error", console.error.bind(console, "connection error:"));
  db.once("open", function () {
    console.log("MongoDB is connected");
  });
};

//create kafka client
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
console.log("================================== THIS IS DB_CONNECT ============================================");
const client = new kafka.KafkaClient({ kafkaHost: process.env.KAFKA_BOOTSTRAP_SERVERS, autoConnect: true });
const consumer = new kafka.Consumer(client, [{ topic: topic_name, partition: 1 }], { groupId: "admin-consumer-group", autoCommit: false });
consumer.addTopics([topic_name], (err, added) => {
  console.log("================================== KAFKA TOPIC ADDED ============================================");
  console.log(added);
});

// var topicsToCreate = [
//   {
//     topic: topic_name,
//     partitions: 1,
//     replicationFactor: 1,
//   },
// ];

// client.createTopics(topicsToCreate, (error, result) => {
//   console.log(result);
//   console.log(error);
// });

consumer.on("message", async (message) => {
  console.log(message);
  // var userAccount = await new Account(JSON.parse(message.value));
  // console.log(userAccount);
  // await userAccount.save();
});

consumer.on("error", (err) => {
  console.log(err);
});

setTimeout(servicesRunning, 5000);
