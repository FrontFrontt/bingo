// /backend/controllers/adminController.js
const { executeQuery, getConnection } = require('../config/db');

// Helper Function: คำนวณวันที่เริ่มต้นของช่วงเวลา
const getDateRange = (filter) => {
    const now = new Date();
    let startDate = new Date(now); // Clone current date

    if (filter === 'day') {
        // 24 ชั่วโมงย้อนหลัง
        startDate.setDate(now.getDate() - 1);
    } else if (filter === 'week') {
        // 7 วันย้อนหลัง
        startDate.setDate(now.getDate() - 7);
    } else if (filter === 'month') {
        // 30 วันย้อนหลัง
        startDate.setDate(now.getDate() - 30);
    } else {
        // Default: 7 วันย้อนหลัง
        startDate.setDate(now.getDate() - 7);
    }

    // 🚨 FIX: ใช้ Logic สร้าง Date String ใน Format YYYY-MM-DD HH:MM:SS ที่ปลอดภัย
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, '0');
    const day = String(startDate.getDate()).padStart(2, '0');
    const hours = String(startDate.getHours()).padStart(2, '0');
    const minutes = String(startDate.getMinutes()).padStart(2, '0');
    const seconds = String(startDate.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// A-02: ดึงข้อมูลสรุป Dashboard
exports.getDashboardSummary = async (req, res) => {
    // 🚨 MODIFICATION: รับ startDate และ endDate จาก Query Parameter
    const { startDate, endDate } = req.query;

    // ตรวจสอบความถูกต้องของช่วงวันที่
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'กรุณาระบุ startDate และ endDate สำหรับการดึงข้อมูล' });
    }

    // กำหนดช่วงเวลาสำหรับ SQL (YYYY-MM-DD 00:00:00 ถึง YYYY-MM-DD 23:59:59)
    const sqlStartDate = `${startDate} 00:00:00`;
    const sqlEndDate = `${endDate} 23:59:59`;

    try {
        // ... (1. สรุปข้อมูลตัวเลข - Queries เหล่านี้ไม่ใช้ Date Filter แต่ยังคงอยู่) ...

        // 1.1 จำนวนผู้ใช้ทั้งหมด (role = 'user')
        const [userCountResult] = await executeQuery("SELECT COUNT(user_id) AS totalUsers FROM Users WHERE role = 'user'");
        const totalUsers = userCountResult.totalUsers;

        // 1.2 รายรับ, รายจ่าย, และคำขอค้างทั้งหมด (ไม่ใช้ Date Filter ใน Summary)
        const financialSummaryQuery = `
            SELECT 
                SUM(CASE WHEN transaction_type = 'deposit' AND status = 'approved' THEN amount ELSE 0 END) AS totalDepositRevenue,
                SUM(CASE WHEN transaction_type = 'win' AND status = 'approved' THEN amount ELSE 0 END) AS totalPayoutExpense,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pendingTransactions
            FROM Transactions
        `;
        const [financialSummaryResult] = await executeQuery(financialSummaryQuery);

        const totalDepositRevenue = financialSummaryResult.totalDepositRevenue || 0;
        const totalPayoutExpense = financialSummaryResult.totalPayoutExpense || 0;
        const pendingTransactions = financialSummaryResult.pendingTransactions || 0;


        // 2. ข้อมูลสำหรับกราฟ (Graph Data) - ใช้ Date Filter

        // 2.1 ดึงข้อมูลรายรับ (Deposit approved)
        const revenueQuery = `
            SELECT 
                DATE(created_at) AS date,
                SUM(amount) AS revenue
            FROM Transactions
            WHERE transaction_type = 'deposit' 
              AND status = 'approved' 
              AND created_at BETWEEN ? AND ?  -- 🚨 ใช้ BETWEEN
            GROUP BY DATE(created_at)
        `;
        const revenueData = await executeQuery(revenueQuery, [sqlStartDate, sqlEndDate]);

        // 2.2 ดึงข้อมูลผู้เข้าเล่น (นับจำนวน Card ที่ถูกสร้างในรอบนั้น)
        const participantQuery = `
            SELECT
                DATE(created_at) AS date,
                COUNT(card_id) AS participants
            FROM UserBingoCards
            WHERE created_at BETWEEN ? AND ? -- 🚨 ใช้ BETWEEN
            GROUP BY DATE(created_at)
        `;
        const participantData = await executeQuery(participantQuery, [sqlStartDate, sqlEndDate]);

        // 3. รวมข้อมูลกราฟ (Merge Data - Logic เดิม)
        const mergedData = new Map();

        revenueData.forEach(item => mergedData.set(item.date, {
            date: item.date,
            revenue: parseFloat(item.revenue),
            participants: 0
        }));

        participantData.forEach(item => {
            const existing = mergedData.get(item.date);
            if (existing) {
                existing.participants = parseInt(item.participants);
            } else {
                mergedData.set(item.date, {
                    date: item.date,
                    revenue: 0,
                    participants: parseInt(item.participants)
                });
            }
        });

        const graphData = Array.from(mergedData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));


        // 4. ส่งผลลัพธ์กลับ
        res.json({
            summary: {
                totalUsers: parseInt(totalUsers),
                totalDepositRevenue: parseFloat(totalDepositRevenue),
                totalPayoutExpense: parseFloat(totalPayoutExpense),
                pendingTransactions: parseInt(pendingTransactions),
            },
            graphData: graphData,
        });

    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการดึงข้อมูล Dashboard' });
    }
};

// A-03: ดูรายชื่อผู้เล่นในรอบเกม (สำหรับ Admin)
exports.listPlayersInRound = async (req, res) => {
    const { round_id } = req.params;

    try {
        // ดึงข้อมูลผู้เล่นที่ได้สร้างตารางบิงโกในรอบนี้แล้ว
        // (ซึ่งหมายความว่า Transaction deposit/bet ต้องถูกอนุมัติแล้ว และมีการสร้างตาราง)
        const query = `
            SELECT 
                u.username, u.full_name, c.card_numbers, c.is_winner, c.win_amount
            FROM UserBingoCards c
            JOIN Users u ON c.user_id = u.user_id
            WHERE c.round_id = ?
            ORDER BY u.username ASC
        `;
        const players = await executeQuery(query, [round_id]);
        res.json(players);
    } catch (error) {
        console.error(`Error listing players for round ${round_id}:`, error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายชื่อผู้เล่น' });
    }
};

// A-03: สร้างรอบเกมใหม่ (ปรับปรุงสำหรับ play_time)
exports.createRound = async (req, res) => {
    // start_time = Reg Start, end_time = Reg End, play_time = Game Start
    const { title, start_time, end_time, play_time, ticket_price, prize_amount } = req.body;

    // ตรวจสอบข้อมูลให้ครบถ้วน (รวม play_time)
    if (!title || !start_time || !end_time || !play_time || !ticket_price || !prize_amount) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลรอบเกมให้ครบถ้วน: ชื่อ, เวลาเริ่มลงทะเบียน, เวลาสิ้นสุดลงทะเบียน, เวลาเริ่มเล่นเกม, ราคาตั๋ว, รางวัล' });
    }

    try {
        // อัปเดต Query เพื่อบันทึก play_time
        const query = `
            INSERT INTO gameround (title, start_time, end_time, play_time, ticket_price, prize_amount, is_active)
            VALUES (?, ?, ?, ?, ?, ?, TRUE)
        `;
        const result = await executeQuery(query, [title, start_time, end_time, play_time, ticket_price, prize_amount]);
        res.status(201).json({ message: 'สร้างรอบเกมใหม่สำเร็จ', round_id: result.insertId });
    } catch (error) {
        console.error("Error creating game round:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรอบเกม' });
    }
};

// A-03: ดึงรายการรอบ (ต้องเพิ่มฟังก์ชันนี้เข้าไปในไฟล์ adminController.js ของคุณ)
exports.listRounds = async (req, res) => {
    try {
        const query = `
            SELECT 
                gr.round_id, 
                gr.title, 
                gr.start_time, 
                gr.end_time, 
                gr.play_time, -- <<-- ดึงคอลัมน์ใหม่
                gr.ticket_price, 
                gr.prize_amount, 
                gr.is_active,
                gr.winning_number,
                gr.created_at, 
                COUNT(c.card_id) AS participant_count
            FROM gameround gr
            LEFT JOIN userbingocards c ON gr.round_id = c.round_id
            GROUP BY gr.round_id
            ORDER BY gr.created_at DESC
        `;

        const rounds = await executeQuery(query);

        res.json(rounds);
    } catch (error) {
        console.error("Error listing rounds for admin:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการรอบเกม' });
    }
};

// A-04: จัดการผู้ใช้
exports.listAllUsers = async (req, res) => {
    // Logic: ดึงข้อมูลผู้ใช้ทั้งหมด (ยกเว้น Admin)
    try {
        const users = await executeQuery("SELECT user_id, username, full_name, phone_number, created_at FROM Users WHERE role = 'user' ORDER BY created_at DESC");
        res.json(users);
    } catch (error) {
        console.error("Error listing users:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการผู้ใช้' });
    }
};

// A-05: อนุมัติธุรกรรม
exports.listPendingTransactions = async (req, res) => {
    // Logic: ดึงรายการธุรกรรมที่รออนุมัติ (status = 'pending')
    try {
        const query = `
            SELECT t.*, u.username, u.full_name
            FROM Transactions t
            JOIN Users u ON t.user_id = u.user_id
            WHERE t.status = 'pending'
            ORDER BY t.created_at ASC
        `;
        const pendingTxs = await executeQuery(query);
        res.json(pendingTxs);
    } catch (error) {
        console.error("Error listing pending transactions:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการธุรกรรมที่รออนุมัติ' });
    }
};

exports.updateTransactionStatus = async (req, res) => {
    const { transaction_id } = req.params;
    const { status } = req.body;
    const admin_id = req.user.user_id;

    if (status !== 'approved' && status !== 'rejected') {
        return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
    }

    let connection; // เปลี่ยนชื่อจาก connection เป็น connection เพื่อให้สื่อถึง object connection

    try {
        connection = await getConnection(); // 1. ดึง Connection จาก Pool
        await connection.beginTransaction(); // 2. เริ่ม Transaction (ใช้เมธอดของ Connection)

        // 3. ดึงข้อมูลธุรกรรม (ใช้ connection.execute แทน executeQuery)
        const [transactionRows] = await connection.execute("SELECT * FROM Transactions WHERE transaction_id = ? AND status = 'pending'", [transaction_id]);

        if (transactionRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบธุรกรรมที่รออนุมัติหรือได้รับการจัดการแล้ว' });
        }
        const transaction = transactionRows[0];

        // 4. อัปเดตสถานะธุรกรรม
        await connection.execute(
            "UPDATE Transactions SET status = ?, processed_by = ?, processed_at = NOW() WHERE transaction_id = ?",
            [status, admin_id, transaction_id]
        );

        // 5. ปรับยอดเงิน (เฉพาะเมื่อ 'approved')
        if (status === 'approved') {
            const amount_to_change = transaction.transaction_type === 'deposit' ? transaction.amount : -transaction.amount;

            // ปรับยอดเงินในตาราง Users
            await connection.execute(
                "UPDATE Users SET wallet_balance = wallet_balance + ? WHERE user_id = ?",
                [amount_to_change, transaction.user_id]
            );
        }

        await connection.commit(); // 6. Commit Transaction
        res.json({ message: `ทำรายการธุรกรรม ID ${transaction_id} สำเร็จ: สถานะ ${status}` });

    } catch (error) {
        if (connection) {
            await connection.rollback(); // 7. Rollback หากเกิดข้อผิดพลาด
        }
        console.error("Error updating transaction status:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจัดการธุรกรรม' });
    } finally {
        if (connection) connection.release(); // 8. ปล่อย Connection คืนสู่ Pool เสมอ
    }
};
