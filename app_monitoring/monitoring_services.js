//============================= DEVELOPMENT ENVIRONMENT =========================================
const { Kafka } = require("kafkajs");
const express = require("express");
const path = require("path");
const app = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");

//=========================== MONITORING FUNCTIONALITY =========================================

/*
  Monitoring Metrics
  •	Request Number - The number of requests the service is handling per second.
  •	Processing Time - The amount of time each request
        Processing Time = Time of Request Received – Time of Request Sent
  • Response Duration - The amount of time the system respond to a request 
  • Availability - Available, if the microservices respond to the request
                 - Unavailable, if the microservices does not respond to the request
*/

app.use(express.static(path.join(__dirname, "views")));

//============================== KAFKA ENVIRONMENT =========================================
const kafka = new Kafka({
  brokers: ["kafka:9092"],
});

//============================= ADMIN CONFIGURATION =====================================
const admin = kafka.admin();
admin.connect();

//============================= PRODUCER CONFIGURATION =====================================
const producer = kafka.producer({
  transactionTimeout: 30000,
});
producer.connect();

//============================= CONSUMER ADMIN SERVICE CONFIGURATION =====================================
const consumer = kafka.consumer({ groupId: "admin-monitoring-group" });
consumer.connect();
consumer.subscribe({ topics: ["login-message"], fromBeginning: false });

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

//=========================== REQUEST SCHEMA DEFINITION =========================================
const Schema = mongoose.Schema;

const requestSchema = new Schema({
  session_id: {
    type: String,
    required: true,
  },
  service_name: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    required: true,
  },
  request_duration: {
    type: Number,
    required: true,
  },
  request_status: {
    type: Boolean,
    required: true,
  },
});

const Request = mongoose.model("Request", requestSchema);
Request.createCollection()
  .then((collection) => {
    console.log("========================= COLLECTION IS CREATED! ====================================");
  })
  .catch((err) => {
    console.log("==================== ERROR ON COLLECTION CREATION ===============================");
    console.log(err);
  });

//defining incoming_messages to save incoming messages
let incoming_messages = [];

async function checkMicroservicesHealth(microserviceUrls) {
  const serviceAvailability = {};
  for (const [serviceName, serviceUrl] of Object.entries(microserviceUrls)) {
    try {
      const response = await axios.get(`${serviceUrl}/available`);
      if (response.status === 200) {
        console.log(`${serviceName} is available.`);
        serviceAvailability[serviceName] = true;
      } else {
        console.log(`${serviceName} is unavailable.`);
        serviceAvailability[serviceName] = false;
      }
    } catch (error) {
      console.log(`${serviceName} is unavailable. Error: ${error.message}`);
    }
  }
  return serviceAvailability;
}

async function receiveMessage() {
  //============================= CONSUMER ADMIN SERVICE CONFIGURATION =====================================
  //TO BE IMPLEMENTED: create 2 parameters (consumerGroup, messageTopic)

  const topicExists = true;
  // const topicExists = topicAvailability("login-message");
  try {
    if (topicExists) {
      consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          var oneMessage = JSON.parse(message.value);
          incoming_messages.push(oneMessage);
          saveMessage();
        },
      });
    } else {
      console.log("==================== TOPIC DOES NOT EXIST ===============================");
    }
  } catch (err) {
    //log error if exists => for debugging purpose
    console.log(err);
    console.log("==================== ERROR ON RECEIVING MESSAGE ===============================");
  }
}

async function saveMessage() {
  //TO BE IMPLEMENTED: create 1 parameters (serviceName)
  for (const message of incoming_messages) {
    //iterate through each message and keep the metadata
    const request = new Request({
      session_id: message.session_id,
      service_name: "Admin",
      time: Date.now(),
      request_duration: Date.now() - message.timestamp,
      request_status: true,
    });

    try {
      //check the existence of the document
      const documentExists = await checkDocumentAvailability(request);
      console.log("Document exists:", documentExists);

      if (!documentExists) {
        await request.save();
        console.log("Request saved successfully");
      } else {
        console.log("Request already exists in the database");
      }
    } catch (error) {
      console.log("Error checking document availability:", error);
    }
  }
}

async function checkDocumentAvailability(value) {
  //checking the existence of the current incoming request by its session ID
  try {
    //message is available
    const message = await Request.find({ session_id: value.session_id }).exec();
    return message.length > 0;
  } catch (err) {
    //message is not available
    console.log("error checking document availability:", error);
    return false;
  }
}

//aggregate result of the MongoDB document
async function processMonitoring() {
  try {
    var monitoring_result = await Request.aggregate([
      {
        //_id:-1 => sort the result backwards
        $sort: { _id: -1 },
      },
      // Group by "service_name" and get the required data
      {
        $group: {
          _id: "$service_name",
          total_request: { $count: {} },
          avgDuration: { $avg: "$request_duration" },
          // Use $first to get the latest inserted "request_status"
          latest_request_status: { $first: "$request_status" },
        },
      },
    ]).exec();
    return monitoring_result;
  } catch (err) {
    console.log(err);
    console.log("==================== ERROR ON PROCESS MONITORING ===============================");
  }
}

module.exports = {
  receiveMessage,
  saveMessage,
  processMonitoring,
  checkMicroservicesHealth,
};
