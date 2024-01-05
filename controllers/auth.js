const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const username = req.body.username;
  const password = req.body.password;

  bcrypt
    .hash(password, 12)
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
  const username = req.body.username;
  const password = req.body.password;

  try {
    const user = await User.findOne({ username: username });
    if (!user) {
      const error = new Error(`Failed to find user with username ${username}.`);
      error.statusCode(401);
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error(`Password does not match.`);
      error.statusCode(401);
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user.id,
      },
      user.password,
      {
        noTimestamp: true,
      }
    );
    res.status(200).json({ userId: user.id, token: token });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.testToken = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }
  const token = authHeader.split(' ')[1];
  const uid = jwt.decode(token, { json: true }).userId;
  User.findById(uid)
    .then((user) => {
      if (!user) {
        const error = new Error('Bearer of token not found');
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
        const error = new Error('Not authenticated');
        error.statusCode = 401;
        throw error;
      }
      req.userId = decodedToken.userId;
      res
        .status(200)
        .json({ message: 'Token ok', userId: decodedToken.userId });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
