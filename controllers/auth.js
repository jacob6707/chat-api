const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		const error = new Error("Validation failed");
		error.statusCode = 422;
		error.data = errors.array();
		throw error;
	}
	const email = req.body.email.toLowerCase();
	const username = req.body.username.toLowerCase();
	const password = req.body.password;

	User.countDocuments({ $or: [{ email: email }, { username: username }] })
		.then((count) => {
			if (count > 0) {
				const error = new Error("User already exists");
				error.statusCode = 409;
				throw error;
			}
		})
		.then(() => bcrypt.hash(password, 12))
		.then((hashedPassword) => {
			const user = new User({
				email: email,
				username: username,
				password: hashedPassword,
			});
			return user.save();
		})
		.then((result) => {
			res.sendStatus(201);
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

exports.login = async (req, res, next) => {
	const username = req.body.username.toLowerCase();
	const password = req.body.password;

	try {
		const user = await User.findOne({
			$or: [{ email: username }, { username: username }],
		})
			.select("+password")
			.populate("friends", "-updatedAt -__v")
			.populate("directMessages.userId", "displayName status about avatarUrl")
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
						options: { sort: { createdAt: -1 }, limit: 1 },
					},
				],
			});
		if (!user) {
			const error = new Error(`User ${username} does not exist`);
			error.statusCode = 401;
			throw error;
		}
		const { password: userPassword, ...userData } = user.toObject();
		const isEqual = await bcrypt.compare(password, userPassword);
		if (!isEqual) {
			const error = new Error(`Password does not match.`);
			error.statusCode = 401;
			throw error;
		}
		const token = jwt.sign(
			{
				userId: userData._id,
			},
			userPassword,
			{
				noTimestamp: true,
			}
		);
		res.status(200).json({ user: userData, token: token });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};

exports.testToken = (req, res, next) => {
	const authHeader = req.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer")) {
		return res.status(401).json({ message: "Not authenticated" });
	}
	const token = authHeader.split(" ")[1];
	const dToken = jwt.decode(token, { json: true });
	if (!dToken) {
		return res.status(401).json({ message: "Not authenticated" });
	}
	const uid = dToken.userId;
	User.findById(uid)
		.select("password")
		.then((user) => {
			if (!user) {
				const error = new Error("Bearer of token not found");
				error.statusCode = 403;
				throw error;
			}
			return user.password;
		})
		.then((secret) => {
			let decodedToken;
			try {
				decodedToken = jwt.verify(token, secret);
			} catch (err) {
				err.statusCode = 500;
				throw err;
			}
			if (!decodedToken) {
				const error = new Error("Not authenticated");
				error.statusCode = 401;
				throw error;
			}
			req.userId = decodedToken.userId;
			res
				.status(200)
				.json({ message: "Token ok", userId: decodedToken.userId });
		})
		.catch((err) => {
			if (!err.statusCode) {
				err.statusCode = 500;
			}
			next(err);
		});
};

exports.updatePassword = async function (req, res, next) {
	const { oldPassword, newPassword } = req.body;
	try {
		const user = await User.findById(req.userId).select("+password");
		if (!user) {
			const error = new Error("User not found");
			error.statusCode = 404;
			throw error;
		}
		const isEqual = await bcrypt.compare(oldPassword, user.password);
		if (!isEqual) {
			const error = new Error("Incorrect password");
			error.statusCode = 401;
			throw error;
		}
		const hashedPassword = await bcrypt.hash(newPassword, 12);
		user.password = hashedPassword;
		await user.save();
		const token = jwt.sign(
			{
				userId: req.userId,
			},
			hashedPassword,
			{
				noTimestamp: true,
			}
		);
		res.status(200).json({ message: "Password updated", token: token });
	} catch (err) {
		if (!err.statusCode) {
			err.statusCode = 500;
		}
		next(err);
	}
};
