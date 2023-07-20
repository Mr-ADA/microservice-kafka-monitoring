// 1. Create a function to fetch the monitoring data from kafka
function consumeMessage() {
  console.log("============================= MONITORING DISPLAY ========================================");
  //============================== KAFKA ENVIRONMENT =========================================
  const kafka = require("kafkajs");
  const kafka = new Kafka({
    brokers: ["kafka:9092"],
  });
  console.log("this is monitoring-view");
  //============================= CONSUMER CONFIGURATION =====================================
  const consumer = kafka.consumer({ groupId: "monitoring-display" });
  consumer.connect();
  consumer.subscribe({ topic: "monitoring-topic", fromBeginning: true });
  //============================= CONSUME MESSAGES =====================================
  consumer.run({
    eachMessage: ({ topic, partitions, messages }) => {
      console.log("============================= CONSUMER RUNNING ========================================");
      console.log(messages);
      let monitor = JSON.parse(messages.value);
      if (monitor != null) {
        console.log("============================= MESSAGE RETRIEVED ========================================");
        displayMonitoring(monitor);
      } else {
        console.log("============================= NO MESSAGE ========================================");
      }
    },
  });
}

// 2. Display data to UI
function displayMonitoring(monitoringMetrics) {
  // Get the table body element
  const tableBody = document.querySelector("#monitorTable tbody");
  //define loggedInUser, get from session
  companyRegNo = loggedInUser.company.companyRegistrationNo;
  companyEmployee = companyAdminList.filter((employee) => employee.companyRegistrationNo === companyRegNo);
  tableBody.innerHTML = "";
  // Iterate over the employee data and create table rows
  const row = document.createElement("tr");
  // Create table cells and populate them with data

  //monitoring service name
  const serviceNameCell = document.createElement("td");
  serviceNameCell.textContent = monitoringMetrics.id;
  row.appendChild(serviceNameCell);

  //monitoring request rate
  const requestRateCell = document.createElement("td");
  requestRateCell.textContent = monitoringMetrics.num_of_request;
  row.appendChild(requestRateCell);

  //monitoring average request duration
  const averageRequestDurationCell = document.createElement("td");
  averageRequestDurationCell.textContent = monitoringMetrics.average_duration;
  row.appendChild(averageRequestDurationCell);

  //monitoring error rate
  const errorRateCell = document.createElement("td");
  errorRateCell.textContent = 0;
  row.appendChild(errorRateCell);

  //monitoring service status
  const serviceStatusCell = document.createElement("td");
  serviceStatusCell.textContent = monitoringMetrics.status ? "Available" : "Unavailable";
  row.appendChild(serviceStatusCell);

  // Append the row to the table body
  tableBody.appendChild(row);
}

consumeMessage();
// fetch("/companyAdmin")
//   .then((response) => response.json())
//   .then((companyAdminList) => {
//     // Get the table body element
//     const tableBody = document.querySelector("#monitorTable tbody");
//     //define loggedInUser, get from session
//     companyRegNo = loggedInUser.company.companyRegistrationNo;
//     companyEmployee = companyAdminList.filter((employee) => employee.companyRegistrationNo === companyRegNo);
//     tableBody.innerHTML = "";
//     // Iterate over the employee data and create table rows
//     companyEmployee.forEach((employee) => {
//       const row = document.createElement("tr");
//       // Create table cells and populate them with data

//       //monitoring service name
//       const EmployeeIdCell = document.createElement("td");
//       EmployeeIdCell.textContent = employee.employeeId;
//       row.appendChild(EmployeeIdCell);

//       //monitoring request rate
//       const employeeNameCell = document.createElement("td");
//       employeeNameCell.textContent = employee.employeeName;
//       employeeNameCell.addEventListener("click", (event) => {
//         companyAdminHandleInlineEdit(event, employee.employeeId, "employeeName");
//       });
//       row.appendChild(employeeNameCell);

//       //monitoring average request duration
//       const employeeEmailCell = document.createElement("td");
//       employeeEmailCell.textContent = employee.employeeEmail;
//       employeeEmailCell.addEventListener("click", (event) => {
//         companyAdminHandleInlineEdit(event, employee.employeeId, "employeeEmail");
//       });
//       row.appendChild(employeeEmailCell);

//       //monitoring error rate
//       const employeePhoneCell = document.createElement("td");
//       employeePhoneCell.textContent = employee.employeePhoneNo;
//       employeePhoneCell.addEventListener("click", (event) => {
//         companyAdminHandleInlineEdit(event, employee.employeeId, "employeePhoneNo");
//       });
//       row.appendChild(employeePhoneCell);

//       //monitoring service availability
//       const employeeAddressCell = document.createElement("td");
//       employeeAddressCell.textContent = employee.employeeAddress;
//       employeeAddressCell.addEventListener("click", (event) => {
//         companyAdminHandleInlineEdit(event, employee.employeeId, "employeeAddress");
//       });
//       row.appendChild(employeeAddressCell);

//       // Append the row to the table body
//       tableBody.appendChild(row);
//     });
//   })
//   .catch((error) => {
//     console.error("Failed to fetch employee data:", error);
//   });
