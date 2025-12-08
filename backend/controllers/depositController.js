// /backend/controllers/depositController.js
const { executeQuery } = require('../config/db');

// U-03: ผู้ใช้ส่งคำขอฝากเงิน/ซื้อตั๋ว
exports.submitDeposit = async (req, res) => {
    const user_id = req.user.user_id; // ได้จาก Token
    const { round_id, amount } = req.body;

    // ตรวจสอบว่ามีไฟล์สลิปหรือไม่ (Multer ควรจัดการไฟล์แล้ว)
    const proof_image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!round_id || !amount || !proof_image_url) {
        // หากไม่มีไฟล์ Multer จะไม่สร้าง req.file หรือ amount ขาด
        return res.status(400).json({ message: 'กรุณาระบุรอบเกม จำนวนเงิน และแนบหลักฐานการโอน (สลิป)' });
    }

    try {
        // 1. บันทึกคำขอธุรกรรม (Transaction) สถานะ 'pending'
        const query = `
            INSERT INTO Transactions 
            (user_id, round_id, transaction_type, amount, proof_image_url, status)
            VALUES (?, ?, 'deposit', ?, ?, 'pending')
        `;
        const result = await executeQuery(query, [user_id, round_id, amount, proof_image_url]);

        res.status(201).json({
            message: 'ส่งคำขอฝากเงินสำเร็จแล้ว กรุณารอ Admin ตรวจสอบและอนุมัติ',
            transaction_id: result.insertId
        });

    } catch (error) {
        console.error("Deposit submission error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งคำขอ' });
    }
};