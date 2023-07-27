//import all libraries needed for the project
//============================ DEVELOPMENT CONFIGURATION ======================================
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

//==================== GET FUNCTIONS FROM MONITORING_SERVICES.JS =================================
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

//========================== SETUP WEBSOCKET (socket.io) FOR REAL-TIME DISPLAY =================================
io.on("connection", (socket) => {
  /*
  make sure to write codes inside the io.on("connection") block in order to maintain the connection 
  to be established
  */
  setInterval(() => {
    receiveMessage();
    saveMessage();
    var monitoring_result = processMonitoring();
    monitoring_result.then((messages) => {
      messages.forEach((message) => {
        try {
          socket.emit("emitMessage", message);
          console.log("=============== PRINT OUT MESSAGES ====================");
          console.log(message);
        } catch (err) {
          console.log(err);
        }
      });
    });
  }, 1000);
});

//listen to port 3002
const port = 3002;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
