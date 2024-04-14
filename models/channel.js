const mongoose = require("mongoose");
const { Schema } = mongoose;

const channelSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		isDM: {
			type: Boolean,
			default: false,
		},
		messages: [
			{
				type: Schema.Types.ObjectId,
				ref: "Message",
			},
		],
		participants: [
			{
				type: Schema.Types.ObjectId,
				ref: "User",
			},
		],
		owner: {
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Channel", channelSchema);
