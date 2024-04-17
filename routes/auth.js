const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.put(
	"/signup",
	[
		body("email").trim().isEmail(),
		body("password").trim().isLength({ min: 4 }),
		body("username").trim().notEmpty().isAlphanumeric(),
	],
	authController.signup
);

router.post("/login", authController.login);

router.get("/", authController.testToken);

router.put("/password", isAuth, authController.updatePassword);

module.exports = router;
