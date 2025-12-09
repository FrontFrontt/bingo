// /backend/middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');

// กำหนดที่เก็บไฟล์
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // ตรวจสอบให้แน่ใจว่าโฟลเดอร์ 'uploads' มีอยู่จริง
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        // ตั้งชื่อไฟล์: user_ID-timestamp.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const userIdentifier = req.user ? req.user.user_id : 'guest';
        cb(null, userIdentifier + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// กำหนดเงื่อนไขการอัปโหลด (เฉพาะรูปภาพ)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(null, false); // ไม่อนุญาตไฟล์อื่นที่ไม่ใช่รูปภาพ
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // จำกัดขนาดไฟล์ไม่เกิน 5MB
});

module.exports = upload; 