const express = require("express");
const { body } = require("express-validator");

const channelsController = require("../controllers/channels");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/", isAuth);

router.get("/:id", isAuth, channelsController.getChannel);

router.get("/:id/messages", isAuth, channelsController.getChannelMessages);

router.post(
	"/:id",
	isAuth,
	[body("content").trim().notEmpty().isLength({ max: 2000 })],
	channelsController.postChannel
);

router.post(
	"/",
	isAuth,
	[body("name").notEmpty()],
	channelsController.createChannel
);

router.delete("/:id", isAuth, channelsController.deleteChannel);

router.post("/:id/add", isAuth, channelsController.addParticipant);

router.post("/:id/remove", isAuth, channelsController.removeParticipant);

router.patch(
	"/:id/messages/:mid",
	isAuth,
	[body("content").trim().notEmpty().isLength({ max: 2000 })],
	channelsController.editMessage
);

router.delete("/:id/messages/:mid", isAuth, channelsController.deleteMessage);

module.exports = router;
