async function reportToMonitoring(admin, producer) {
  await admin.createTopics({
    timeout: 5000,
    topics: [
      {
        topic: "admin-availability",
        numPartitions: 1,
        replicationFactor: 1,
      },
    ],
  });
  console.log("================================ TOPIC IS CREATED! ======================================");
  var availability_report = {
    service_name: "admin",
    content: "Available",
    timestamp: Date.now(),
  };
  //send a message after successful registration
  await producer.send({
    topic: "admin-availability",
    messages: [{ key: "status", value: JSON.stringify(availability_report) }],
    timeout: 30000,
  });
  console.log("================================ STATUS AVAILIBILITY IS SENT! ======================================");
}

module.exports = { reportToMonitoring };
