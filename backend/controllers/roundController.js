// /backend/controllers/roundController.js
const { executeQuery } = require('../config/db');

// U-01: ดึงรายการรอบเกมที่เปิดใช้งานอยู่
exports.listActiveRounds = async (req, res) => {
    try {
        const query = `
            SELECT 
                gr.round_id, 
                gr.title, 
                gr.start_time, 
                gr.end_time, 
                gr.play_time, 
                gr.ticket_price, 
                gr.prize_amount, 
                gr.is_active,
                gr.created_at, 
                COUNT(c.card_id) AS participant_count,
                -- **เพิ่ม Logic คำนวณวันที่เล่นจริง:** (end_time + 1 วัน)
                DATE_ADD(gr.end_time, INTERVAL 1 DAY) AS game_start_time
            FROM gameround gr
            LEFT JOIN userbingocards c ON gr.round_id = c.round_id
            WHERE gr.is_active = TRUE 
            GROUP BY gr.round_id
            ORDER BY gr.created_at DESC
        `;
        const activeRounds = await executeQuery(query);
        res.json(activeRounds);
    } catch (error) {
        console.error("Error fetching active rounds:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายการรอบเกม' });
    }
};