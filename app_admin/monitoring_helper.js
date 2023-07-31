function reportToMonitoring() {
  //send message if the service has started, if not started, no message will be sent
  var availability_message = {
    service_name: "Admin",
    condition: "Available",
    timestamp: Date.now(),
  };
  //send a message after successful registration
  // producer.send({
  //   topic: "service-availability",
  //   messages: [{ key: "status", value: JSON.stringify(availability_message) }],
  //   timeout: 30000,
  // });
  console.log("================================ STATUS AVAILIBILITY IS SENT! ======================================");
  return availability_message;
}

async function sendHealthCheckMessage(kafka) {
  const producer = kafka.producer({
    transactionTimeout: 30000,
  });
  producer.connect();

  const serviceName = "Admin"; // Replace with the name of the microservice
  const isHealthy = true; // Replace with the actual health status of the microservice
  const timestamp = Date.now();

  const healthCheckMessage = {
    serviceName,
    isHealthy,
    timestamp,
  };

  producer
    .send({
      topic: "service-availability",
      messages: [{ value: JSON.stringify(healthCheckMessage) }],
    })
    .then(() => {
      console.log(`Health check message sent for ${healthCheckMessage.serviceName}`);
    })
    .catch((error) => {
      console.error(`Error sending health check message for ${healthCheckMessage.serviceName}:`, error);
    });

  producer.disconnect();
}

module.exports = { sendHealthCheckMessage };
