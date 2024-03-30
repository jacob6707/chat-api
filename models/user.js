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
		},
		displayName: {
			type: String,
		},
		avatarUrl: {
			type: String,
			default: "/images/default.png",
		},
		status: String,
		about: String,
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
	},
	{ timestamps: true }
);

userSchema.pre("save", function (next) {
	if (!this.displayName) this.displayName = this.get("username");
	next();
});

module.exports = mongoose.model("User", userSchema);
