const db = require("../config/db.config.js");
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
const hee = require("he");

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

function makeotp(length) {
  var result = "";
  var characters = "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

exports.findExits = (baseTable, baseIArr, result) => {
  db.query(
    "SELECT * FROM " + baseTable + " WHERE " + baseIArr + " limit 1 ",
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }

      if (res.length > 0) {
        result(null, true);
      } else {
        result(null, false);
      }
    }
  );
};

exports.findByUserId = (user_id, result) => {
  db.query(
    "select * from tbl_token t1 join tbl_users t2 on t1.user_id = t2.user_id where t1.user_id = ? ",
    [user_id],
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      }

      if (res.length) {
        res[0].isData = 1;
        result(null, res[0]);
        return;
      }
      // not found Subject with the id
      result(null, { isData: 0 });
    }
  );
};

exports.findByMail = (email, result) => {
  db.query(
    "select * from tbl_users where email_id = ?",
    [email],
    function (err, res) {
      if (err) {
        console.log("error: ", err);
        result(err, null);
      } else {
        result(null, res[0]);
      }
    }
  );
};

exports.checkEmailOtp = (user_id, email_otp, result) => {
  db.query(
    "update tbl_users set is_email_verified = 1, temp_pass = null where user_id = ? and temp_pass = ?",
    [user_id, email_otp],
    function (err, res) {
      if (err) {
        console.log("error: ", err);
        result(err, null);
      } else {
        result(null, res.changedRows);
      }
    }
  );
};

exports.manage_token = (token_data, result) => {
  var baseIArr =
    '`device_id` = "' +
    token_data.device_id +
    '" and `user_id` = "' +
    token_data.user_id +
    '"';
  usersService.findExits("tbl_token", baseIArr, (err, data) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    } else {
      if (data) {
        db.query(
          "UPDATE tbl_token SET device_token = ? WHERE device_id = ? and user_id = ?",
          [token_data.device_token, token_data.device_id, token_data.user_id],
          (err, res) => {
            if (err) {
              console.log("error: ", err);
              result(err, null);
              return;
            } else {
              db.query(
                "select * from tbl_token t1 join tbl_users t2 on t1.user_id = t2.user_id where t1.user_id = ? ",
                [token_data.user_id],
                (err, res5) => {
                  if (err) {
                    console.log("error: ", err);
                    result(err, null);
                    return;
                  } else {
                    result(null, res5);
                    return;
                  }
                }
              );
            }
          }
        );
      } else {
        db.query("INSERT INTO tbl_token SET ?", [token_data], (err, res2) => {
          if (err) {
            console.log("error: ", err);
            result(err, null);
            return;
          } else {
            db.query(
              "select * from tbl_token t1 join tbl_users t2 on t1.user_id = t2.user_id where t1.user_id = ? ",
              [token_data.user_id],
              (err, res5) => {
                if (err) {
                  console.log("error: ", err);
                  result(err, null);
                  return;
                } else {
                  result(null, res5);
                  return;
                }
              }
            );
          }
        });
      }
    }
  });
};

exports.sign_up = (req, result) => {
  var body = {};
  usersService.findByMail(req.body.email_id, (err, res2) => {
    if (err) {
      console.log(err);
    } else {
      if (res2) {
        body.Status = 0;
        body.Message =
          "An account already exists with your email. Please login below.";
        result(null, body);
      } else {
        var temp_pass = makeotp(4);
        var transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "cubes.dev14@gmail.com",
            pass: "fwirjdjbvaufppqc",
          },
        });

        var mailOptions = {
          from: "cubes.dev14@gmail.com",
          to: req.body.email_id,
          subject: "Verification For KuwaitEye",
          text: "Your One Time Password For KuwaitEye Is " + temp_pass,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            body.Status = 0;
            body.info = error;
            body.Message = "Email id is not Valid";
            result(null, body);
          } else {
            var user_data = {
              temp_pass: temp_pass,
              first_name: req.body.first_name,
              last_name: req.body.last_name,
              country_id: req.body.country_id,
              email_id: req.body.email_id,
              password: md5(req.body.password),
            };
            db.query("INSERT INTO tbl_users SET ?", user_data, (err, res) => {
              if (err) {
                console.log("error: ", err);
                result(err, null);
                return;
              } else {
                var token_data = {
                  device_token: req.body.device_token,
                  device_type: req.body.device_type,
                  device_id: req.body.device_id,
                  user_id: res.insertId,
                };

                const sign = {
                  sub: res.insertId, // Identifies the subject of the JWT.
                };
                usersService.manage_token(token_data, (err, res2) => {
                  if (err) {
                    res.send(err);
                  } else {
                    body.Status = 1;
                    body.Message = "OTP sent to your verification email";
                    body.temp_pass = temp_pass;
                    body.UserToken = jwt.sign(sign, "dont_be_oversmart");
                    result(null, body);
                  }
                });
              }
            });
          }
        });
      }
    }
  });
};

exports.login = (req, result) => {
  var body = {};
  var email_id = req.body.email_id;
  var password = md5(req.body.password);
  db.query(
    "SELECT * FROM tbl_users WHERE email_id = ? AND password = ? AND user_role = 0",
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
          if (data.is_block == 1) {
            body.Status = 0;
            body.Message =
              "An account blocked with your email. Please contact to admin.";
            result(null, body);
            return;
          } else if (data.is_delete == 1) {
            body.Status = 0;
            body.Message =
              "An account deleted with your email. Please contact to admin.";
            result(null, body);
            return;
          } else {
            var token_data = {
              device_token: req.body.device_token,
              device_type: req.body.device_type,
              device_id: req.body.device_id,
              user_id: data.user_id,
            };

            const sign = {
              sub: data.user_id, // Identifies the subject of the JWT.
            };
            if (data.is_email_verified == 1) {
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
            } else {
              body.Status = 2;
              body.Message = "Please first verify email";
              body.UserToken = jwt.sign(sign, "dont_be_oversmart");
              result(null, body);
              return;
            }
          }
        }
      }
    }
  );
};

exports.login_by_thirdparty = (req, result) => {
  var user_data = {};
  const sign = {};
  var body = {};
  db.query(
    "Select * from tbl_users where thirdparty_id = ?",
    req.body.thirdparty_id,
    (err, data) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      } else {
        var token_data = {
          device_token: req.body.device_token,
          device_type: req.body.device_type,
          device_id: req.body.device_id,
        };
        user_data.thirdparty_id = req.body.thirdparty_id;
        if (req.body.first_name) {
          user_data.first_name = req.body.first_name;
        }
        if (req.body.country_id) {
          user_data.country_id = req.body.country_id;
        }
        if (req.body.last_name) {
          user_data.last_name = req.body.last_name;
        }
        if (req.body.email_id) {
          user_data.email_id = req.body.email_id;
        }
        if (req.body.login_type) {
          user_data.login_type = req.body.login_type;
        }
        user_data.is_email_verified = 1;
        if (data.length <= 0) {
          console.log("sign up");
          usersService.findByMail(user_data.email_id, (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              if (res1) {
                body.Status = 0;
                body.Message =
                  "An account already exists with your email. Please login below.";
                result(null, body);
                return;
              } else {
                db.query(
                  "INSERT INTO tbl_users SET ?",
                  [user_data],
                  (err, res3) => {
                    if (err) {
                      console.log("error", err);
                      result(err, null);
                      return;
                    } else {
                      token_data.user_id = res3.insertId;
                      sign.sub = res3.insertId;
                      usersService.manage_token(token_data, (err, res4) => {
                        if (err) {
                          console.log("error", err);
                          result(err, null);
                          return;
                        } else {
                          body.Status = 1;
                          body.Message = "Registration successfull";
                          body.info = res4[0];
                          body.UserToken = jwt.sign(sign, "dont_be_oversmart");
                          result(null, body);
                          return;
                        }
                      });
                    }
                  }
                );
              }
            }
          });
        } else {
          if (data[0].is_block == 1) {
            body.Status = 0;
            body.Message =
              "An account blocked with your email. Please contact to admin.";
            result(null, body);
            return;
          } else if (data[0].is_delete == 1) {
            body.Status = 0;
            body.Message =
              "An account deleted with your email. Please contact to admin.";
            result(null, body);
            return;
          } else if (data[0].login_type != req.body.login_type) {
            body.Status = 0;
            body.Message = "You are login with another login method";
            result(null, body);
            return;
          } else if (req.body.email_id) {
            if (
              data[0].email_id != null &&
              data[0].email_id != req.body.email_id
            ) {
              body.Status = 0;
              body.Message = "Please entre valid email";
              result(null, body);
              return;
            }
          } else {
            db.query(
              "UPDATE tbl_users SET ? WHERE user_id = ?",
              [user_data, data[0].user_id],
              (err, res1) => {
                if (err) {
                  console.log("error", err);
                  result(err, null);
                  return;
                } else {
                  token_data.user_id = data[0].user_id;
                  sign.sub = data[0].user_id;
                  usersService.manage_token(token_data, (err, res2) => {
                    if (err) {
                      console.log("error", err);
                      result(err, null);
                      return;
                    } else {
                      body.Status = 1;
                      body.Message = "Login successfull";
                      body.info = res2[0];
                      body.UserToken = jwt.sign(sign, "dont_be_oversmart");
                      result(null, body);
                      return;
                    }
                  });
                }
              }
            );
          }
        }
      }
    }
  );
};

exports.verification_for_email = (req, result) => {
  var body = {};
  usersService.findByMail(req.body.email_id, (err, res1) => {
    if (err) {
      console.log("error: ", err);
      result(err, null);
      return;
    } else {
      if (res1 != null) {
        var user_id = res1.user_id;
        var temp_pass = req.body.email_otp;
        usersService.checkEmailOtp(user_id, temp_pass, (err, res2) => {
          if (res2 == 1) {
            usersService.findByUserId(user_id, (err, res3) => {
              if (res3 != undefined) {
                const sign = {
                  sub: user_id,
                };
                body.Status = 1;
                body.Message =
                  req.body.is_login == 0
                    ? "Registration successful"
                    : req.body.is_login == 1
                    ? "Login successful"
                    : "Email verification successfully done";
                if (req.body.is_login == 0 || req.body.is_login == 1) {
                  body.UserToken = jwt.sign(sign, "dont_be_oversmart");
                  body.info = res3;
                }
                return result(null, body);
              }
            });
          } else {
            (body.Status = 0),
              (body.Message = "Wrong email OTP"),
              (body.info = {}),
              result(null, body);
            return;
          }
        });
      } else {
        (body.Status = 0),
          (body.Message = "Email id Does not match over records"),
          result(null, body);
        return;
      }
    }
  });
};

exports.forgot_password = (req, result) => {
  var body = {};
  usersService.findByMail(req.body.email_id, (err, res) => {
    if (err) {
      console.log("error", err);
      result(err, null);
      return;
    } else {
      if (res) {
        var temp_pass = makeotp(4);
        var transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "cubes.dev14@gmail.com",
            pass: "fwirjdjbvaufppqc",
          },
        });

        var mailOptions = {
          from: "cubes.dev14@gmail.com",
          to: req.body.email_id,
          subject: "Forgot Password For KuwaitEye App",
          text: "Your One Time Password For KuwaitEye Is " + temp_pass,
        };

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            body.Status = 0;
            body.Message = "Email id is not Valid";
            body.info = error;
            result(null, body);
            return;
          } else {
            db.query(
              "UPDATE tbl_users SET temp_pass = ? WHERE email_id = ?",
              [temp_pass, req.body.email_id],
              (err, res) => {
                if (err) {
                  body.Status = 0;
                  body.Message = "Invalid credential";
                  result(null, body);
                  return;
                } else {
                  body.Status = 1;
                  body.Message = "OTP sent your verified email..";
                  result(null, body);
                  return;
                }
              }
            );
          }
        });
      } else {
        body.Status = 0;
        body.Message = "Email id Does not match over records";
        result(null, body);
        return;
      }
    }
  });
};

exports.reset_password = (req, result) => {
  var body = {};
  usersService.findByMail(req.body.email_id, (err, res) => {
    if (res) {
      var old_pass = res.password;
      var new_pass = md5(req.body.new_pass);
      if (new_pass == old_pass) {
        body.Status = 0;
        body.Message =
          "You have entered current password please entered new password";
        result(null, body);
        return;
      } else {
        db.query(
          "UPDATE tbl_users SET password = ? WHERE email_id = ?",
          [new_pass, req.body.email_id],
          (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              body.Status = 1;
              body.Message = "Reset password successfully done";
              result(null, body);
              return;
            }
          }
        );
      }
    } else {
      body.Status = 0;
      body.Message = "Please Entre valid Email Id";
      result(null, body);
      return;
    }
  });
};

exports.change_password = (req, result) => {
  var body = {};
  var CurrrentPassword = md5(req.body.password);
  var NewPassword = md5(req.body.new_pass);
  if (CurrrentPassword == req.user.password) {
    if (NewPassword == req.user.password) {
      body.Status = 0;
      body.Message =
        "You have Entered Currrent Password Please enter new password";
      result(null, body);
      return;
    } else {
      db.query(
        "SELECT password FROM tbl_users WHERE user_id = ?",
        [req.user.user_id],
        (err, res) => {
          if (err) {
            console.log("error", err);
            result(err, null);
            return;
          } else {
            db.query(
              "UPDATE tbl_users SET password = ? WHERE user_id = ?",
              [md5(req.body.new_pass), req.user.user_id],
              (err, res1) => {
                if (err) {
                  result(err, null);
                  return;
                } else {
                  body.Status = 1;
                  body.Message = "Password changed successfully";
                  result(null, body);
                  return;
                }
              }
            );
          }
        }
      );
    }
  } else {
    body.Status = 0;
    body.Message = "Current password is wrong";
    result(null, body);
    return;
  }
};

exports.edit_profile = (req, result) => {
  var body = {};
  function updateprofile(data) {
    db.query(
      "UPDATE tbl_users SET ? WHERE user_id = ?",
      [data, data.user_id],
      (err, res) => {
        if (err) {
          result(err, null);
          return;
        } else {
          db.query(
            "SELECT t1.* FROM tbl_users t1 WHERE t1.user_id = ?",
            [data.user_id],
            (err, res1) => {
              if (err) {
                result(err, null);
                return;
              } else {
                if (res1.length <= 0) {
                  body.Status = 0;
                  body.Message = "User Not Found";
                  return result(null, body);
                } else {
                  body.Status = 1;
                  body.Message = "User profile edited successfully";
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

  var update_data = {};
  usersService.findByMail(req.body.email_id, (err, res1) => {
    if (err) {
      result(err, null);
      return;
    } else {
      var email = res1 ? res1.email_id : req.user.email_id;
      if (req.body.email_id && email != req.user.email_id) {
        body.Status = 0;
        body.Message =
          "An account already exists with your email. Please login below.";
        return result(null, body);
      } else {
        update_data.user_id = req.user.user_id;
        update_data.updated_at = moment().format("YYYY-MM-DD HH:mm:ss");
        if (req.body.first_name) {
          update_data.first_name = req.body.first_name;
        }
        if (req.body.last_name) {
          update_data.last_name = req.body.last_name;
        }
        if (req.body.country_id) {
          update_data.country_id = req.body.country_id;
        }
        if (req.body.email_id) {
          update_data.email_id = req.body.email_id;
        }
        if (req.files != undefined) {
          if (req.files.profile_pic) {
            try {
              fs.unlinkSync(req.user.profile_pic);
            } catch (e) {
              console.log("Profile pic not found");
            }
            var ext = req.files.profile_pic[0].originalname.split(".").pop();
            ImageUrl_media = req.files.profile_pic[0].filename;
            ImageUrl_with__ext = req.files.profile_pic[0].filename + "." + ext;

            fs.renameSync(
              "uploads/images/" + ImageUrl_media,
              "uploads/images/" + ImageUrl_with__ext
            );
            var new_path = "uploads/images/" + ImageUrl_with__ext;
            update_data.profile_pic = new_path;
          }
        }
        updateprofile(update_data);
      }
    }
  });
};

exports.logout = (req, result) => {
  var body = {};
  usersService.findByUserId(req.user.user_id, (err, authData) => {
    if (err) {
      res.send(err);
    } else {
      if (authData.isData) {
        db.query(
          "DELETE FROM tbl_token WHERE device_id = ? AND user_id = ?",
          [req.body.device_id, req.user.user_id],
          (err, res) => {
            if (err) {
              result(err, null);
              return;
            } else {
              body.Status = 1;
              body.Message = "Logout successfully";
              result(null, body);
              return;
            }
          }
        );
      } else {
        body.Status = 0;
        body.Message = "Unauthorised User";
        return result(null, body);
      }
    }
  });
};

exports.get_country = (req, result) => {
  var body = {};
  db.query(
    "SELECT t1.* FROM tbl_country t1 ORDER BY t1.country_name",
    (err, res) => {
      if (err) {
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Status = 1;
          body.Message = "NO data found";
        } else {
          body.Status = 1;
          body.Message = "Countries get successfully";
          body.info = res;
        }
        return result(null, body);
      }
    }
  );
};

exports.list_category = (req, result) => {
  var body = {};
  var WHERE = "";
  if (req.body.search_text) {
    WHERE = " AND t1.category_name LIKE '%" + req.body.search_text + "%'";
  }
  db.query(
    "SELECT t1.category_id,t1.category_name FROM tbl_category t1 WHERE t1.parent_id = 0",
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Status = 1;
          body.Message = "No Category Found!";
          body.info = res;
          result(null, body);
          return;
        } else {
          res.forEach((e, i) => {
            db.query(
              "SELECT t1.* FROM tbl_category t1 WHERE t1.parent_id = ? " +
                WHERE +
                "",
              [e.category_id],
              (err, res1) => {
                if (err) {
                  console.log("error", err);
                  result(err, null);
                  return;
                } else {
                  res[i]["sub_category"] = res1;
                  if (res.length - 1 == i) {
                    body.Status = 1;
                    body.Message = "Category listed successfully";
                    body.info = res;
                    result(null, body);
                    return;
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

exports.list_event_data = (req, result) => {
  var body = {};
  const limit = 5;
  const page_no = req.body.page_no;
  const offset = (page_no - 1) * limit;
  var WHERE = "";
  if (req.body.search_text) {
    WHERE = " AND t1.title LIKE '%" + req.body.search_text + "%'";
  }
  db.query(
    "SELECT t1.*,(SELECT (t3.image) FROM tbl_event_image t3 WHERE t1.event_id = t3.event_id ORDER BY t3.image_id DESC LIMIT 1)as image,\n\
    format(111.111 *\n\
      DEGREES(ACOS(LEAST(1.0, COS(RADIANS(t1.latitude))\n\
           * COS(RADIANS(?))\n\
           * COS(RADIANS(t1.longitude - ?))\n\
           + SIN(RADIANS(t1.latitude))\n\
           * SIN(RADIANS(?))))), 2) AS distance_in_km,\n\
    IFNULL((SELECT COUNT(*) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as review_count,\n\
    IFNULL((SELECT AVG(t2.no_of_star) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as star_count,\n\
    IFNULL((SELECT COUNT(*) FROM tbl_event t1 WHERE t1.type = 0 " +
      WHERE +
      "),0)as total_event_data\n\
     FROM tbl_event t1\n\
      LEFT JOIN tbl_event_image ON t1.event_id = t3.event_id LIMIT 1 \n\
     WHERE t1.type = 0 " +
      WHERE +
      " ORDER BY t1.event_id DESC LIMIT " +
      limit +
      " OFFSET " +
      offset,
    [req.body.latitude, req.body.longitude, req.body.latitude],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Message = "No data found";
          body.total_page = 0;
        } else {
          body.Message = "Event data get successfully";
          body.total_page = Math.ceil(res[0].total_event_data / limit);
        }
        body.Status = 1;
        body.info = res;
        result(null, body);
        return;
      }
    }
  );
};

exports.list_place_data = (req, result) => {
  var body = {};
  const limit = 5;
  const page_no = req.body.page_no;
  const offset = (page_no - 1) * limit;
  var WHERE = "";
  if (req.body.search_text) {
    WHERE = " AND t1.title LIKE '%" + req.body.search_text + "%'";
  }
  db.query(
    "SELECT t1.*,(SELECT (t3.image) FROM tbl_event_image t3 WHERE t1.event_id = t3.event_id ORDER BY t3.image_id DESC LIMIT 1)as image,\n\
    format(111.111 *\n\
      DEGREES(ACOS(LEAST(1.0, COS(RADIANS(t1.latitude))\n\
           * COS(RADIANS(?))\n\
           * COS(RADIANS(t1.longitude - ?))\n\
           + SIN(RADIANS(t1.latitude))\n\
           * SIN(RADIANS(?))))), 2) AS distance_in_km,\n\
    IFNULL((SELECT COUNT(*) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as review_count,\n\
    IFNULL((SELECT AVG(t2.no_of_star) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as star_count,\n\
    IFNULL((SELECT COUNT(*) FROM tbl_event t1 WHERE t1.type = 1 " +
      WHERE +
      "),0)as total_place_data\n\
     FROM tbl_event t1 \n\
     WHERE t1.type = 1 " +
      WHERE +
      " ORDER BY t1.event_id DESC LIMIT " +
      limit +
      " OFFSET " +
      offset,
    [req.body.latitude, req.body.longitude, req.body.latitude],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        if (res.length <= 0) {
          body.Message = "No data found";
          body.total_page = 0;
        } else {
          body.Message = "Event data get successfully";
          body.total_page = Math.ceil(res[0].total_place_data / limit);
        }
        body.Status = 1;
        body.info = res;
        result(null, body);
        return;
      }
    }
  );
};

exports.add_review = (req, result) => {
  var body = {};
  db.query(
    "SELECT review_id FROM tbl_review WHERE review_by = ? AND event_id = ?",
    [req.user.user_id, req.body.event_id],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(er, null);
        return;
      } else {
        if (res.length <= 0) {
          db.query(
            "INSERT INTO tbl_review(review_by,event_id,no_of_star,review_text)VALUES(?,?,?,?)",
            [
              req.user.user_id,
              req.body.event_id,
              req.body.no_of_star,
              hee.decode(req.body.review_text),
            ],
            (err, res1) => {
              if (err) {
                console.log("error", err);
                result(er, null);
                return;
              } else {
                body.Status = 1;
                body.Message = "Review added successfully";
                result(null, body);
                return;
              }
            }
          );
        } else {
          body.Status = 2;
          body.Message = "You have already added review for these event";
          result(null, body);
          return;
        }
      }
    }
  );
};

exports.list_review = (req, result) => {
  var body = {};
  db.query(
    "SELECT COUNT(*)as review_count,\n\
IFNULL((SELECT AVG(t2.no_of_star) FROM tbl_review t2 WHERE t1.review_to = t2.review_to),0)as star_count,\n\
IFNULL((SELECT COUNT(*) FROM tbl_review t3 WHERE t1.review_to = t3.review_to AND t3.no_of_star = 1),0)as 1_star_count,\n\
IFNULL((SELECT COUNT(*) FROM tbl_review t4 WHERE t1.review_to = t4.review_to AND t4.no_of_star = 2),0)as 2_star_count,\n\
IFNULL((SELECT COUNT(*) FROM tbl_review t5 WHERE t1.review_to = t5.review_to AND t5.no_of_star = 3),0)as 3_star_count,\n\
IFNULL((SELECT COUNT(*) FROM tbl_review t6 WHERE t1.review_to = t6.review_to AND t6.no_of_star = 4),0)as 4_star_count,\n\
IFNULL((SELECT COUNT(*) FROM tbl_review t7 WHERE t1.review_to = t7.review_to AND t7.no_of_star = 5),0)as 5_star_count\n\
FROM tbl_review t1 WHERE t1.event_id = ?",
    [req.body.event_id],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        db.query(
          "SELECT t1.*,t2.first_name,t2.last_name,t2.profile_pic FROM tbl_review t1 \n\
    LEFT JOIN tbl_users t2 ON t1.review_by = t2.user_id WHERE t1.event_id = ?",
          [req.body.event_id],
          (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              res[0]["review_data"] = res1;
              body.Status = 1;
              body.Message = "Review listed successfully";
              body.info = res[0];
              result(null, body);
              return;
            }
          }
        );
      }
    }
  );
};

exports.get_event_details = (req, result) => {
  var body = {};
  db.query(
    "SELECT t1.*,\n\
  format(111.111 *\n\
    DEGREES(ACOS(LEAST(1.0, COS(RADIANS(t1.latitude))\n\
         * COS(RADIANS(?))\n\
         * COS(RADIANS(t1.longitude - ?))\n\
         + SIN(RADIANS(t1.latitude))\n\
         * SIN(RADIANS(?))))), 2) AS distance_in_km,\n\
  IFNULL((SELECT COUNT(*) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as review_count,\n\
  IFNULL((SELECT AVG(t2.no_of_star) FROM tbl_review t2 WHERE t1.event_id = t2.event_id),0)as star_count\n\
   FROM tbl_event t1 WHERE t1.event_id = ?",
    [
      req.body.latitude,
      req.body.longitude,
      req.body.latitude,
      req.body.event_id,
    ],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        db.query(
          "SELECT * FROM tbl_event_image WHERE event_id = ?",
          [req.body.event_id],
          (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              res[0]["image"] = res1;
              body.Status = 1;
              body.Message = "Event details get successfully";
              body.info = res[0];
              result(null, body);
              return;
            }
          }
        );
      }
    }
  );
};

exports.delete_user_account = (req, result) => {
  var body = {};
  try {
    fs.unlinkSync(req.user.profile_pic);
  } catch (e) {
    console.log("No profile_pic found");
  }
  db.query(
    "DELETE FROM tbl_users WHERE user_id = ?",
    [req.user.user_id],
    (err, res) => {
      if (err) {
        console.log("error", err);
        result(err, null);
        return;
      } else {
        db.query(
          "DELETE FROM tbl_token WHERE user_id = ?",
          [req.user.user_id],
          (err, res1) => {
            if (err) {
              console.log("error", err);
              result(err, null);
              return;
            } else {
              body.Status = 1;
              body.Message = "User account deleted successfully";
              result(null, body);
              return;
            }
          }
        );
      }
    }
  );
};
