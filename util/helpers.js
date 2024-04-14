const jwt = require("jsonwebtoken");
const User = require("../models/user");

exports.getUserFromToken = async (token) => {
	try {
		const dToken = jwt.decode(token, { json: true });
		if (!dToken) {
			return null;
		}
		const uid = dToken.userId;
		const user = await User.findById(uid).select("password status");
		const secret = user.password;
		const decodedToken = jwt.verify(token, secret);
		if (!decodedToken) {
			return null;
		}
		return user;
	} catch (err) {
		console.log(err);
		return null;
	}
};
