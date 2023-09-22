const db = require("../config/db.config.js");
const FCM = require("fcm-node");
const serverKey =
  "AAAA6EPLikE:APA91bHWB3T4xQB5v8UXNE4kDaPznpr_YmwyGWBmV1zjA_QjZvYLYB8v75sLUxVO_O8y6op3Mnc6U1Rpqvi5xb3CCo9jPXVxDBboA5_HNZ6y5TMbxA9vVZiYX6h-ixKwOSZ3flpOAjhJ"; //put
const fcm = new FCM(serverKey);

exports.SendPushNotification = (user_id, message) => {
    console.log("okkkk");
  db.query(
    "SELECT GROUP_CONCAT(t1.device_token)as token FROM tbl_token t1 WHERE t1.user_id = ?",
    [user_id],
    (err, res) => {
      if (err) {
        console.log("error: ", err);
        result(err, null);
        return;
      } else {
        try {
          var tokens = res[0]["token"];
          if (tokens) {
            var tokens = tokens.split(",");
            message["registration_ids"] = tokens;
          }
        } catch (e) {
          console.log(e);
        }

        fcm.send(message, function (err, response) {
          if (err) {
            console.log("something went wrong!");
            console.log(err);
          } else {
            console.log(
              "Successfully sent user_id = " + user_id + " with response: ",
              response
            );
          }
        });
      }
    }
  );
};