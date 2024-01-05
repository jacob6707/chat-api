const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = (req, res, next) => {
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
      next();
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
