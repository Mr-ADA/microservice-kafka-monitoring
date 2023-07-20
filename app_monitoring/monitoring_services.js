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

//============================= CONSUMER CONFIGURATION =====================================
const consumer = kafka.consumer({ groupId: "monitoring-group" });
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
//=========================== MONITORING METRICS =========================================

/*
  Metrics
  •	Rate - The number of requests the service is handling per second.
        Rate = Total number of request / time frame (1 second)
  •	Request Duration - The amount of time each request takes.
        Duration = Time of Request Received – Time of Request Sent
  • Availability - Available, if the microservices respond to the request
                 - Inavailable, if the microservices does not respond to the request
  • Error Rate - Number of failed request per second
*/
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
    console.log(collection);
  })
  .catch((err) => {
    console.log(err);
  });

//=========================== MONITORING FUNCTIONALITY =========================================
async function topicAvailability(topic_name) {
  //check topic availibility
  try {
    const metadata = admin.fetchTopicMetadata({ topics: [topic_name] });
    return metadata.topics.length > 0;
  } catch (err) {
    console.error("Error occured: ", err);
    return false;
  }
}

let receivedMessage = [];
async function serviceAvailability() {
  const topicExists = topicAvailability("admin-availability");
  try {
    if (topicExists) {
      consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          console.log("==================== ADMIN SERVICE IS AVAILABLE ===============================");
          console.log(JSON.parse(message));
          receivedMessage.push(JSON.parse(message));
        },
      });
    } else {
      console.log("Topic does not exist yet");
    }
  } catch (err) {
    console.log(err);
    console.log("==================== ERROR OCCURED ===============================");
  }
  return receivedMessage.length > 0 ? true : false;
}

async function receiveMessage() {
  const topicExists = topicAvailability("login-message");
  console.log(topicExists);
  try {
    if (topicExists) {
      consumer.run({
        eachMessage: ({ topic, partition, message }) => {
          var request = new Request({
            service_name: "Admin Service",
            time: Date.now(),
            request_duration: Date.now() - message.timestamp,
            request_status: serviceAvailability(),
          });
          // console.log(request);
          request
            .save()
            .then()
            .catch((err) => {
              console.log(err);
            });
        },
      });
    } else {
      console.log("Topic does not exist yet");
    }
  } catch (err) {
    console.log(err);
    console.log("==================== ERROR OCCURED ===============================");
  }
}

async function processMonitoring() {
  try {
    var result_aggregate = await Request.aggregate([
      {
        $group: {
          _id: "$service_name",
          total_request: { $count: {} },
          avgDuration: { $avg: "$request_duration" },
        },
      },
      {
        $addFields: {
          status: "$request_status",
        },
      },
    ]).exec();
    return result_aggregate;
  } catch (err) {
    console.log(err);
    console.log("==================== ERROR OCCURED ===============================");
  }
}

if (serviceAvailability()) {
  receiveMessage(), 1000;
} else {
  console.log("================================== SERVICE UNAVAILABLE =====================================");
}

admin.disconnect();
producer.disconnect();
consumer.disconnect();
module.exports = processMonitoring();
