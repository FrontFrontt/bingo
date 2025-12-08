// /backend/routes/userRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
    getProfile, 
    updateProfile,
    registerForRound, 
    getRoundLobby, 
    checkUserRegistration, 
    updateBingoCard,
    claimWin,
    getSharedGameState
} = require('../controllers/userController');

const router = express.Router();

// Route สำหรับดูและแก้ไขโปรไฟล์ (U-02)
router.route('/profile')
    .get(protect, getProfile)  // ดึงข้อมูล (GET)
    .put(protect, updateProfile); // แก้ไขข้อมูล (PUT)

// U-03: ซื้อตั๋ว/ลงทะเบียน Card
router.post('/rounds/:round_id/register', protect, registerForRound);

// U-03: ดึงข้อมูล Game Lobby
router.get('/rounds/:round_id/lobby', protect, getRoundLobby);

// U-03: ตรวจสอบสถานะการลงทะเบียน
router.get('/rounds/:round_id/registration-status', protect, checkUserRegistration);

// **U-04: อัปเดต Card Numbers หลังผู้ใช้กรอก**
router.put('/rounds/:round_id/card/:card_id', protect, updateBingoCard);

// Route สำหรับเคลมรางวัล (U-05)
router.post('/claim-win', protect, claimWin);

// U-06: ดึงสถานะเกมที่แชร์ (ตัวเลขที่ถูกเรียก)
router.get('/rounds/:round_id/game-state', protect, getSharedGameState);

module.exports = router;