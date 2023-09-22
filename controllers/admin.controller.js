const adminService = require("../services/admin.service.js");
const jwt = require("jsonwebtoken");
const { check, validationResult } = require("express-validator");
const nodemailer = require("nodemailer");
const md5 = require("md5");
const fs = require("fs");

function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

exports.login = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.login(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.add_country = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.add_country(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.add_category = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.add_category(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.add_sub_category = (req, res) => {
  const errors = validationResult(req);
  var err = errors.array();
  var validateobj = {
    msg: "Invalid value",
    param: "category_image",
    location: "body",
  };
  if (!errors.isEmpty() || req.files == undefined || isEmpty(req.files)) {
    if (!errors.isEmpty() && req.files == undefined) {
      err.push(validateobj);
    } else if (errors.isEmpty() && req.files.category_image == undefined) {
      err.push(validateobj);
    } else if (!errors.isEmpty() && req.files.category_image != undefined) {
      fs.unlinkSync(req.files.category_image);
    }
    return res.status(422).json({ errors: err });
  }
  adminService.add_sub_category(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.get_category = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.get_category(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.get_sub_category = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.get_sub_category(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.add_event = (req, res) => {
  const errors = validationResult(req);
  var err = errors.array();
  var validateobj = {
    msg: "Invalid value",
    param: "image",
    location: "body",
  };
  if (!errors.isEmpty() || req.files == undefined || isEmpty(req.files)) {
    if (!errors.isEmpty() && req.files == undefined) {
      err.push(validateobj);
    } else if (errors.isEmpty() && req.files.image == undefined) {
      err.push(validateobj);
    } else if (!errors.isEmpty() && req.files.image != undefined) {
      req.files.image.forEach((element) => {
        fs.unlinkSync(element.path);
      });
    }
    return res.status(422).json({ errors: err });
  }
  adminService.add_event(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.edit_event = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.edit_event(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.list_event = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.list_event(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.delete_event = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.delete_event(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};

exports.search_event = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  adminService.search_event(req, (err, data) => {
    if (err) {
      return res.status(400).json(err);
    } else {
      return res.status(200).json(data);
    }
  });
};