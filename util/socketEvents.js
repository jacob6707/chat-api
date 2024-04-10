const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Channel = require("../models/channel");

exports.joinChannel = async function (socket, token, channelId) {
	try {
		const dToken = jwt.decode(token, { json: true });
		if (!dToken) {
			return socket.emit("error", { message: "Not authenticated" });
		}
		const uid = dToken.userId;
		const user = await User.findById(uid);
		if (!user) {
			const error = new Error("Bearer of token not found");
			error.statusCode = 403;
			throw error;
		}
		const secret = user.password;
		const decodedToken = jwt.verify(token, secret);
		if (!decodedToken) {
			const error = new Error("Not authenticated");
			error.statusCode = 401;
			throw error;
		}
		const userExists = await Channel.find({
			channelId: channelId,
			participants: {
				$elemMatch: { _id: uid },
			},
		});
		if (userExists) {
			socket.join(channelId);
			console.log(`User ${uid} joined channel ${channelId}`);
		}
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		socket.emit("error", err);
	}
};
