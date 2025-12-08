// /backend/controllers/cardController.js
const { executeQuery } = require('../config/db');

// U-04: สร้างและจัดเก็บตารางบิงโก
exports.createUserCard = async (req, res) => {
    const user_id = req.user.user_id; // ได้มาจาก authMiddleware
    const { roundId, cardNumbers } = req.body;

    if (!cardNumbers || cardNumbers.length !== 25 || new Set(cardNumbers).size !== 25) {
        return res.status(400).json({ message: 'ข้อมูลตารางไม่ถูกต้อง: ต้องมี 25 ตัวเลขที่ไม่ซ้ำกัน (4.1)' });
    }
    
    // แปลง array ให้เป็น JSON string ก่อนเก็บใน DB
    const cardNumbersJson = JSON.stringify(cardNumbers); 

    try {
        // ตรวจสอบว่าผู้ใช้มีสิทธิ์เล่นรอบนี้หรือไม่ (ต้องผ่านการฝากเงิน U-03)
        // ** (ต้องมี Logic ตรวจสอบธุรกรรมที่นี่) **

        // 1. ตรวจสอบว่าผู้ใช้สร้างตารางแล้วหรือยัง
        const existingCard = await executeQuery(
            'SELECT card_id FROM UserBingoCards WHERE user_id = ? AND round_id = ?', 
            [user_id, roundId]
        );

        if (existingCard.length > 0) {
            return res.status(400).json({ message: 'คุณได้สร้างตารางสำหรับรอบนี้ไปแล้ว' });
        }

        // 2. จัดเก็บตาราง (U-04 ข้อ 5)
        const result = await executeQuery(
            'INSERT INTO UserBingoCards (user_id, round_id, card_numbers) VALUES (?, ?, ?)',
            [user_id, roundId, cardNumbersJson]
        );

        res.status(201).json({ message: 'สร้างตารางบิงโกสำเร็จ', card_id: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'Error creating bingo card', error });
    }
};

// U-04: โหลดตารางของผู้เล่นสำหรับรอบนั้น
exports.getUserCardByRound = async (req, res) => {
    const user_id = req.user.user_id;
    const { roundId } = req.params;

    try {
        const cards = await executeQuery(
            `
            SELECT c.card_numbers, r.status AS round_status 
            FROM UserBingoCards c
            JOIN GameRounds r ON c.round_id = r.round_id
            WHERE c.user_id = ? AND c.round_id = ?
            `, 
            [user_id, roundId]
        );

        if (cards.length === 0) {
            return res.status(404).json({ message: 'ไม่พบตารางบิงโกสำหรับรอบนี้' });
        }
        
        // แปลง JSON string กลับเป็น Array ก่อนส่งกลับ
        const cardData = cards[0];
        cardData.card_numbers = JSON.parse(cardData.card_numbers); 
        
        res.json(cardData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user card', error });
    }
};

// U-06: ส่งคำขอรับรางวัล (Winning Claim)
exports.submitWinningClaim = async (req, res) => {
    const user_id = req.user.user_id;
    const { roundId } = req.body;

    try {
        // ** นี่คือจุดที่ต้องรัน Core Logic ตรวจสอบการชนะที่แม่นยำที่สุด **
        
        // 1. ตรวจสอบสถานะการบิงโกในตาราง
        const cards = await executeQuery(
            'SELECT * FROM UserBingoCards WHERE user_id = ? AND round_id = ?', 
            [user_id, roundId]
        );
        
        if (cards.length === 0) {
            return res.status(400).json({ message: 'ไม่พบตารางบิงโกสำหรับรอบนี้' });
        }

        // 2. อัปเดตสถานะการบิงโก (และรอ Admin อนุมัติ)
        await executeQuery(
            'UPDATE UserBingoCards SET is_winner = TRUE, winning_claim_status = "pending" WHERE user_id = ? AND round_id = ?', 
            [user_id, roundId]
        );

        // 3. สร้างรายการธุรกรรม (Transaction) เพื่อให้ Admin อนุมัติการจ่ายเงิน
        await executeQuery(
            `
            INSERT INTO Transactions (user_id, round_id, transaction_type, amount, status) 
            VALUES (?, ?, 'win', ?, 'pending')
            `,
            [user_id, roundId, 0.00] // เงินรางวัล 0.00 ก่อน (Admin จะกรอกยอดจริงเมื่ออนุมัติ)
        );

        res.json({ message: 'ส่งคำขอรับรางวัลสำเร็จ! โปรดรอผู้ดูแลระบบดำเนินการ' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting claim', error });
    }
};