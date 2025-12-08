// /backend/routes/authRoutes.js
const express = require('express');
const { login, register } = require('../controllers/authController'); // import register
const router = express.Router();

router.post('/login', login);
router.post('/register', register); // เพิ่ม Route สำหรับการสมัครสมาชิก

module.exports = router;