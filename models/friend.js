const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendStatus = {
  NONE: 0,
  REQUESTED: 1,
  PENDING: 2,
  FRIENDS: 3,
};

const friendSchema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User' },
    recipient: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: Number,
      enums: Object.values(FriendStatus),
    },
  },
  { timestamps: true }
);

module.exports = {
  Friend: mongoose.model('Friend', friendSchema),
  FriendStatus: FriendStatus,
};
