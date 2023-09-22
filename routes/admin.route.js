const adminController = require("../controllers/admin.controller.js");
const authenticate = require("../middleware/authenticate.js");
const { check, validationResult } = require("express-validator");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/images" });

router.post(
  "/admin_login",
  [
    check("email_id").not().isEmpty().trim().escape(),
    check("password").not().isEmpty().trim().escape(),
    check("device_type").not().isEmpty().trim().escape(),
    check("device_id").not().isEmpty().trim().escape(),
    check("device_token").not().isEmpty().trim().escape(),
  ],
  adminController.login
);

router.post(
  "/add_country",
  [check("country_name").not().isEmpty().trim().escape()],
  [authenticate],
  adminController.add_country
);

router.post(
  "/add_category",
  [check("category_name").not().isEmpty().trim().escape()],
  [authenticate],
  adminController.add_category
);

router.post(
  "/add_sub_category",
  upload.fields([{ name: "category_image", maxCount: 1 }]),
  [
    check("category_name").not().isEmpty().trim().escape(),
    check("parent_id").not().isEmpty().trim().escape(),
  ],
  [authenticate],
  adminController.add_sub_category
);

router.post("/get_category", adminController.get_category);

router.post("/get_sub_category", adminController.get_sub_category);

router.post(
  "/add_event",
  upload.fields([{ name: "image", maxCount: 10 }]),
  [
    check("type").not().isEmpty().trim().escape(),
    check("title").not().isEmpty().trim().escape(),
    check("location").not().isEmpty().trim().escape(),
    check("latitude").not().isEmpty().trim().escape(),
    check("longitude").not().isEmpty().trim().escape(),
  ],
  [authenticate],
  adminController.add_event
);

router.post(
  "/edit_event",
  upload.fields([{ name: "image", maxCount: 10 }]),
  [check("event_id").not().isEmpty().trim().escape()],
  [authenticate],
  adminController.edit_event
);

router.post(
  "/list_event",
  [
    check("type").not().isEmpty().trim().escape(),
    check("page_no").not().isEmpty().trim().escape(),
  ],
  [authenticate],
  adminController.list_event
);

router.post(
  "/delete_event",
  [check("event_id").not().isEmpty().trim().escape()],
  [authenticate],
  adminController.delete_event
);

router.post(
  "/search_event",
  [check("search_text").not().isEmpty().trim().escape()],
  [authenticate],
  adminController.search_event
);

module.exports = router;
