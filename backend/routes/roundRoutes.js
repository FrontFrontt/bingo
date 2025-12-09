// /backend/routes/roundRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { listActiveRounds } = require('../controllers/roundController');
const { submitDeposit } = require('../controllers/depositController');
const router = express.Router();

// U-01: GET /api/rounds/active
router.get('/active', protect, listActiveRounds);

// U-03: POST /api/rounds/deposit (รับไฟล์สลิป)
router.post('/deposit', protect, upload.single('proof_image'), submitDeposit);

module.exports = router;