// /backend/controllers/gameController.js
const { executeQuery } = require('../config/db');

// U-01 ข้อ 1: แสดงรอบเกมทั้งหมด
exports.getGameRounds = async (req, res) => {
    try {
        // ดึงรอบเกมที่สถานะยังไม่เสร็จสิ้น หรือกำลังเล่น
        const rounds = await executeQuery(
            "SELECT * FROM GameRounds WHERE status IN ('pending', 'active') ORDER BY start_time ASC"
        );
        res.json(rounds);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching game rounds', error });
    }
};

// A-03: สร้างรอบเกม (Admin Only)
exports.createGameRound = async (req, res) => {
    const { round_name, bet_amount, start_time, end_time } = req.body;

    // ตรวจสอบสิทธิ์ Admin จะถูกทำใน Route

    try {
        const query = `
            INSERT INTO GameRounds (round_name, bet_amount, start_time, end_time, status)
            VALUES (?, ?, ?, ?, 'pending')
        `;
        const result = await executeQuery(query, [round_name, bet_amount, start_time, end_time]);
        res.status(201).json({ message: 'Game round created successfully', round_id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating game round', error });
    }
};