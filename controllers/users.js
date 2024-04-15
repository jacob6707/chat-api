const User = require("../models/user");
const Channel = require("../models/channel");
const { Friend, FriendStatus } = require("../models/friend");
const { getIO } = require("../socket");

exports.getCurrentUser = (req, res, next) => {
	User.findById(req.userId)
		.select("-password -socketId +status.preferred")
		.populate("friends", "-updatedAt -__v")
		.populate(
			"directMessages.userId",
			"displayName status about avatarUrl socketId"
		)
		.populate({
			path: "directMessages.channelId",
			select: "_id name isDM messages participants",
			populate: [
				{
					path: "participants",
					select: "displayName status about avatarUrl",
				},
				{
					path: "messages",
					model: "Message",
					perDocumentLimit: 1,
					options: { sort: { createdAt: -1 }, limit: 1 },
				},
			],
		})
		.then((user) => {
			if (!user) {
				const error = new Error("User not found");
				error.statusCode = 404;
				throw error;
			}
			const modifiedUser = user.toObject();
			modifiedUser.directMessages.sort((a, b) => {
				if (a.channelId.messages.length === 0) return 1;
				if (b.channelId.messages.length === 0) return -1;
				return (
					b.channelId.messages[0].createdAt - a.channelId.messages[0].createdAt
				);
			});
			res.status(200).json(modifiedUser);
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

exports.getUser = (req, res, next) => {
	const uid = req.params.id;
	if (!uid.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "User ID invalid" });
	}
	User.findById(uid)
		.select(
			"-email -password -friends -directMessages -createdAt -updatedAt -__v"
		)
		.then((user) => {
			if (!user) {
				const error = new Error("User not found");
				error.statusCode = 404;
				throw error;
			}
			res.status(200).json(user);
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

exports.addFriend = async function (req, res, next) {
	const UserA = req.userId;
	let UserB = req.params.id;
	if (UserA.toString() === UserB.toString()) {
		return res.status(422).json({ message: "Cannot add yourself" });
	}
	let orQuery = [{ username: UserB }, { email: UserB }];
	if (UserB.match(/^[0-9a-fA-F]{24}$/)) {
		orQuery.push({ _id: UserB });
	}
	try {
		if (
			!(await User.findOne({
				$or: orQuery,
			}))
		) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		const user2 = await User.findOne({
			$or: orQuery,
		})
			.select("+socketId")
			.populate("friends");
		if (user2._id.toString() === UserA.toString()) {
			return res.status(422).json({ message: "Cannot add yourself" });
		}
		UserB = user2._id.toString();
		const user1 = await User.findById(UserA);
		const name = user1.displayName;
		if (
			user2.friends.find((f) => {
				return (
					f.recipient.toString() === UserA.toString() &&
					f.status == FriendStatus.REQUESTED
				);
			})
		) {
			await Friend.findOneAndUpdate(
				{ requester: UserA, recipient: UserB },
				{ $set: { status: FriendStatus.FRIENDS } }
			);
			await Friend.findOneAndUpdate(
				{ recipient: UserA, requester: UserB },
				{ $set: { status: FriendStatus.FRIENDS } }
			);
			if (user2.socketId)
				getIO().to(user2.socketId).emit("friendRequestAccepted", {
					name,
				});
			return res.status(200).json({ message: "Friend accepted" });
		}
		if (
			user2.friends.find((f) => {
				return (
					f.recipient.toString() === UserA.toString() &&
					f.status == FriendStatus.FRIENDS
				);
			})
		) {
			return res.status(422).json({ message: "Already friends with user" });
		}
		const docA = await Friend.findOneAndUpdate(
			{ requester: UserA, recipient: UserB },
			{ $set: { status: FriendStatus.REQUESTED } },
			{ upsert: true, new: true }
		);
		const docB = await Friend.findOneAndUpdate(
			{ recipient: UserA, requester: UserB },
			{ $set: { status: FriendStatus.PENDING } },
			{ upsert: true, new: true }
		);
		const updateUserA = await User.findOneAndUpdate(
			{ _id: UserA },
			{ $addToSet: { friends: docA._id } }
		);
		const updateUserB = await User.findOneAndUpdate(
			{ _id: UserB },
			{ $addToSet: { friends: docB._id } }
		);
		if (user2.socketId)
			getIO().to(user2.socketId).emit("friendRequest", {
				name,
			});
		return res.status(200).json({ status: "Friend added" });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.removeFriend = async function (req, res, next) {
	const UserA = req.userId;
	const UserB = req.params.id;
	if (!UserB.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "User ID invalid" });
	}
	if (UserA.toString() === UserB.toString()) {
		res.status(422).json({ message: "Cannot remove yourself" });
	}
	try {
		const user2 = await User.findById(UserB).select("+socketId");
		if (!user2) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		const docA = await Friend.findOneAndDelete({
			requester: UserA,
			recipient: UserB,
		});
		const docB = await Friend.findOneAndDelete({
			recipient: UserA,
			requester: UserB,
		});
		const updateUserA = await User.findOneAndUpdate(
			{ _id: UserA },
			{ $pull: { friends: docA._id } }
		);
		const updateUserB = await User.findOneAndUpdate(
			{ _id: UserB },
			{ $pull: { friends: docB._id } }
		);
		const user1 = await User.findById(UserA);
		const name = user1.displayName;
		if (user2.socketId)
			getIO().to(user2.socketId).emit("friendRemoved", {
				name,
			});
		return res.status(200).json({ message: "Friend removed" });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.postMessage = async function (req, res, next) {
	const uid = req.params.id;
	try {
		if (!uid.match(/^[0-9a-fA-F]{24}$/)) {
			res.status(422).json({ message: "User ID invalid" });
		}
		const user = await User.findOne({ _id: req.userId }).populate("friends");
		const user2 = await User.findOne({ _id: uid });
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 403;
			throw error;
		}
		if (!user2) {
			const error = new Error("DM Participant not found");
			error.statusCode = 404;
			throw error;
		}
		let dm = user.directMessages.find(
			(_dm) => _dm.userId.toString() === uid.toString()
		);
		let status = 200;
		if (!dm) {
			const friendship = await Friend.findOne({
				requester: req.userId,
				recipient: uid,
				status: FriendStatus.FRIENDS,
			});
			if (!friendship) {
				const error = new Error("User is not friends with participant");
				error.statusCode = 403;
				throw error;
			}
			const channel = new Channel({
				name: "DM",
				isDM: true,
				participants: [req.userId, uid],
			});
			await channel.save();
			dm = { userId: uid, channelId: channel.id };
			user.directMessages.push(dm);
			await user.save();
			user2.directMessages.push({ userId: req.userId, channelId: channel.id });
			await user2.save();
			status = 201;
		}
		res.status(status).json(dm);
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.updateStatus = async function (req, res, next) {
	const status = req.body.status;
	if (!["Online", "Away", "Do Not Disturb", "Offline"].includes(status)) {
		res.status(422).json({ message: "Invalid status" });
	}
	try {
		const user = await User.findOneAndUpdate(
			{
				_id: req.userId,
			},
			{
				status: {
					preferred: status,
					current: status,
				},
			}
		);
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		res.status(200).json({ message: "Status updated" });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};
