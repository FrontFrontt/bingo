// /frontend/pages/game/[roundId].js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import axios from 'axios';
import BingoCard from '../../components/BingoCard'; // นำเข้า Component ที่สร้างใหม่

const SOCKET_URL = 'http://localhost:4000';
const API_URL = 'http://localhost:4000/api/cards';

const socket = io(SOCKET_URL, {
    // ต้องส่ง Token ไปกับ Socket เพื่อ Authenticate (optional)
    auth: { token: typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : '' }
});

const BingoGamePage = () => {
    const router = useRouter();
    const { roundId } = router.query;
    
    const [userCardNumbers, setUserCardNumbers] = useState(null); // ตัวเลข 25 ตัวที่ผู้เล่นยืนยัน
    const [drawnNumbers, setDrawnNumbers] = useState([]); // เลขที่ถูกสุ่มออกมาแล้ว
    const [lastDrawnNumber, setLastDrawnNumber] = useState(null);
    const [roundStatus, setRoundStatus] = useState('pending'); // สถานะรอบเกม
    const [hasBingod, setHasBingod] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. โหลดข้อมูลตารางบิงโกของผู้ใช้สำหรับรอบนี้ (U-04)
    useEffect(() => {
        const token = localStorage.getItem('bingoToken');
        if (!token || !roundId) {
            router.push('/login');
            return;
        }
        
        const fetchUserCard = async () => {
            try {
                // API สำหรับโหลดตารางที่ผู้เล่นเคยสร้างไว้ในรอบนี้
                const response = await axios.get(`${API_URL}/${roundId}/my-card`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // สมมติว่า Backend ส่ง CardNumbers เป็น Array of Strings กลับมา
                setUserCardNumbers(response.data.card_numbers || null); 
                setRoundStatus(response.data.round_status);
            } catch (error) {
                console.error('Error fetching user card:', error);
                setUserCardNumbers(null); // ผู้เล่นยังไม่สร้างตาราง
            } finally {
                setLoading(false);
            }
        };

        fetchUserCard();
    }, [roundId]);

    // 2. Logic การเชื่อมต่อ Real-time (U-05)
    useEffect(() => {
        // ให้ Socket เข้าร่วมห้องตาม roundId
        socket.emit('join_round', roundId);
        
        socket.on('current_game_state', (data) => {
            setDrawnNumbers(data.drawnNumbers || []);
        });

        socket.on('new_number_drawn', (data) => {
            const { number, drawnNumbers: allDrawn } = data;
            setLastDrawnNumber(number);
            setDrawnNumbers(allDrawn);
            setRoundStatus('active'); // อัปเดตสถานะเป็นกำลังเล่น
            
            // ตรวจสอบการบิงโก (เฉพาะเมื่อมีตารางแล้ว)
            if (userCardNumbers) {
                checkBingo(allDrawn, userCardNumbers);
            }
        });

        socket.on('game_ended', () => {
            setRoundStatus('completed');
            alert('Game Round Ended!');
            // U-06: หากชนะ ต้องส่ง Claim ไป Backend
            if (hasBingod) {
                handleWinningClaim();
            }
        });

        return () => {
            socket.emit('leave_round', roundId);
            socket.off('new_number_drawn');
            socket.off('game_ended');
        };
    }, [roundId, userCardNumbers, hasBingod]); // Re-run effect เมื่อ userCardNumbers เปลี่ยน

    // 3. Logic ตรวจสอบบิงโก (Client-side เพื่อการตอบสนอง)
    const checkBingo = (currentDrawnNumbers, card) => {
        if (hasBingod) return;

        // ** ต้องใช้ Logic ตรวจสอบบิงโกที่ซับซ้อนตามเงื่อนไข (4.2 รูปแบบการบิงโก) **
        // Example: ตรวจสอบ Full Card Match (แค่ 5 ตัวเลขแรก) - ต้องปรับปรุง
        const isBingo = card.slice(0, 5).every(num => currentDrawnNumbers.includes(num));

        if (isBingo) {
            setHasBingod(true);
            alert('BINGO!!! ส่งคำขอรับรางวัลแล้ว');
            // ส่ง Claim ทันทีเมื่อ Client ตรวจพบ
            handleWinningClaim();
        }
    };

    // 4. Logic การเรียกร้องรางวัล (U-06)
    const handleWinningClaim = async () => {
        try {
            const token = localStorage.getItem('bingoToken');
            await axios.post('http://localhost:4000/api/claims/win', {
                roundId: roundId,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Winning claim sent successfully.');
        } catch (error) {
            console.error('Error sending winning claim:', error);
        }
    };

    if (loading) {
        return <div className="p-4 text-center">กำลังเตรียมเกม...</div>;
    }
    
    // แสดง UI ตามสถานะของเกม
    return (
        <div className="p-4 mobile-first-container max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-4">รอบเกม #{roundId}</h2>
            <p className="text-center text-lg mb-4">สถานะ: **{roundStatus.toUpperCase()}**</p>

            {/* แสดงเลขที่ออกล่าสุด */}
            <div className={`my-4 p-3 rounded-lg text-center ${roundStatus === 'active' ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-200 text-gray-700'}`}>
                **เลขที่ออกล่าสุด:** <span className="text-4xl font-black ml-2">{lastDrawnNumber || 'รอเริ่มเกม'}</span>
            </div>

            {/* แสดงส่วนสร้าง/แสดงตาราง */}
            {userCardNumbers ? (
                <>
                    <BingoCard 
                        roundId={roundId} 
                        existingCard={userCardNumbers} 
                        onCardConfirmed={setUserCardNumbers} // ยืนยันแล้ว
                    />
                    {hasBingod && <div className="p-3 bg-blue-500 text-white text-center rounded-lg mt-4">คุณบิงโกแล้ว! รอ Admin อนุมัติการจ่ายเงิน</div>}
                </>
            ) : (
                <>
                    {/* U-03: ส่วนฝากเงินเพื่อเล่น (ต้องทำแยกต่างหาก) */}
                    <div className="p-4 border rounded-lg bg-yellow-50 mb-4">
                        <p className="font-semibold">⚠️ ขั้นตอนที่ 1: ฝากเงินเพื่อเข้าร่วมรอบ</p>
                        <p className="text-sm">หากยังไม่ได้ฝากเงินสำหรับรอบนี้ กรุณาทำธุรกรรม **(U-03)** ก่อนจึงจะสร้างตารางได้</p>
                        {/* **ต้องสร้าง Component/Form สำหรับการฝากเงินและการอัปโหลดสลิปที่นี่** */}
                    </div>
                    {/* U-04: Component สร้างตาราง */}
                    <BingoCard 
                        roundId={roundId} 
                        existingCard={null} 
                        onCardConfirmed={setUserCardNumbers} // เมื่อยืนยันเสร็จ จะอัปเดต state ให้แสดงตารางที่ยืนยันแล้ว
                    />
                </>
            )}
            
            {/* แสดงประวัติเลขที่ออกทั้งหมด */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold mb-3">ประวัติเลขที่ออก ({drawnNumbers.length}/99)</h3>
                <div className="flex flex-wrap gap-2 p-2 border rounded bg-white">
                    {drawnNumbers.map((num, index) => (
                        <span key={index} className="text-sm px-2 py-1 bg-gray-100 rounded">
                            {num}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BingoGamePage;