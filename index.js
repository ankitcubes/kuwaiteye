const express = require("express");
const app = express();
// const db = require("./config/db.config.js");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const hee = require("he");
app.use("/uploads", express.static("uploads"));
const port = 4000;
app.get("/", function (req, res) {
  res.send("Welcome to Kuwait Eye APP");
});

const usersRoutes = require("./routes/user.route.js");
app.use("/", usersRoutes);

const adminRoutes = require("./routes/admin.route.js");
app.use("/", adminRoutes);

app.listen(port, function (error) {
  if (error) throw error;
  console.log(`Server created Successfully on port ${port}`);
});
