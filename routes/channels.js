const express = require('express');
const { body } = require('express-validator');

const channelsController = require('../controllers/channels');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/', isAuth);

router.get('/:id', isAuth, channelsController.getChannel);

router.get('/:id/messages', isAuth, channelsController.getChannelMessages);

router.post(
  '/:id',
  isAuth,
  [body('content').notEmpty()],
  channelsController.postChannel
);

module.exports = router;
