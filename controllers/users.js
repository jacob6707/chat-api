const User = require("../models/user");
const Channel = require("../models/channel");
const { Friend, FriendStatus } = require("../models/friend");

exports.getCurrentUser = (req, res, next) => {
	User.findById(req.userId)
		.select("-password")
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

exports.getUser = (req, res, next) => {
	const uid = req.params.id;
	if (!uid.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "User ID invalid" });
	}
	User.findById(uid)
		.select("-email -password -friends")
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
	const UserB = req.params.id;
	if (!UserB.match(/^[0-9a-fA-F]{24}$/)) {
		res.status(422).json({ message: "User ID invalid" });
	}
	if (UserA.toString() === UserB.toString()) {
		res.status(422).json({ message: "Cannot add yourself" });
	}
	try {
		if (!(await User.findById(UserB))) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		const user2 = await User.findById(UserB).populate("friends");
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
			return res.status(200).json({ message: "Friend accepted" });
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
		if (!(await User.findById(UserB))) {
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
		const user = await User.findOne({ _id: req.userId })
			.select("directMessages friends")
			.populate("friends");
		const user2 = await User.findOne({ _id: uid }).select("directMessages");
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
