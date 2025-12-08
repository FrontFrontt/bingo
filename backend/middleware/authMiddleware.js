// /backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware สำหรับตรวจสอบ Token
exports.protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'ไม่ได้รับอนุญาตให้เข้าถึง: ไม่มี Token' });
    }

    try {
        // ตรวจสอบและถอดรหัส Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // เก็บ user_id และ role ไว้ใน req.user
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือไม่หมดอายุ' });
    }
};

// Middleware สำหรับตรวจสอบสิทธิ์ Admin (A-01)
exports.admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'ไมได้รับอนุญาต: ต้องมีสิทธิ์ผู้ดูแลระบบ' });
    }
};