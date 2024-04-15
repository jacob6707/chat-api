const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
	{
		email: {
			type: String,
			required: true,
			unique: true,
		},
		username: {
			type: String,
			required: true,
			unique: true,
		},
		password: {
			type: String,
			required: true,
			select: false,
		},
		displayName: {
			type: String,
		},
		avatarUrl: {
			type: String,
			default: "",
		},
		status: {
			preferred: {
				type: String,
				default: "Online",
				select: false,
			},
			current: {
				type: String,
				default: "Offline",
			},
		},
		about: {
			type: String,
			default: "",
		},
		birthday: Date,
		friends: [
			{
				type: Schema.Types.ObjectId,
				ref: "Friend",
			},
		],
		directMessages: [
			{
				_id: false,
				userId: {
					type: Schema.Types.ObjectId,
					ref: "User",
				},
				channelId: {
					type: Schema.Types.ObjectId,
					ref: "Channel",
				},
			},
		],
		socketId: {
			type: String,
			default: "",
			select: false,
		},
	},
	{ timestamps: true }
);

userSchema.pre("save", function (next) {
	if (!this.displayName) this.displayName = this.get("username");
	next();
});

module.exports = mongoose.model("User", userSchema);
