const mysql = require("mysql");

const db = mysql.createConnection({
  host: "sql12.freesqldatabase.com",
  user: "sql12648188",
  password: "GgKE1ekKFe",
  database: "kuwait_eye",
});

db.connect(function (err) {
  if (err) throw err;
  console.log(" DB Connected!");
});

module.exports = db;