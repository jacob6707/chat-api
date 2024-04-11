const User = require("../models/user");
const Channel = require("../models/channel");
const Message = require("../models/message");
const { Friend } = require("../models/friend");

const { validationResult } = require("express-validator");
const { MESSAGES_PER_PAGE } = require("../util/constants");
const { getIO } = require("../socket");

exports.getChannel = (req, res, next) => {
	const cid = req.params.id;
	if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "Channel ID invalid" });
	}
	Channel.findById(cid)
		.select("-messages -__v")
		.populate("participants", "_id displayName")
		.then((channel) => {
			if (!channel) {
				const error = new Error("Channel not found");
				error.statusCode = 404;
				throw error;
			}
			if (
				!channel.participants.find(
					(p) => p._id.toString() === req.userId.toString()
				)
			) {
				const error = new Error("User is not a participant of the channel");
				error.statusCode = 403;
				throw error;
			}
			return res.status(200).json(channel);
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

exports.getChannelMessages = async (req, res, next) => {
	const cid = req.params.id;
	const page = Number(req.query.page) || 1;
	const limit = Number(req.query.limit) || MESSAGES_PER_PAGE;

	if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "Channel ID invalid" });
	}
	try {
		const channel = await Channel.findById(cid)
			.select("participants messages")
			.populate({
				path: "messages",
				select: "-channel -__v",
				options: {
					sort: { createdAt: -1 },
					limit: limit,
					skip: (page - 1) * limit,
				},
				populate: {
					path: "author",
					select: "_id displayName",
				},
			});
		if (!channel) {
			const error = new Error("Channel not found");
			error.statusCode = 404;
			throw error;
		}
		if (
			!channel.participants.find((p) => p.toString() === req.userId.toString())
		) {
			const error = new Error("User is not a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		const totalMessages = await Message.find({ channel: cid }).countDocuments();
		return res.status(200).json({ totalMessages, messages: channel.messages });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}

	// Channel.findById(cid)
	// 	.select("participants messages")
	// 	.populate({
	// 		path: "messages",
	// 		select: "-channel -__v",
	// 		options: {
	// 			sort: { createdAt: -1 },
	// 			limit: limit,
	// 			skip: (page - 1) * limit,
	// 		},
	// 		populate: {
	// 			path: "author",
	// 			select: "_id displayName",
	// 		},
	// 	})
	// 	.then((channel) => {
	// 		if (!channel) {
	// 			const error = new Error("Channel not found");
	// 			error.statusCode = 404;
	// 			throw error;
	// 		}
	// 		if (
	// 			!channel.participants.find(
	// 				(p) => p.toString() === req.userId.toString()
	// 			)
	// 		) {
	// 			const error = new Error("User is not a participant of the channel");
	// 			error.statusCode = 403;
	// 			throw error;
	// 		}
	// 		return {
	// 			totalMessages: Message.find({ channel: cid }).countDocuments().exec(),
	// 			channel,
	// 		};
	// 	})
	// 	.then(({ totalMessages, channel }) => {
	// 		console.log(totalMessages);
	// 		res.status(200).json({ totalMessages, messages: channel.messages });
	// 	})
	// 	.catch((err) => {
	// 		if (!err.statusCode) {
	// 			err.statusCode = 500;
	// 		}
	// 		next(err);
	// 	});
};

exports.postChannel = async function (req, res, next) {
	const cid = req.params.id;
	try {
		if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
			res.status(422).json({ message: "Channel ID invalid" });
		}
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const error = new Error("Validation failed");
			error.statusCode = 422;
			error.data = errors.array();
			throw error;
		}
		const channel = await Channel.findById(cid);
		if (!channel) {
			const error = new Error("Channel not found");
			error.statusCode = 404;
			throw error;
		}
		if (
			!channel.participants.find((p) => p.toString() === req.userId.toString())
		) {
			const error = new Error("User is not a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		if (channel.isDM) {
			const friendship = await Friend.findOne({
				requester: channel.participants[0],
				recipient: channel.participants[1],
			});
			if (!friendship) {
				const error = new Error("User is not friends with participant");
				error.statusCode = 403;
				throw error;
			}
		}
		const content = req.body.content;
		console.log(content);
		const message = new Message({
			channel: cid,
			author: req.userId,
			content: content,
		});
		await message.save();
		channel.messages.push(message);
		await channel.save();
		getIO()
			.to(cid)
			.emit("message", {
				action: "create",
				channel: cid,
				sender: channel.participants.find(
					(p) => p.toString() !== req.userId.toString()
				).displayName,
				content: content,
			});
		return res.status(200).send(message);
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.createChannel = async function (req, res, next) {
	// TODO: Implement creating a channel with multiple participants, a name, and a channel photo (optional)
	try {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			const error = new Error("Validation failed");
			error.statusCode = 422;
			error.data = errors.array();
			throw error;
		}
		const participants = req.body.participants;
		participants.push(req.userId);
		// check if participants exist
		const users = await User.find({
			_id: { $in: participants },
		}).countDocuments();
		if (users !== participants.length) {
			const error = new Error("One or more participants not found");
			error.statusCode = 404;
			throw error;
		}
		const name = req.body.name;
		const channel = new Channel({
			participants,
			name,
		});
		await channel.save();
		// add channel to participants' direct messages
		for (const participant of participants) {
			const user = await User.findOne({ _id: participant });
			user.directMessages.push({ userId: participant, channelId: channel.id });
			await user.save();
		}
		return res.status(201).json(channel);
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.addParticipant = async function (req, res, next) {
	// TODO: Implement adding a participant to a channel
	try {
		const cid = req.params.id;
		const uid = req.body.userId;
		if (!cid.match(/^[0-9a-fA-F]{24}$/) || !uid.match(/^[0-9a-fA-F]{24}$/)) {
			return res.status(422).json({ message: "Channel ID or User ID invalid" });
		}
		const channel = await Channel.findById(cid);
		if (!channel) {
			const error = new Error("Channel not found");
			error.statusCode = 404;
			throw error;
		}
		if (
			!channel.participants.find((p) => p.toString() === req.userId.toString())
		) {
			const error = new Error("User is not a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		const user = await User.findById(uid);
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		if (channel.participants.find((p) => p.toString() === uid.toString())) {
			const error = new Error("User is already a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		channel.participants.push(uid);
		await channel.save();
		user.directMessages.push({ userId: uid, channelId: cid });
		await user.save();
		return res.status(200).json(channel);
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.removeParticipant = async function (req, res, next) {
	// TODO: Implement removing a participant from a channel
	try {
		const cid = req.params.id;
		const uid = req.body.userId;
		if (!cid.match(/^[0-9a-fA-F]{24}$/) || !uid.match(/^[0-9a-fA-F]{24}$/)) {
			return res.status(422).json({ message: "Channel ID or User ID invalid" });
		}
		const channel = await Channel.findById(cid);
		if (!channel) {
			const error = new Error("Channel not found");
			error.statusCode = 404;
			throw error;
		}
		if (
			!channel.participants.find((p) => p.toString() === req.userId.toString())
		) {
			const error = new Error("User is not a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		const user = await User.findById(uid);
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		if (!channel.participants.find((p) => p.toString() === uid.toString())) {
			const error = new Error("User is not a participant of the channel");
			error.statusCode = 403;
			throw error;
		}
		channel.participants = channel.participants.filter(
			(p) => p.toString() !== uid.toString()
		);
		await channel.save();
		user.directMessages = user.directMessages.filter(
			(dm) => dm.channelId.toString() !== cid.toString()
		);
		await user.save();
		res.status(200).json(channel);
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};
