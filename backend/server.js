// /backend/server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

// นำเข้า Routes
const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const cardRoutes = require('./routes/cardRoutes');
const claimRoutes = require('./routes/claimRoutes');

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const roundRoutes = require('./routes/roundRoutes');


// นำเข้า DB
const { executeQuery } = require('./config/db'); 

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "http://localhost:3000", // อนุญาตเฉพาะ Next.js Frontend
        methods: ["GET", "POST"],
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// 1. Define API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/claims', claimRoutes);

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rounds', roundRoutes);

// 2. Real-time Bingo Logic (Core Logic)
// ... (Logic การสุ่มเลข startBingoDrawing และ DrawnNumbers State จากตัวอย่างเดิม) ...
let isGameRunning = false;
let drawnNumbers = [];
let currentRoundId = null;

io.on('connection', (socket) => {
    // ผู้ใช้เข้าร่วมห้องเกมตาม roundId
    socket.on('join_round', (roundId) => {
        socket.join(`round-${roundId}`);
        // ส่งสถานะเกมปัจจุบันไปให้ผู้เล่นที่เพิ่งเชื่อมต่อ
        socket.emit('current_game_state', { isGameRunning, drawnNumbers });
        console.log(`User ${socket.id} joined round-${roundId}`);
    });
    
    socket.on('leave_round', (roundId) => {
        socket.leave(`round-${roundId}`);
    });

    // ... (omitted disconnect logic) ...
});

// ฟังก์ชันสำหรับสุ่มเลขและ Broadcast ไปยังทุกคน
async function startBingoDrawing(roundId) {
    if (isGameRunning) return;

    isGameRunning = true;
    currentRoundId = roundId;
    drawnNumbers = [];

    const interval = setInterval(async () => {
        // ... (Logic สุ่มเลขและอัปเดต drawnNumbers) ...
        let newNumber = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0'); // Placeholder
        drawnNumbers.push(newNumber);
        
        // Broadcast ไปยังผู้เล่นในห้องเกมนั้นเท่านั้น
        io.to(`round-${currentRoundId}`).emit('new_number_drawn', { number: newNumber, drawnNumbers });

        // ** (ต้องมี Logic ตรวจสอบผู้ชนะ/อัปเดต DB ที่นี่) **
        // ...

        if (drawnNumbers.length >= 99) { 
            clearInterval(interval);
            isGameRunning = false;
            io.to(`round-${currentRoundId}`).emit('game_ended', { roundId });
        }
    }, 3000); 
}

// 1. Static File Serving (สำหรับรูปภาพสลิป)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ** ตัวอย่าง: หาก Admin เรียก API เพื่อเริ่มเกม (A-03) **
// startBingoDrawing(123); 

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});