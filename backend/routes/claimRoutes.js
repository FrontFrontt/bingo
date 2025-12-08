// /backend/routes/claimRoutes.js
const express = require('express');
const { submitWinningClaim } = require('../controllers/cardController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// U-06: ส่งคำขอรับรางวัล
router.post('/win', protect, submitWinningClaim); 

module.exports = router;