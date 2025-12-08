// /controllers/transactionController.js
const { executeQuery } = require('../config/db');

// A-05: ดูรายการคำขอทั้งหมดที่ต้องอนุมัติ
exports.getPendingTransactions = async (req, res) => {
    try {
        const query = `
            SELECT t.*, u.username 
            FROM Transactions t
            JOIN Users u ON t.user_id = u.user_id
            WHERE t.status = 'pending'
            ORDER BY t.created_at ASC
        `;
        const pendingTxs = await executeQuery(query);
        res.json(pendingTxs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching pending transactions', error });
    }
};

// A-05: ดำเนินการอนุมัติ
exports.approveTransaction = async (req, res) => {
    const { transactionId, adminAction } = req.body; // adminAction: 'approve' or 'reject'

    try {
        // 1. อัปเดตสถานะธุรกรรม
        const updateTxQuery = `
            UPDATE Transactions 
            SET status = ?, approved_at = CURRENT_TIMESTAMP 
            WHERE transaction_id = ? AND status = 'pending'
        `;
        await executeQuery(updateTxQuery, [adminAction, transactionId]);

        // 2. หากอนุมัติ และเป็นประเภทฝากเงิน ('deposit') ต้องให้สิทธิ์เล่นเกม (U-03)
        if (adminAction === 'approved') {
            const txQuery = `SELECT * FROM Transactions WHERE transaction_id = ?`;
            const [tx] = await executeQuery(txQuery, [transactionId]);

            if (tx.transaction_type === 'deposit') {
                // Logic เพื่อให้สิทธิ์เล่นในรอบเกมนั้น หรือเพิ่มยอดเงินใน Wallet
                // (ในตัวอย่างนี้ใช้แบบให้สิทธิ์เล่นต่อรอบ)
                
                // ตัวอย่าง: อัปเดตสถานะการเข้าร่วมใน UserBingoCards
                // ... (Logic for updating UserBingoCards or user's balance)
                
                // **หมายเหตุ**: ในระบบจริงควรมีตาราง Wallet/Balance เพื่อเพิ่ม/ลดเงินจริง
            } else if (tx.transaction_type === 'withdrawal') {
                // Logic: Admin ยืนยันว่าได้ทำการโอนเงินรางวัลจริงแล้ว (U-06)
                // ...
            }
        }
        
        res.json({ message: `Transaction ${transactionId} ${adminAction} successfully.` });
    } catch (error) {
        res.status(500).json({ message: 'Error processing transaction approval', error });
    }
};