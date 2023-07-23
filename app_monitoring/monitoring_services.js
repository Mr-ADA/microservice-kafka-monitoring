//============================= DEVELOPMENT ENVIRONMENT =========================================
const { Kafka } = require("kafkajs");
const express = require("express");
const path = require("path");
const app = express.Router();
const mongoose = require("mongoose");

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
consumer.subscribe({ topics: ["login-message", "admin-availability"], fromBeginning: true });

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

//=========================== MONITORING FUNCTIONALITY =========================================

/*
  Monitoring Metrics
  •	Rate - The number of requests the service is handling per second.
        Rate = Total number of request / time frame (1 second)
  •	Processing Time - The amount of time each request
        Processing Time = Time of Request Received – Time of Request Sent
  • Response Duration - The amount of time the system respond to a request 
  • Availability - Available, if the microservices respond to the request
                 - Unavailable, if the microservices does not respond to the request
*/

//check topic availability on apache kafka
async function topicAvailability(topic_name) {
  //check topic availibility
  try {
    const metadata = admin.fetchTopicMetadata({ topics: [topic_name] });
    return metadata.topics.length > 0;
  } catch (err) {
    //log error if exists => for debugging purpose
    console.log("==================== ERROR ON TOPIC AVAILABILITY CHECKER ===============================");
    console.error("Error occured: ", err);
    return false;
  }
}

let availabilityMessage = [];
//check service availability
async function serviceAvailability(topic) {
  //check if topic is created by the service / available
  const topicExists = topicAvailability("admin-availability");
  try {
    if (topicExists) {
      //check if message coming in from the producer(microservices)
      consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          availabilityMessage.push(JSON.parse(message));
        },
      });
    } else {
      console.log("Topic does not exist yet");
    }
  } catch (err) {
    //log error if exists => for debugging purpose
    console.log(err);
    console.log("==================== ERROR ON SERVICE AVAILABILITY CHECKER ===============================");
  }

  console.log(availabilityMessage);
  return availabilityMessage.length > 0 ? true : false;
}

async function receiveMessage() {
  //check if topic available
  const topicExists = topicAvailability("login-message");
  try {
    if (topicExists) {
      consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          //if topic available, define object based on the incoming message
          var request = new Request({
            service_name: "Admin Service",
            time: Date.now(),
            request_duration: Date.now() - message.timestamp,
            request_status: serviceAvailability(),
          });
          //save the message to MongoDB for history record purpose
          request
            .save()
            .then()
            .catch((err) => {
              console.log(err);
            });
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

//aggregate result of the MongoDB document
async function processMonitoring() {
  try {
    const result_aggregate = await Request.aggregate([
      {
        $group: {
          _id: "$service_name",
          total_request: { $count: {} },
          avgDuration: { $avg: "$request_duration" },
          request_status: { $addToSet: "$request_status" },
        },
      },
    ]).exec();

    return result_aggregate;
  } catch (err) {
    console.log(err);
    console.log("==================== ERROR ON PROCESS MONITORING ===============================");
  }
}

if (serviceAvailability()) {
  receiveMessage();
} else {
  console.log("================================== SERVICE UNAVAILABLE =====================================");
}

//disconnect kafka client after the program is finished
admin.disconnect();
producer.disconnect();
consumer.disconnect();
module.exports = processMonitoring();
