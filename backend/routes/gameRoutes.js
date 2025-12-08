// /backend/routes/gameRoutes.js
const express = require('express');
const { getGameRounds, createGameRound } = require('../controllers/gameController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

// U-01: ผู้ใช้ทุกคนดูได้
router.get('/', protect, getGameRounds);

// A-03: ต้องเป็น Admin เท่านั้น
router.post('/', protect, admin, createGameRound);

module.exports = router;