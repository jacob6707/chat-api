const express = require("express");
const { body } = require("express-validator");
const multer = require("multer");
const storage = multer.memoryStorage();

const usersController = require("../controllers/users");
const isAuth = require("../middleware/is-auth");
const upload = multer({
	storage: storage,
	limits: { fileSize: 1024 * 1024 * 25 },
});

const router = express.Router();

router.get("/", isAuth, usersController.getCurrentUser);

router.get("/:id", isAuth, usersController.getUser);

router.post("/:id/add", isAuth, usersController.addFriend);

router.delete("/:id/remove", isAuth, usersController.removeFriend);

router.post("/:id/message", isAuth, usersController.postMessage);

router.post("/status", isAuth, usersController.updateStatus);

router.post(
	"/settings",
	isAuth,
	upload.single("avatar"),
	usersController.updateSettings
);

router.delete("/avatar", isAuth, usersController.deleteAvatar);

module.exports = router;
