const express = require('express');
const voiceController = require('../controllers/voiceController');

const router = express.Router();

router.post('/speak', voiceController.speak);

module.exports = router;
