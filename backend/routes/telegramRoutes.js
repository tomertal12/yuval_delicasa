// routes/telegramRoutes.js
const express = require('express');
const router = express.Router();
const telegramController = require('../controllers/telegramController');

router.post('/webhook', telegramController.receiveUpdate);

router.post('/send', telegramController.sendMessage);

module.exports = router;
