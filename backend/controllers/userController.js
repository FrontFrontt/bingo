// /backend/controllers/userController.js
const { executeQuery, getConnection } = require('../config/db');
const BINGO_SIZE = 25; // ตาราง 5x5

// U-02: ดึงข้อมูลส่วนตัวของผู้ใช้ที่เข้าสู่ระบบ
exports.getProfile = async (req, res) => {
    // req.user ถูกตั้งค่าโดย authMiddleware.protect() และมี user_id
    const user_id = req.user.user_id;

    try {
        // 🚨 FIX: เพิ่ม wallet_balance ในการ SELECT
        const query = `
            SELECT user_id, username, full_name, phone_number, bank_account_info, role, wallet_balance
            FROM Users 
            WHERE user_id = ?
        `;
        const users = await executeQuery(query, [user_id]);

        if (users.length === 0) {
            // โอกาสเกิดน้อยเพราะ Token ควรมาจาก User ที่มีอยู่
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลโปรไฟล์' });
    }
};

// U-02: อัปเดตข้อมูลส่วนตัว
exports.updateProfile = async (req, res) => {
    const user_id = req.user.user_id; // ได้จาก Token
    const { full_name, phone_number, bank_account_info } = req.body;

    if (!full_name) {
        return res.status(400).json({ message: 'กรุณากรอกชื่อ-นามสกุล' });
    }

    try {
        const query = `
            UPDATE Users 
            SET full_name = ?, phone_number = ?, bank_account_info = ?
            WHERE user_id = ?
        `;
        await executeQuery(query, [full_name, phone_number, bank_account_info, user_id]);

        res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });

    } catch (error) {
        console.error("Error updating user profile:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' });
    }
};

// U-03: ตรวจสอบว่าผู้ใช้ลงทะเบียนรอบนี้แล้วหรือยัง
exports.checkUserRegistration = async (req, res) => {
    const user_id = req.user.user_id;
    const { round_id } = req.params;

    try {
        // แก้ไข: ลบ [] ออก
        const cardRows = await executeQuery("SELECT card_id FROM UserBingoCards WHERE user_id = ? AND round_id = ?", [user_id, round_id]);

        // ถูกต้อง: cardRows เป็น Array ที่ถูกต้อง
        const isRegistered = cardRows.length > 0;

        res.json({
            isRegistered: isRegistered,
            cardId: isRegistered ? cardRows[0].card_id : null
        });

    } catch (error) {
        console.error("Registration check error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ' });
    }
};

// U-03: การซื้อตั๋ว/ลงทะเบียน Card
exports.registerForRound = async (req, res) => {
    const user_id = req.user.user_id;
    const { round_id } = req.params;

    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // 1. ตรวจสอบว่าลงทะเบียนแล้วหรือยัง
        const [existingCard] = await connection.execute("SELECT card_id FROM UserBingoCards WHERE user_id = ? AND round_id = ?", [user_id, round_id]);
        if (existingCard.length > 0) {
            await connection.commit();
            return res.json({ message: 'คุณลงทะเบียนรอบนี้แล้ว', card_id: existingCard[0].card_id });
        }

        // 2. ดึงข้อมูลรอบเกมและยอดเงินผู้ใช้
        const [roundRows] = await connection.execute("SELECT title, ticket_price FROM gameround WHERE round_id = ?", [round_id]);
        const [userRows] = await connection.execute("SELECT wallet_balance FROM Users WHERE user_id = ?", [user_id]);

        if (roundRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบรอบเกม' });
        }
        if (userRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ใช้' });
        }

        const ticketPrice = roundRows[0].ticket_price;
        const currentBalance = userRows[0].wallet_balance;

        if (currentBalance < ticketPrice) {
            await connection.rollback();
            return res.status(400).json({ message: `ยอดเงินไม่เพียงพอ ต้องมี ${ticketPrice} บาท` });
        }

        // 3. ตัดเงินจาก Wallet (U-03)
        await connection.execute("UPDATE Users SET wallet_balance = wallet_balance - ? WHERE user_id = ?", [ticketPrice, user_id]);

        // 4. สร้าง Transaction 'bet' (เดิมพัน)
        const transactionQuery = `
            INSERT INTO Transactions 
            (user_id, round_id, transaction_type, amount, status)
            VALUES (?, ?, 'bet', ?, 'approved')
        `;
        await connection.execute(transactionQuery, [user_id, round_id, ticketPrice]);

        // 5. สร้างตารางบิงโกสำหรับผู้เล่น (U-04) - ***กำหนด winning_claim_status เป็น NULL/ว่าง***
        const cardQuery = `
            INSERT INTO UserBingoCards 
            (user_id, round_id, card_numbers, winning_claim_status) 
            VALUES (?, ?, NULL, NULL) -- 🚨 FIX: เปลี่ยนค่าเริ่มต้นเป็น NULL
        `;
        const [cardResult] = await connection.execute(cardQuery, [user_id, round_id]);

        await connection.commit();
        res.status(201).json({
            message: 'ซื้อตั๋วและลงทะเบียนสำเร็จ! โปรดเข้าสู่ Lobby เพื่อสร้างตารางบิงโก',
            card_id: cardResult.insertId,
            card_numbers: null // ส่งค่าว่างกลับไป
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Round registration error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน' });
    } finally {
        if (connection) connection.release();
    }
};

// U-03: ดึงข้อมูล Game Lobby
exports.getRoundLobby = async (req, res) => {
    const user_id = req.user.user_id;
    const { round_id } = req.params;

    try {
        // 1. ดึงข้อมูลรอบเกม (GameRound) + คำนวณ game_start_time
        const query = `
            SELECT 
                gr.*, 
                DATE_ADD(gr.end_time, INTERVAL 1 DAY) AS game_start_time
            FROM gameround gr
            WHERE gr.round_id = ?
        `;
        const roundRows = await executeQuery(
            "SELECT *, play_time FROM gameround WHERE round_id = ?",
            [round_id]
        );

        if (roundRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบรอบเกม' });
        }
        const gameRound = roundRows[0];

        // 2. ดึง Card ของผู้ใช้ปัจจุบัน
        // แก้ไข: ลบ [] ออก
        const myCardRows = await executeQuery("SELECT card_id, card_numbers FROM UserBingoCards WHERE user_id = ? AND round_id = ?", [user_id, round_id]);

        if (myCardRows.length === 0) { // ถูกต้องแล้ว เพราะ myCardRows คือ Array
            // หากไม่มี Card แสดงว่ายังไม่ได้ลงทะเบียน
            return res.status(400).json({ message: 'คุณยังไม่ได้ลงทะเบียนรอบเกมนี้' });
        }
        const myCard = myCardRows[0];

        // 3. ดึงรายชื่อผู้เล่นทั้งหมดที่ลงทะเบียนแล้ว
        const playersQuery = `
            SELECT u.username, u.full_name, c.card_id
            FROM UserBingoCards c
            JOIN Users u ON c.user_id = u.user_id
            WHERE c.round_id = ?
        `;
        const allPlayers = await executeQuery(playersQuery, [round_id]);

        // ส่งข้อมูลกลับไป
        res.json({
            game: gameRound,
            myCard: myCard,
            players: allPlayers,
        });

    } catch (error) {
        console.error("Error fetching round lobby data:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล Lobby' });
    }
};

// U-04: อัปเดต Card Numbers หลังผู้ใช้กรอก (ใช้สำหรับหน้า card-setup.js)
exports.updateBingoCard = async (req, res) => {
    const { card_id } = req.params;
    const user_id = req.user.user_id; // ได้จาก Token
    const { cardNumbers } = req.body; // รับ JSON string ของ Card Numbers

    if (!cardNumbers) {
        return res.status(400).json({ message: 'ไม่พบข้อมูลตารางบิงโก' });
    }

    try {
        // ตรวจสอบความถูกต้อง: ตรวจสอบว่า Card นี้เป็นของผู้ใช้ที่กำลังเข้าสู่ระบบและยังไม่เคยถูกบันทึก
        const cardRows = await executeQuery("SELECT card_numbers FROM UserBingoCards WHERE card_id = ? AND user_id = ?", [card_id, user_id]);

        if (cardRows.length === 0) {
            return res.status(404).json({ message: 'ไม่พบตารางบิงโกหรือตารางนี้ไม่ใช่ของคุณ' });
        }

        // ตรวจสอบว่า Card ถูกบันทึกแล้วหรือไม่ (card_numbers เป็น null ในตอนแรก)
        if (cardRows[0].card_numbers !== null && cardRows[0].card_numbers !== '[]' && cardRows[0].card_numbers !== '') {
            return res.status(400).json({ message: 'ตารางบิงโกถูกบันทึกไปแล้ว' });
        }

        // อัปเดต Card Numbers
        const query = `
            UPDATE UserBingoCards
            SET card_numbers = ?
            WHERE card_id = ? AND user_id = ?
        `;
        await executeQuery(query, [cardNumbers, card_id, user_id]);

        res.json({ message: 'บันทึกตารางบิงโกสำเร็จแล้ว' });

    } catch (error) {
        console.error("Error updating bingo card:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกตารางบิงโก' });
    }
};

// U-05: การบันทึกผลผู้ชนะและสร้างรายการถอนรางวัล
exports.claimWin = async (req, res) => {
    const user_id = req.user.user_id;
    const { round_id } = req.body;

    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // 1. ตรวจสอบว่าผู้ใช้คนนี้มี Card ในรอบนี้
        const [cardRows] = await connection.execute(
            "SELECT * FROM UserBingoCards WHERE user_id = ? AND round_id = ?", 
            [user_id, round_id]
        );

        if (cardRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบตารางบิงโกสำหรับรอบนี้' });
        }
        
        const myCard = cardRows[0];
        
        // 🚨 FIX: ตรวจสอบการเคลมรางวัลโดยเช็คว่า winning_claim_status ไม่เป็น NULL
        if (myCard.winning_claim_status !== null) { 
            await connection.commit();
            return res.status(200).json({ message: 'คุณได้ส่งคำขอเคลมรางวัลรอบนี้ไปแล้ว หรือมีการจัดการแล้ว' });
        }
        
        // 2. ดึงข้อมูลรอบเกมเพื่อหาจำนวนเงินรางวัล
        const [roundRows] = await connection.execute("SELECT prize_amount FROM gameround WHERE round_id = ?", [round_id]);
        if (roundRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'ไม่พบข้อมูลรอบเกม' });
        }
        
        // แปลงค่าเงินรางวัลเป็น Float/Number
        const winAmount = parseFloat(roundRows[0].prize_amount); 

        // 3. บันทึกผลผู้ชนะในตาราง UserBingoCards (ตั้งสถานะเป็น pending)
        await connection.execute(
            "UPDATE UserBingoCards SET is_winner = TRUE, winning_claim_status = 'pending', win_amount = ? WHERE user_id = ? AND round_id = ?",
            [winAmount, user_id, round_id]
        );
        
        // 4. บันทึกรายการ Transaction ประเภท 'win' สถานะ 'pending'
        const transactionQuery = `
            INSERT INTO Transactions 
            (user_id, round_id, transaction_type, amount, status)
            VALUES (?, ?, 'win', ?, 'pending')
        `;
        const [txResult] = await connection.execute(transactionQuery, [user_id, round_id, winAmount]);

        // 5. บันทึกผู้ชนะในตาราง gameround (Winning Number)
        await connection.execute(
             "UPDATE gameround SET winning_number = ? WHERE round_id = ? AND winning_number IS NULL",
             [user_id, round_id]
        );
        
        await connection.commit();
        res.status(201).json({
            message: 'เคลมรางวัลสำเร็จ! กรุณารอ Admin อนุมัติการจ่ายเงิน',
            transaction_id: txResult.insertId,
            win_amount: winAmount
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Win claim error:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเคลมรางวัล' });
    } finally {
        if (connection) connection.release();
    }
};

// U-06: API สำหรับดึงสถานะเกมที่แชร์ร่วมกัน (Shared Game State)
exports.getSharedGameState = async (req, res) => {
    const { round_id } = req.params;

    // *** หมายเหตุ: ในระบบจริง Logic การสุ่มเลขและการจัดการสถานะเกมต้องเกิดขึ้นที่นี่ ***
    
    try {
        // ดึงรายชื่อผู้เล่นทั้งหมดจาก Lobby (ใช้ Query เดิม)
        const playersQuery = `
            SELECT u.username, c.card_id
            FROM UserBingoCards c
            JOIN Users u ON c.user_id = u.user_id
            WHERE c.round_id = ?
        `;
        const allPlayers = await executeQuery(playersQuery, [round_id]);

        // สถานะจำลองของเกม (คุณต้อง implement Game Service ที่นี่เพื่อสุ่มเลขจริง)
        // **ตอนนี้เป็นเพียงตัวเลขจำลองเพื่อให้ Frontend สามารถทำงานได้**
        const simulatedCalledNumbers = ["01", "25", "50", "75", "11", "33"]; // ตัวเลขจำลอง
        const simulatedWinner = null;
        
        res.json({
            round_id: round_id,
            calledNumbers: simulatedCalledNumbers,
            players: allPlayers.map(p => ({
                username: p.username,
                // สมมติสถานะผู้เล่น
                isWinner: false, 
                isBingoClaimed: false
            })),
            winnerId: simulatedWinner
        });
    } catch (error) {
        console.error("Error fetching shared game state:", error);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงสถานะเกม' });
    }
};