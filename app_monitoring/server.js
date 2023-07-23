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

const monitoring_results = require("./monitoring_services.js");

// Serve static files from the "views" directory
app.use(express.static(path.join(__dirname, "/views")));
// Read json file coming to the server
app.use(express.json());
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/views/monitoring-view.html"));
});

io.on("connection", (socket) => {
  monitoring_results.then((messages) => {
    socket.emit("emitMessage", messages);
    socket.on("newMessage", () => {
      socket.emit("emitMessage", messages);
      socket.broadcast.emit("emitMessage", messages);
    });
  });
});

//listen to port 3002
const port = 3002;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
