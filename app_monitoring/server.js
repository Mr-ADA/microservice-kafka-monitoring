//import all libraries needed for the project
const express = require("express");
const app = express();
const path = require("path");
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");

//define io configuration
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const { receiveMessage } = require("./monitoring_services.js");
const { saveMessage } = require("./monitoring_services.js");
const { processMonitoring } = require("./monitoring_services.js");

// Serve static files from the "views" directory
app.use(express.static(path.join(__dirname, "/views")));
// Read json file coming to the server
app.use(express.json());
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/monitoring-view.html"));
});

//setInterval in order to keep updating the data in real-time manner
setInterval(() => {
  receiveMessage();
  saveMessage();
  var monitoring_result = processMonitoring();
  monitoring_result.then((messages) => {
    io.on("connection", (socket) => {
      try {
        console.log("=============== PRINT OUT MESSAGES ====================");
        console.log(messages);
        //emit event
        socket.emit("emitMessage", messages);
        // socket.on("newMessage", () => {
        //   socket.broadcast.emit("emitMessage", messages);
        // });
      } catch (err) {
        console.log(err);
      }
    });
  });
}, 5000);

//listen to port 3002
const port = 3002;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

/*
TO BE RESOLVED TOMORROW (24.07.2023):

1. AS THE COMMUNICATION WITH CLIENT SIDE HAS BEEN MOVED TO SOCKET.IO, THEREFORE THERE IS NO NEED TO EXPORT MODULES
2. SOCKET.IO CAN BE MOVED TO MONITORING_SERVICES SO AS TO MATCH THE EVENTS WITH INCOMING NEW MESSAGES
3. QUESTION:
    HOW DOES THE SOCKET.IO KNOW THE SERVER THAT IS USED TO COMMUNICATE WITH CLIENT SIDE?
*/
