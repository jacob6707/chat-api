const User = require('../models/user');
const Channel = require('../models/channel');

exports.getUser = (req, res, next) => {
  const uid = req.params.id;
  User.findById(uid)
    .select('-email -password -friends')
    .then((user) => {
      if (!user) {
        const error = new Error('User not found');
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

exports.addFriend = (req, res, next) => {
  const uid = req.params.id;
  res.status(404).json({ message: 'Not implemented' });
};

exports.removeFriend = (req, res, next) => {
  const uid = req.params.id;
  res.status(404).json({ message: 'Not implemented' });
};

exports.postMessage = async function (req, res, next) {
  const uid = req.params.id;
  try {
    if (!uid.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(422).json({ message: 'User ID invalid' });
    }
    const user = await User.findOne({ _id: req.userId }).select(
      'directMessages'
    );
    const user2 = await User.findOne({ _id: uid }).select('directMessages');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 403;
      throw error;
    }
    if (!user2) {
      const error = new Error('DM Participant not found');
      error.statusCode = 404;
      throw error;
    }
    let dm = user.directMessages.find(
      (_dm) => _dm.userId.toString() === uid.toString()
    );
    let status = 200;
    if (!dm) {
      const channel = new Channel({
        name: 'DM',
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
