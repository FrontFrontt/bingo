// /backend/controllers/authController.js
const { executeQuery } = require('../config/db');
const bcrypt = require('bcryptjs'); // สำหรับเข้ารหัสรหัสผ่าน
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ฟังก์ชันสร้าง Token
const generateToken = (id, role) => {
    return jwt.sign({ user_id: id, role: role }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
};

// U-01: การลงทะเบียนผู้ใช้ใหม่ (New Function)
exports.register = async (req, res) => {
    const { username, password, full_name, phone_number } = req.body;

    // การตรวจสอบพื้นฐาน
    if (!username || !password) {
        return res.status(400).json({ message: 'ต้องระบุชื่อผู้ใช้และรหัสผ่าน' });
    }

    try {
        // 1. ตรวจสอบชื่อผู้ใช้ซ้ำ
        const existingUsers = await executeQuery('SELECT user_id FROM Users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ message: 'ชื่อผู้ใช้นี้มีผู้ลงทะเบียนแล้ว' });
        }

        // 2. เข้ารหัสรหัสผ่าน (Security Requirement)
        const salt = await bcrypt.genSalt(10);
        // const password_hash = await bcrypt.hash(password, salt);

        const password_hash = password;

        // 3. จัดเก็บข้อมูลผู้ใช้ใหม่ (role='user' โดยค่าเริ่มต้น)
        const query = `
            INSERT INTO Users (username, password_hash, full_name, phone_number, role)
            VALUES (?, ?, ?, ?, 'user')
        `;
        const result = await executeQuery(query, [username, password_hash, full_name, phone_number]);
        const newUserId = result.insertId;
        
        // 4. สร้าง Token สำหรับเข้าสู่ระบบทันที
        res.status(201).json({
            user_id: newUserId,
            username: username,
            role: 'user',
            message: 'ลงทะเบียนสำเร็จ',
            token: generateToken(newUserId, 'user'),
        });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ message: 'Server error ขณะลงทะเบียน' });
    }
};

// U-01 & A-01: การเข้าสู่ระบบ
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        const users = await executeQuery('SELECT * FROM Users WHERE username = ?', [username]);

        if (users.length === 0) {
            return res.status(401).json({ message: 'ชื่อผู้ใช้ไม่ถูกต้อง' });
        }

        const user = users[0];

        // ตรวจสอบรหัสผ่านที่เข้ารหัส (Security)
        // const isMatch = await bcrypt.compare(password, user.password_hash);

        // if (!isMatch) {
        //     return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        // }

        // เข้าสู่ระบบสำเร็จ
        res.json({
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            token: generateToken(user.user_id, user.role),
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};
