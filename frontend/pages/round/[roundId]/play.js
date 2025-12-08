// /frontend/pages/round/[roundId]/play.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// API สำหรับดึงข้อมูล Lobby (ใช้เพื่อดึง Card Numbers ที่บันทึกแล้ว)
const LOBBY_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/rounds';
const GAME_STATE_API = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/rounds';
const CLAIM_WIN_API = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/claim-win';
const TOTAL_CELLS = 25;
const POLLING_INTERVAL = 3000; // Polling interval (3 วินาที)

// Logic ตรวจสอบการบิงโก (เช็คเฉพาะใน Frontend เพื่อการแสดงผลเบื้องต้น)
const checkBingo = (markedCells) => {
    // 5x5 Grid: Index 0 - 24
    const winningLines = [
        // Rows
        [0, 1, 2, 3, 4], [5, 6, 7, 8, 9], [10, 11, 12, 13, 14], [15, 16, 17, 18, 19], [20, 21, 22, 23, 24],
        // Columns
        [0, 5, 10, 15, 20], [1, 6, 11, 16, 21], [2, 7, 12, 17, 22], [3, 8, 13, 18, 23], [4, 9, 14, 19, 24],
        // Diagonals (ช่องกลาง Index 12 เป็น FREE)
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];

    // ตรวจสอบ Bingo
    return winningLines.some(line => {
        // ถ้าเป็นแนวทแยงที่ผ่านช่อง FREE (Index 12) หรือเป็นแนวอื่น
        if (line.includes(12)) {
            // นับว่าช่อง FREE ถูกทำเครื่องหมายอยู่เสมอ (ซึ่งถูกตั้งค่าไว้ที่ index 12 = true ใน state)
            const markedCount = line.filter(index => markedCells[index]).length;
            return markedCount >= 5; 
        }
        return line.every(index => markedCells[index]);
    });
};

const GamePlayPage = () => {
    const router = useRouter();
    const { roundId } = router.query;
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    const [myCard, setMyCard] = useState(null); 
    const [roundInfo, setRoundInfo] = useState(null);
    const [gameState, setGameState] = useState('LOADING'); // LOADING, PLAYING
    const [calledNumbers, setCalledNumbers] = useState([]); 
    const [markedCells, setMarkedCells] = useState(Array(TOTAL_CELLS).fill(false)); 
    const [winStatus, setWinStatus] = useState(null); // WIN, LOSS
    
    // NEW STATE: สถานะผู้เล่นคนอื่น
    const [otherPlayers, setOtherPlayers] = useState([]); 
    const [isBingoClaimed, setIsBingoClaimed] = useState(false); // ล็อคการตรวจสอบบิงโกหลังชนะ/คนอื่นชนะ


    // ** 1. ฟังก์ชันดึงสถานะเกมที่แชร์ (Polling) **
    const fetchGameState = useCallback(async () => {
        if (!roundId || !token) return;

        try {
            const response = await axios.get(`${GAME_STATE_API}/${roundId}/game-state`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;

            // 1. อัปเดตตัวเลขที่ถูกเรียก
            setCalledNumbers(data.calledNumbers || []);

            // 2. อัปเดตสถานะผู้เล่นคนอื่น (เพื่อแสดงผล)
            setOtherPlayers(data.players || []);

            // 3. ตรวจสอบผู้ชนะ (ถ้ามีใครบิงโกแล้ว)
            // Note: data.winnerId ควรเป็น user_id ของผู้ชนะ
            if (data.winnerId && data.winnerId !== router.query.userId) { 
                 setIsBingoClaimed(true); // มีคนชนะแล้ว
                 setWinStatus('LOSS'); // ถ้าไม่ใช่เราที่ชนะ ให้แสดงหน้าจอแพ้
            }
            
            // 4. Marking Card (ทำเครื่องหมายตาม calledNumbers ที่ได้มา)
            if (myCard) {
                setMarkedCells(prevMarked => {
                    // ช่อง Free (Index 12) ควรถูก Mark เป็น True เสมอ
                    const newMarked = [...prevMarked];
                    newMarked[12] = true; 
                    let needsUpdate = false;

                    myCard.forEach((cardNum, index) => {
                        // Mark เฉพาะช่องที่ไม่ใช่ FREE และตรงกับ calledNumbers
                        if (cardNum !== 'FREE' && cardNum !== null && data.calledNumbers.includes(cardNum) && !newMarked[index]) {
                            newMarked[index] = true;
                            needsUpdate = true;
                        }
                    });
                    
                    if (needsUpdate) {
                        return newMarked;
                    }
                    return prevMarked;
                });
            }

        } catch (error) {
            console.error("Error fetching game state:", error);
        }
    }, [roundId, token, myCard]);


    // ** 2. ดึง Card ที่บันทึกไว้ (Initial Setup) **
    useEffect(() => {
        if (!roundId || !token || gameState !== 'LOADING') return;

        const fetchInitialData = async () => {
            try {
                const response = await axios.get(`${LOBBY_API_BASE}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                
                if (!data.myCard || !data.myCard.card_numbers) { 
                    alert('กรุณาสร้างตารางบิงโกก่อนเข้าเล่น!');
                    router.push(`/round/${roundId}/card-setup`);
                    return;
                }
                
                // แปลงค่า Card ที่บันทึกไว้
                const parsedCard = JSON.parse(data.myCard.card_numbers).map(v => v === null ? '' : v); 
                setMyCard(parsedCard);
                setRoundInfo(data.game);
                
                // ตรวจสอบว่าถึงเวลาเล่นแล้วหรือไม่
                const gameStartTime = new Date(data.game.play_time).getTime();
                const now = new Date().getTime();

                if (now < gameStartTime) {
                     // หากยังไม่ถึงเวลาเล่น ให้ redirect ไป Lobby ก่อน 
                     router.push(`/round/${roundId}/lobby`);
                     return;
                }

                setGameState('PLAYING'); 
                // ตั้งค่า markedCells เริ่มต้นโดยให้ช่อง FREE (Index 12) เป็น true
                const initialMarked = Array(TOTAL_CELLS).fill(false);
                initialMarked[12] = true; 
                setMarkedCells(initialMarked);
                
                // ดึงสถานะเกมครั้งแรก
                await fetchGameState(); 

            } catch (error) {
                console.error("Error fetching card in play page:", error);
                alert('ไม่สามารถโหลดข้อมูลตารางบิงโกได้');
                router.push(`/`);
            } finally {
                setGameState(prev => prev === 'LOADING' ? 'PLAYING' : prev);
            }
        };
        fetchInitialData();
    }, [roundId, gameState]);

    // ** 3. Polling Effect (ดึงสถานะเกมซ้ำๆ) **
    useEffect(() => {
        // ไม่ต้อง Polling ถ้ายังไม่ถึงสถานะ PLAYING, หรือถ้ามีคนเคลมบิงโกไปแล้ว, หรือยังไม่มี Card
        if (gameState !== 'PLAYING' || isBingoClaimed || !myCard) return;

        const intervalId = setInterval(fetchGameState, POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }, [gameState, isBingoClaimed, fetchGameState, myCard]);


    // ** 4. Logic ตรวจสอบ Bingo ทุกครั้งที่ markedCells เปลี่ยน **
    useEffect(() => {
        // isBingoClaimed เพื่อป้องกันการเรียกซ้ำ, winStatus === 'WIN' ป้องกันการวนซ้ำหลังจากชนะ
        if (!myCard || isBingoClaimed || winStatus === 'WIN') return; 

        if (checkBingo(markedCells)) {
            setWinStatus('WIN');
            setIsBingoClaimed(true); // ล็อคการเคลม
        }
    }, [markedCells, isBingoClaimed, myCard, winStatus]);


    // Logic การแสดงผล (Win/Loss)
    const handleWinScreenConfirm = () => {
        // หลังจบการเคลมหรือเกมจบ ให้กลับหน้าหลัก
        router.push('/');
    };

    if (winStatus) {
        return (
            <WinLossScreen 
                status={winStatus} 
                roundId={roundId} 
                winAmount={roundInfo?.prize_amount || 0} 
                onConfirm={handleWinScreenConfirm} 
            />
        );
    }
    
    // ... (Loading/Setup State) ...
    if (gameState === 'LOADING' || !myCard) {
        return <div className="p-4 text-center">กำลังเตรียมข้อมูลเกม...</div>;
    }

    return (
        <div className="p-4 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-center text-slate-700">
                รอบเกม: {roundInfo?.title || `ID ${roundId}`}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: Called Numbers & Other Players */}
                <div className="lg:col-span-1 space-y-6 order-2 lg:order-1">
                    {/* Called Number Display (Updated) */}
                    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-sky-100 text-center">
                        <p className="text-sm text-slate-500 mb-2">ตัวเลขล่าสุดที่ถูกเรียก:</p>
                        <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <span className="text-4xl font-extrabold text-white">
                                {calledNumbers[calledNumbers.length - 1] || 'รอ...'}
                            </span>
                        </div>
                    </div>

                    {/* Other Players List */}
                    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-sky-100">
                        <h3 className="text-xl font-light text-slate-700 mb-4">ผู้เข้าเล่น ({otherPlayers.length})</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {otherPlayers.map((player, index) => (
                                <div 
                                    key={index} 
                                    // ไฮไลท์ผู้เล่นที่เคลมบิงโกแล้ว
                                    className={`flex items-center p-2 rounded-lg ${
                                        (player.isWinner || player.isBingoClaimed) 
                                            ? 'bg-yellow-100 border border-yellow-400' 
                                            : 'bg-slate-50'
                                    }`}
                                >
                                    <span className={`text-sm font-light ${
                                        (player.isWinner || player.isBingoClaimed) 
                                            ? 'text-yellow-800 font-semibold' 
                                            : 'text-slate-700'
                                    }`}>
                                        {player.username} 
                                        {(player.isWinner || player.isBingoClaimed) && ' (CLAIMED BINGO!)'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* COLUMN 2: My Card & History */}
                <div className="lg:col-span-2 space-y-6 order-1 lg:order-2">
                    {/* My Card */}
                    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-sky-100">
                        <h2 className="text-2xl font-light mb-4 text-center text-slate-700">ตารางของคุณ</h2>
                        {/* แสดงข้อความเตือนเมื่อเคลมบิงโกแล้ว */}
                        {isBingoClaimed && winStatus !== 'WIN' && (
                            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center font-medium mb-4">
                                🔒 เกมหยุดแล้ว: มีผู้เล่นอื่นเคลมบิงโก!
                            </div>
                        )}
                        <BingoCardDisplay card={myCard} marked={markedCells} />
                    </div>

                    {/* History */}
                    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-2xl shadow-md border border-sky-100">
                        <h3 className="text-xl font-light text-slate-700 mb-3">ประวัติการเรียกเลข: ({calledNumbers.length})</h3>
                        <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto p-1 border border-slate-200 rounded-lg bg-slate-50">
                            {calledNumbers.slice().reverse().map((num, index) => ( // แสดงจากล่าสุดก่อน
                                <span 
                                    key={index} 
                                    className={`text-xs font-medium px-2 py-1 rounded-full 
                                        ${myCard.includes(num) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}
                                >
                                    {num}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component Helper: แสดงผลตารางบิงโก
const BingoCardDisplay = ({ card, marked }) => (
    <div className="grid grid-cols-5 gap-2 md:gap-3 border-4 border-indigo-500 p-2 rounded-xl bg-white/50 w-full max-w-sm mx-auto aspect-square">
        {card.map((num, index) => {
            const isMarked = marked[index];
            const isFree = num === 'FREE';
            
            let cellClass = 'aspect-square flex items-center justify-center rounded text-xl font-bold transition-all duration-300';

            if (isMarked) {
                cellClass += ' bg-emerald-400 text-white shadow-inner ring-4 ring-emerald-200 scale-105';
            } else if (isFree) {
                cellClass += ' bg-gray-300 text-gray-700';
            } else {
                cellClass += ' bg-white text-gray-900 border border-gray-200';
            }
            
            return (
                <div key={index} className={cellClass}>
                    <span className={`text-xl font-bold ${num === 'FREE' ? 'text-gray-700' : 'text-gray-900'}`}>{num}</span>
                </div>
            );
        })}
    </div>
);

// Component Helper: หน้าจอชนะ/แพ้
const WinLossScreen = ({ status, roundId, winAmount, onConfirm }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    const handleConfirmWin = async () => {
        if (status === 'WIN') {
            try {
                // ส่งคำขอเคลมรางวัลไปยัง Backend
                await axios.post(CLAIM_WIN_API, { round_id: roundId }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('ส่งคำขอรับรางวัลสำเร็จ! โปรดรอ Admin ดำเนินการ');
            } catch (error) {
                console.error("Error claiming win:", error.response?.data?.message || error);
                alert(`ไม่สามารถส่งคำขอรับรางวัลได้: ${error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}`);
            }
        }
        onConfirm(); // ไปหน้าหลักหรือหน้าอื่นต่อ
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-8 rounded-lg text-center shadow-2xl max-w-md w-full">
                {status === 'WIN' ? (
                    <>
                        <h2 className="text-4xl font-extrabold text-yellow-600 mb-4">🎉 บิงโก! คุณชนะ! 🎉</h2>
                        <p className="text-lg mb-6">
                            ท่านได้รับเงินรางวัลจำนวน: **{parseFloat(winAmount).toLocaleString()} บาท**
                        </p>
                        <button 
                            onClick={handleConfirmWin} 
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg w-full"
                        >
                            ยืนยันรับรางวัล
                        </button>
                    </>
                ) : (
                    <>
                        <h2 className="text-4xl font-extrabold text-red-600 mb-4">❌ น่าเสียดาย! ❌</h2>
                        <p className="text-lg mb-6">เกมรอบนี้จบลงแล้ว ขอแสดงความเสียใจด้วย</p>
                        <button 
                            onClick={onConfirm} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg w-full"
                        >
                            กลับหน้าหลัก
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};


export default GamePlayPage;