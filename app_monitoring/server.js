const express = require("express");
const app = express();
const path = require("path");
const monitoring_results = require("./monitoring_services.js");
const ejs = require("ejs");

//set view engine for the project => dynamic content
app.set("view engine", "ejs");

// Serve static files from the "views" directory
app.use(express.static(path.join(__dirname, "views")));

app.use(express.json());
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

//listen to port 3002

app.listen(3002, () => {
  console.log("listening to port 3002");
});

app.get("/", (req, res) => {
  monitoring_results.then((message) => {
    // message["status"] = monitoring_results.serviceAvailability();
    console.log(message);
    console.log("==================== RENDER VIEW ===============================");
    res.render("monitoring-view.ejs", { message });
  });
});

// consumer.disconnect();
