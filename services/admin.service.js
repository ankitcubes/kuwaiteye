const db = require("../config/db.config.js");
const adminService = require("../services/admin.service.js");
const usersService = require("../services/user.service.js");
const md5 = require("md5");
const sendPush = require("../services/push.service.js");
const fs = require("fs");
const moment = require("moment");
const each = require("async-each-series");
const async = require("async");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { body } = require("express-validator");

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

exports.login = (req, result) => {
  var body = {};
  var email_id = req.body.email_id;
  var password = md5(req.body.password);
  db.query(
    "SELECT * FROM tbl_users WHERE email_id = ? AND password = ? AND user_role = 1",
    [email_id, password],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length == 0) {
          body.Status = 0;
          body.Message = "Email and password does not match our records.";
          result(null, body);
          return;
        } else {
          var data = res[0];
          var token_data = {
            device_token: req.body.device_token,
            device_type: req.body.device_type,
            device_id: req.body.device_id,
            user_id: data.user_id,
          };

          const sign = {
            sub: data.user_id, // Identifies the subject of the JWT.
          };
          usersService.manage_token(token_data, (err, data2) => {
            if (err) {
              result(err, null);
              return;
            } else {
              body.Status = 1;
              body.Message = "Login successful.";
              body.UserToken = jwt.sign(sign, "dont_be_oversmart");
              body.info = data2[0];
              result(null, body);
              return;
            }
          });
        }
      }
    }
  );
};

exports.add_country = (req, result) => {
  var body = {};
  db.query("INSERT INTO tbl_country SET ?", [req.body], (err, res) => {
    if (err) {
      console.log("error", err);
      result(err, null);
      return;
    } else {
      body.Status = 1;
      body.Message = "Country added successfully";
      result(null, body);
      return;
    }
  });
};

exports.add_category = (req, result) => {
  var body = {};
  db.query("INSERT INTO tbl_category SET ?", [req.body], (err, res) => {
    if (err) {
      console.log("error", err);
      result(err, null);
      return;
    } else {
      body.Status = 1;
      body.Message = "Category added successfully";
      result(null, body);
      return;
    }
  });
};

exports.add_sub_category = (req, result) => {
  var body = {};
  if (req.files != undefined) {
    if (req.files.category_image) {
      var ext = req.files.category_image[0].originalname.split(".").pop();
      ImageUrl_media = req.files.category_image[0].filename;
      ImageUrl_with__ext = req.files.category_image[0].filename + "." + ext;

      fs.renameSync(
        "uploads/images/" + ImageUrl_media,
        "uploads/images/" + ImageUrl_with__ext
      );
      var new_path = "uploads/images/" + ImageUrl_with__ext;
      req.body.category_image = new_path;
    }
  }
  db.query("INSERT INTO tbl_category SET ?", [req.body], (err, res) => {
    if (err) {
      console.log("error", err);
      result(err, null);
      return;
    } else {
      body.Status = 1;
      body.Message = "SubCategory added successfully";
      result(null, body);
      return;
    }
  });
};

exports.get_category = (req, result) => {
  var body = {};
  db.query(
    "SELECT t1.* FROM tbl_category t1 WHERE t1.parent_id = 0",
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        body.Status = 1;
        body.Message = "Category get successfully";
        body.info = res;
        result(null, body);
        return;
      }
    }
  );
};

exports.get_sub_category = (req, result) => {
  var body = {};
  var WHERE = "";
  if (req.body.parent_id) {
    WHERE = " AND t1.parent_id = " + req.body.parent_id + "";
  }
  db.query(
    "SELECT t1.*,t2.category_name\n\
   FROM tbl_category t1\n\
   LEFT JOIN tbl_category t2 ON t1.parent_id = t2.category_id\n\
    WHERE t1.parent_id != 0 " + WHERE,
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        body.Status = 1;
        body.Message = "Category get successfully";
        body.info = res;
        result(null, body);
        return;
      }
    }
  );
};

exports.add_event = (req, result) => {
  var body = {};
  if (req.body.type == 1) {
    req.body.category_id = req.body.category_id;
  }
  req.body.user_id = req.user.user_id;
  db.query("INSERT INTO tbl_event SET ?", [req.body], (err, res) => {
    if (err) {
      console.log("error", err);
      result(err, null);
      return;
    } else {
      if (req.files != undefined) {
        if (req.files.image) {
          req.files["image"].forEach((image, index) => {
            var ext = image.originalname.split(".").pop();
            var ImageUrl_media = image.filename;
            var ImageUrl_with__ext = image.filename + "." + ext;
            fs.renameSync(
              "uploads/images/" + ImageUrl_media,
              "uploads/images/" + ImageUrl_with__ext
            );
            var Image = "uploads/images/" + ImageUrl_with__ext;
            db.query(
              "INSERT INTO tbl_event_image(event_id,image) VALUES(?,?)",
              [res.insertId, Image],
              (err, res) => {
                if (err) {
                  console.log("error", err);
                }
              }
            );
          });
        }
      }
      body.Status = 1;
      body.Message = "Event added successfully";
      result(null, body);
      return;
    }
  });
};

exports.edit_event = (req, result) => {
  var body = {};
  function updateEventData(data) {
    db.query(
      "UPDATE tbl_event SET ? WHERE event_id = ?",
      [data, data.event_id],
      (err, res) => {
        if (err) {
          console.log("error", err);
          result(err, null);
          return;
        } else {
          db.query(
            "SELECT t1.*,t2.category_name\n\
             FROM tbl_event t1\n\
             LEFT JOIN tbl_category t2 ON t1.category_id = t2.category_id \n\
             WHERE t1.event_id = ?",
            [data.event_id],
            (err, res1) => {
              if (err) {
                console.log("error", err);
                result(err, null);
                return;
              } else {
                db.query(
                  "SELECT * FROM tbl_event_image WHERE event_id = ?",
                  [req.body.event_id],
                  (err, res2) => {
                    if (err) {
                      console.log("error", err);
                      result(err, null);
                      return;
                    } else {
                      res1[0]["image"] = res2;
                      if (res1.length <= 0) {
                        body.Status = 1;
                        body.Message = "Event Not Found";
                        body.info = {};
                        return result(null, body);
                      } else {
                        body.Status = 1;
                        body.Message = "Event edited successfully";
                        body.info = res1[0];
                        return result(null, body);
                      }
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  }

  var event_data = {};
  event_data.event_id = req.body.event_id;
  event_data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
  if (req.body.title) {
    event_data.title = req.body.title;
  }
  if (req.body.location) {
    event_data.location = req.body.location;
  }
  if (req.body.latitude) {
    event_data.latitude = req.body.latitude;
  }
  if (req.body.longitude) {
    event_data.longitude = req.body.longitude;
  }
  if (req.files != undefined) {
    if (req.files.image) {
      if (req.files.image) {
        req.files["image"].forEach((image, index) => {
          var ext = image.originalname.split(".").pop();
          var ImageUrl_media = image.filename;
          var ImageUrl_with__ext = image.filename + "." + ext;
          fs.renameSync(
            "uploads/images/" + ImageUrl_media,
            "uploads/images/" + ImageUrl_with__ext
          );
          var Image = "uploads/images/" + ImageUrl_with__ext;
          db.query(
            "INSERT INTO tbl_event_image(event_id,image) VALUES(?,?)",
            [req.body.event_id, Image],
            (err, res) => {
              if (err) {
                console.log("error", err);
              }
            }
          );
        });
      }
    }
  }
  updateEventData(event_data);
};

exports.list_event = (req, result) => {
  var body = {};
  const limit = 10;
  const page_no = req.body.page_no;
  const offset = (page_no - 1) * limit;
  db.query(
    "SELECT t1.*,t2.category_name,\n\
    (SELECT COUNT(*) FROM tbl_event t1 WHERE t1.type = ?)as total_data\n\
FROM tbl_event t1\n\
LEFT JOIN tbl_category t2 ON t1.category_id = t2.category_id \n\
WHERE t1.type = ? ORDER BY t1.event_id DESC LIMIT " +
      limit +
      " OFFSET " +
      offset,
    [req.body.type],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Status = 1;
          body.Message = "No data found";
          body.total_page = 0;
          body.info = res;
          return result(null, body);
        } else {
          res.forEach((e, i) => {
            db.query(
              "SELECT * FROM tbl_event_image WHERE event_id = ?",
              [e.event_id],
              (err, res1) => {
                if (err) {
                  console.log("error", err);
                  result(err, null);
                  return;
                } else {
                  res[i]["image"] = res1;
                  if (res.length - 1 == i) {
                    body.Status = 1;
                    body.Message = "Event get successfully";
                    body.total_page = Math.ceil(res[0].token_data / limit);
                    body.info = res;
                    return result(null, body);
                  }
                }
              }
            );
          });
        }
      }
    }
  );
};

exports.delete_event = (req, result) => {
  var body = {};
  db.query(
    "DELETE FROM tbl_event WHERE event_id = ?",
    [req.body.event_id],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        db.query(
          "SELECT image FROM tbl_event_image WHERE event_id = ?",
          [req.body.event_id],
          (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              if (res1.length >= 1) {
                res1.forEach((e, i) => {
                  try {
                    fs.unlinkSync(e.image);
                  } catch (e) {
                    console.log("No image found");
                  }
                });
              }
              db.query(
                "DELETE FROM tbl_event_image WHERE event_id = ?",
                [req.body.event_id],
                (err, res2) => {
                  if (err) {
                    console.log("error", err);
                    result(err, null);
                    return;
                  } else {
                    body.Status = 1;
                    body.Message = "Event deleted successfully";
                    result(null, body);
                    return;
                  }
                }
              );
            }
          }
        );
      }
    }
  );
};

exports.search_event = (req, result) => {
  var body = {};
  db.query(
    "SELECT t1.*,t2.category_name\n\
FROM tbl_event t1\n\
LEFT JOIN tbl_category t2 ON t1.category_id = t2.category_id \n\
WHERE t1.type = ? AND t1.title LIKE '%" +
      req.body.search_text +
      "%' ORDER BY t1.event_id DESC",
    [req.body.type],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Status = 1;
          body.Message = "No data found";
          body.info = res;
          return result(null, body);
        } else {
          res.forEach((e, i) => {
            db.query(
              "SELECT * FROM tbl_event_image WHERE event_id = ?",
              [e.event_id],
              (err, res1) => {
                if (err) {
                  console.log("error", err);
                  result(err, null);
                  return;
                } else {
                  res[i]["image"] = res1;
                  if (res.length - 1 == i) {
                    body.Status = 1;
                    body.Message = "Event searched successfully";
                    body.info = res;
                    return result(null, body);
                  }
                }
              }
            );
          });
        }
      }
    }
  );
};
