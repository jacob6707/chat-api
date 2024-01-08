const User = require('../models/user');
const Channel = require('../models/channel');
const Message = require('../models/message');
const { Friend } = require('../models/friend');

const { validationResult } = require('express-validator');

exports.getChannel = (req, res, next) => {
  const cid = req.params.id;
  if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(422).json({ message: 'User ID invalid' });
  }
  Channel.findById(cid)
    .then((channel) => {
      if (!channel) {
        const error = new Error('Channel not found');
        error.statusCode = 404;
        throw error;
      }
      if (
        !channel.participants.find(
          (p) => p.toString() === req.userId.toString()
        )
      ) {
        const error = new Error('User is not a participant of the channel');
        error.statusCode = 403;
        throw error;
      }
      res.status(200).json(channel);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getChannelMessages = (req, res, next) => {
  const cid = req.params.id;
  if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
    res.status(422).json({ message: 'Channel ID invalid' });
  }
  Channel.findById(cid)
    .select('participants messages')
    .populate('messages')
    .then((channel) => {
      if (!channel) {
        const error = new Error('Channel not found');
        error.statusCode = 404;
        throw error;
      }
      if (
        !channel.participants.find(
          (p) => p.toString() === req.userId.toString()
        )
      ) {
        const error = new Error('User is not a participant of the channel');
        error.statusCode = 403;
        throw error;
      }
      res.status(200).json(channel.messages);
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.postChannel = async function (req, res, next) {
  const cid = req.params.id;
  try {
    if (!cid.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(422).json({ message: 'Channel ID invalid' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const error = new Error('Validation failed');
      error.statusCode = 422;
      error.data = errors.array();
      throw error;
    }
    const channel = await Channel.findById(cid);
    if (!channel) {
      const error = new Error('Channel not found');
      error.statusCode = 404;
      throw error;
    }
    if (
      !channel.participants.find((p) => p.toString() === req.userId.toString())
    ) {
      const error = new Error('User is not a participant of the channel');
      error.statusCode = 403;
      throw error;
    }
    if (channel.isDM) {
      const friendship = await Friend.findOne({
        requester: channel.participants[0],
        recipient: channel.participants[1],
      });
      if (!friendship) {
        const error = new Error('User is not friends with participant');
        error.statusCode = 403;
        throw error;
      }
    }
    const content = req.body.content;
    console.log(content);
    const message = new Message({
      channel: cid,
      author: req.userId,
      content: content,
    });
    await message.save();
    channel.messages.push(message);
    await channel.save();
    res.status(200).send(message);
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
