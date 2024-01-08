const mongoose = require('mongoose');
const { Schema } = mongoose;

const channelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Channel', channelSchema);
