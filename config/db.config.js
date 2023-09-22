const mysql = require("mysql");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "kuwait_eye",
});

db.connect(function (err) {
  if (err) throw err;
  console.log(" DB Connected!");
});

module.exports = db;