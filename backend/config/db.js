// /backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config(); // ใช้ .env ในการเก็บข้อมูลสำคัญ

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bingo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // *สำคัญ*: ควรตั้งค่า preparedStatements เป็น false หากยังพบปัญหา ER_UNSUPPORTED_PS ในส่วนอื่น
    // preparedStatements: false
});

// ฟังก์ชันสำหรับเรียกใช้งาน Query
async function executeQuery(sql, params) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error("Database Query Error:", error);
        throw error;
    }
}

// *ฟังก์ชันใหม่*: สำหรับดึง Connection เพื่อใช้ Transaction
async function getConnection() {
    return await pool.getConnection();
}

module.exports = { executeQuery, getConnection };