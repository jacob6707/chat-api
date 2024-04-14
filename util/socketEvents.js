const Channel = require("../models/channel");
const User = require("../models/user");
const { getUserFromToken } = require("./helpers");

exports.authenticate = async function (socket, next) {
	const token = socket.handshake.auth.token;
	if (!token) return next(new Error("Authentication error"));
	const user = await getUserFromToken(token);
	if (!user) return next(new Error("Authentication error"));
	socket.user = user;
	await User.findByIdAndUpdate(user._id, {
		socketId: socket.id,
		"status.current": user.status.preferred,
		"status.preferred": user.status.preferred,
	});
	next();
};

exports.joinChannel = async function (socket, channelId) {
	try {
		const uid = socket.user._id.toString();
		const userExists = await Channel.find({
			channelId: channelId,
			participants: {
				$elemMatch: { _id: uid },
			},
		});
		if (userExists) {
			socket.join(channelId);
			socket.to(channelId).emit("userJoined", {
				channel: channelId,
				user: uid,
			});
		}
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		socket.emit("error", err);
	}
};
