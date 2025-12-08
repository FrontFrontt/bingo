// /backend/routes/cardRoutes.js
const express = require('express');
const { createUserCard, getUserCardByRound } = require('../controllers/cardController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// U-04: สร้างตาราง
router.post('/create', protect, createUserCard); 

// U-04: โหลดตาราง
router.get('/:roundId/my-card', protect, getUserCardByRound); 

module.exports = router;