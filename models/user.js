const mongoose = require('mongoose');
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
      default: this.username,
    },
    avatarUrl: {
      type: String,
      default: '/images/default.png',
    },
    status: String,
    about: String,
    birthday: Date,
    friends: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Friend',
      },
    ],
    directMessages: [
      {
        _id: false,
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
        channelId: {
          type: Schema.Types.ObjectId,
          ref: 'Channel',
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
