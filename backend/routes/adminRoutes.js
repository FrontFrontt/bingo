// /backend/routes/adminRoutes.js
const express = require('express');
const {
    getDashboardSummary,
    createRound,
    listRounds,
    listAllUsers,
    listPendingTransactions,
    updateTransactionStatus,
    listPlayersInRound
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware'); // ใช้ protect และ admin
const router = express.Router();

// Route: GET /api/admin/dashboard-summary (A-02)
router.get('/dashboard-summary', protect, admin, getDashboardSummary);

// A-03: จัดการรอบเกม
router.route('/rounds')
    .post(protect, admin, createRound) // POST: สร้างรอบ
    .get(protect, admin, listRounds);   // GET: ดึงรายการรอบ

// A-03: ดูรายชื่อผู้เล่นในรอบเกม
router.get('/rounds/:round_id/players', protect, admin, listPlayersInRound);

// A-04: จัดการผู้ใช้
router.get('/users', protect, admin, listAllUsers); // GET: ดึงรายชื่อผู้ใช้

// A-05: อนุมัติธุรกรรม
router.get('/transactions/pending', protect, admin, listPendingTransactions); // GET: ดึงรายการที่รออนุมัติ
router.put('/transactions/:transaction_id/status', protect, admin, updateTransactionStatus); // PUT: อนุมัติ/ปฏิเสธ

module.exports = router;