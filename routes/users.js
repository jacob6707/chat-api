const express = require('express');
const { body } = require('express-validator');

const usersController = require('../controllers/users');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/:id', isAuth, usersController.getUser);

router.post('/:id/add', isAuth, usersController.addFriend);

router.delete('/:id/remove', isAuth, usersController.removeFriend);

router.post('/:id/message', isAuth, usersController.postMessage);

module.exports = router;
