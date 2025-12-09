// /frontend/pages/round/[roundId]/play.js
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// 🚨 FIX: ใช้ Environment Variable
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
        // Diagonals
        [0, 6, 12, 18, 24], [4, 8, 12, 16, 20]
    ];

    for (const line of winningLines) {
        if (line.every(index => markedCells.has(index))) {
            return true;
        }
    }
    return false;
};


// Main Game Component
const GamePlayPage = () => {
    const router = useRouter();
    const { roundId } = router.query;
    
    // States
    const [gameState, setGameState] = useState('LOADING'); // 'LOADING', 'PLAYING', 'END_WIN', 'END_LOSE'
    const [roundInfo, setRoundInfo] = useState(null);
    const [myCard, setMyCard] = useState([]); // Array of strings/numbers
    const [calledNumbers, setCalledNumbers] = useState([]); // Array of strings/numbers
    const [markedCells, setMarkedCells] = useState(new Set()); // Set of indexes (0-24)
    const [isBingoClaimed, setIsBingoClaimed] = useState(false);
    const [winAmount, setWinAmount] = useState(0);
    const [error, setError] = useState('');

    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;
    const isGameActive = gameState === 'PLAYING';

    // Helper: Mark Cell on client side
    const toggleCell = useCallback((index) => {
        if (!isGameActive || isBingoClaimed) return;

        const numberOnCard = myCard[index];
        const isCalled = calledNumbers.includes(numberOnCard);

        if (isCalled || numberOnCard === 'FREE') {
            const newMarkedCells = new Set(markedCells);
            // ถ้าเป็นเบอร์ที่ถูกเรียก หรือเป็นช่อง FREE ให้ทำการ Mark/Unmark
            if (newMarkedCells.has(index)) {
                newMarkedCells.delete(index);
            } else {
                newMarkedCells.add(index);
            }
            setMarkedCells(newMarkedCells);
            setError(''); // Clear error if user attempts to mark
        } else {
             setError(`หมายเลข ${numberOnCard} ยังไม่ถูกเรียก!`);
             // Animation effect for error
             const element = document.getElementById(`cell-${index}`);
             if (element) {
                 element.classList.add('animate-shake');
                 setTimeout(() => element.classList.remove('animate-shake'), 400);
             }
        }
    }, [isGameActive, isBingoClaimed, myCard, calledNumbers, markedCells]);


    // Helper: Check for Bingo and Claim
    const handleClaimBingo = async () => {
        if (isBingoClaimed || !isGameActive) return;

        // 1. ตรวจสอบ Bingo ใน Frontend
        const hasBingo = checkBingo(markedCells);

        if (!hasBingo) {
             setError('คุณยังไม่บิงโก! โปรดตรวจสอบตารางของคุณ');
             return;
        }

        // 2. Claim Bingo
        try {
            const response = await axios.post(
                CLAIM_WIN_API, 
                { roundId }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            setWinAmount(response.data.winAmount || roundInfo.prize_amount || 0);
            setIsBingoClaimed(true);
            setGameState('END_WIN'); // เปลี่ยนสถานะเกมเป็นชนะ
            alert('🎉 ยินดีด้วย! คุณบิงโกแล้ว! กำลังรอการยืนยันจากระบบ');
            
        } catch (err) {
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยันบิงโก');
            alert(`ไม่สามารถ Claim Bingo ได้: ${err.response?.data?.message || 'เกิดข้อผิดพลาด'}`);
        }
    };
    
    // Helper: Mark initial cells based on called numbers
    const initialMarked = useCallback((card, called) => {
        const initialMarked = new Set();
        card.forEach((num, index) => {
            if (num === 'FREE') {
                initialMarked.add(index);
            } else if (called.includes(num)) {
                initialMarked.add(index);
            }
        });
        return initialMarked;
    }, []);

    // 🚨 useEffect ตัวที่ 1: Polling Game State
    useEffect(() => {
        if (gameState !== 'PLAYING' || !roundId) return;

        const fetchGameState = async () => {
            try {
                const response = await axios.get(`${GAME_STATE_API}/${roundId}/game-state`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;

                // อัปเดตตัวเลขที่ถูกเรียก
                setCalledNumbers(data.calledNumbers);

                // หากพบผู้ชนะคนแรก
                if (data.isGameEnded) {
                    // ตรวจสอบว่าผู้เล่นคนนี้ชนะหรือไม่
                    if (data.isWinner) {
                        setWinAmount(data.winAmount);
                        setGameState('END_WIN');
                    } else {
                        setGameState('END_LOSE');
                    }
                    return;
                }

                // อัปเดต Marked Cells ตามเลขที่ถูกเรียกใหม่
                setMarkedCells(prevMarked => {
                    const newMarked = new Set(prevMarked);
                    myCard.forEach((num, index) => {
                        if (num !== 'FREE' && !newMarked.has(index) && data.calledNumbers.includes(num)) {
                            newMarked.add(index);
                        }
                    });
                    return newMarked;
                });
                

            } catch (error) {
                console.error('Error fetching game state:', error.message);
                // ถ้าเกิด error 404/403 ให้แจ้งเตือนและกลับหน้าหลัก
                if (error.response?.status === 404 || error.response?.status === 403) {
                    alert('เกมจบลงแล้ว หรือเกิดข้อผิดพลาดในการเชื่อมต่อ');
                    router.push('/');
                }
            }
        };

        // เริ่ม Polling
        const interval = setInterval(fetchGameState, POLLING_INTERVAL);
        return () => clearInterval(interval); // Cleanup function
    }, [gameState, roundId, myCard]); // Dependency: myCard เพื่อให้ initialMarked ทำงานถูกต้อง

    
    // 🚨 useEffect ตัวที่ 2: Initial Setup และ Flow Check
    useEffect(() => {
        if (!roundId || !token || gameState !== 'LOADING') return;

        const fetchInitialData = async () => {
            try {
                // 1. ดึงข้อมูล Lobby เพื่อตรวจสอบ Card Numbers และ Play Time
                const response = await axios.get(`${LOBBY_API_BASE}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                
                // 1.1. ตรวจสอบ Card Numbers
                if (!data.myCard || !data.myCard.card_numbers || data.myCard.card_numbers === 'null' || data.myCard.card_numbers === '[]' || data.myCard.card_numbers.length === 0) { 
                    alert('กรุณาสร้างตารางบิงโกก่อนเข้าเล่น!');
                    router.push(`/round/${roundId}/card-setup`);
                    return;
                }
                
                // แปลง Card Numbers
                const cardArray = JSON.parse(data.myCard.card_numbers || '[]');
                setMyCard(cardArray);
                setRoundInfo(data.game);
                
                // 1.2. ตรวจสอบว่าถึงเวลาเล่นแล้วหรือไม่ (Flow Check)
                let gameStartTime = new Date(data.game.play_time);
                if (isNaN(gameStartTime.getTime()) && typeof data.game.play_time === 'string') {
                    gameStartTime = new Date(data.game.play_time.replace(' ', 'T'));
                }
                
                const gameStartTimeMs = gameStartTime.getTime();
                const now = new Date().getTime();

                if (now < gameStartTimeMs) {
                     // 🚨 FIX: หากยังไม่ถึงเวลาเล่น ให้ redirect กลับไป Lobby ก่อน 
                     router.push(`/round/${roundId}/lobby`);
                     return;
                }

                // 2. ดึงสถานะเกมเริ่มต้น (เลขที่ถูกเรียกแล้ว)
                const gameStateResponse = await axios.get(`${GAME_STATE_API}/${roundId}/game-state`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                const initialCalledNumbers = gameStateResponse.data.calledNumbers;
                setCalledNumbers(initialCalledNumbers);
                
                // 3. Mark cells ที่ถูกเรียกไปแล้วตั้งแต่เริ่มต้น
                setMarkedCells(initialMarked(cardArray, initialCalledNumbers));
                
                setGameState('PLAYING');

            } catch (error) {
                console.error('Error fetching initial data for play:', error.message);
                setError(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูลเกมได้');
                // หากดึงข้อมูลไม่ได้ ให้กลับหน้าหลัก
                alert('ไม่สามารถเริ่มเกมได้ กรุณาตรวจสอบการลงทะเบียน');
                router.push('/');
            } 
        };
        fetchInitialData();
    }, [roundId, gameState]);


    // Render Helpers
    const isNumberCalled = (number) => calledNumbers.includes(number);
    const getCellClass = (index, number) => {
        let classes = 'w-full aspect-square flex items-center justify-center border-2 rounded-lg text-lg font-semibold transition-all duration-100 ease-in-out cursor-pointer relative';
        
        const isMarked = markedCells.has(index);
        const isCalled = isNumberCalled(number);
        const isFree = number === 'FREE';

        if (isFree) {
            classes += ' bg-indigo-500 text-white shadow-inner cursor-not-allowed';
        } else if (isMarked && isCalled) {
            // Marked correctly
            classes += ' bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300';
        } else if (isCalled) {
            // Called but not marked
            classes += ' bg-yellow-200 text-gray-800 border-yellow-400 hover:bg-yellow-300';
        } else {
            // Not called
            classes += ' bg-white text-gray-800 border-gray-200 hover:bg-gray-100';
        }

        return classes;
    };


    if (gameState === 'LOADING') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-sky-50">
                <p className="text-slate-600 font-light">กำลังเตรียมห้องเล่นบิงโก...</p>
            </div>
        );
    }
    
    // Show End Game Modal
    if (gameState === 'END_WIN' || gameState === 'END_LOSE') {
        return <EndGameModal status={gameState === 'END_WIN' ? 'WIN' : 'LOSE'} winAmount={winAmount} onConfirm={() => router.push('/')} />;
    }
    

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-sky-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <header className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-sky-100 p-4 mb-6">
                    <h1 className="text-2xl font-light text-slate-700">รอบเกม: {roundInfo?.title || 'กำลังเล่น'}</h1>
                    <p className="text-sm text-slate-500">เกมกำลังดำเนิน... (ตัวเลขล่าสุด: {calledNumbers[calledNumbers.length - 1] || '-'})</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Column 1: Called Numbers */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-sky-100 p-4 sticky top-6">
                            <h2 className="text-xl font-light text-sky-700 mb-3 border-b pb-2 border-sky-100">ตัวเลขที่ถูกเรียก ({calledNumbers.length})</h2>
                            <div className="max-h-80 overflow-y-auto pr-2">
                                <div className="flex flex-wrap gap-2">
                                    {[...calledNumbers].reverse().map((num, index) => (
                                        <div 
                                            key={index}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-rose-500 text-white shadow-lg' : 'bg-sky-100 text-sky-700'}`}
                                        >
                                            {num}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Bingo Card */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-indigo-200 p-6">
                            <h2 className="text-2xl font-bold text-indigo-700 mb-4 text-center">ตารางบิงโกของคุณ</h2>
                            
                            {/* Card Grid */}
                            <div className="grid grid-cols-5 gap-3 border-4 border-indigo-600 rounded-lg p-3 bg-white shadow-2xl max-w-md mx-auto">
                                {myCard.map((number, index) => (
                                    <div 
                                        key={index} 
                                        id={`cell-${index}`}
                                        className={getCellClass(index, number)}
                                        onClick={() => toggleCell(index)}
                                    >
                                        {number}
                                    </div>
                                ))}
                            </div>

                            {/* Status */}
                            <div className="mt-6 text-center">
                                {error && <p className="text-red-600 font-light mb-2">{error}</p>}
                                <p className="text-lg font-bold text-slate-700">
                                    ช่องที่ Mark: {markedCells.size} / {TOTAL_CELLS}
                                </p>
                            </div>
                            
                            {/* Claim Button */}
                            <button
                                onClick={handleClaimBingo}
                                disabled={isBingoClaimed || !isGameActive}
                                className={`mt-4 w-full py-3 rounded-lg font-bold transition-all ${
                                    isBingoClaimed || !isGameActive
                                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                                    : checkBingo(markedCells) 
                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600 animate-pulse'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                {isBingoClaimed ? '✓ รอการยืนยัน...' : checkBingo(markedCells) ? 'BINGO! ยืนยันการชนะ' : 'ยังไม่บิงโก'}
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Additional Info */}
                 <div className="mt-6 p-4 bg-sky-50 rounded-xl border border-sky-200">
                     <p className="text-sm text-sky-700">รางวัลสำหรับผู้ชนะ: {roundInfo?.prize_amount.toLocaleString() || 0} บาท</p>
                 </div>

            </div>
            
            {/* เพิ่ม CSS สำหรับ Animation */}
            <style jsx global>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-5px); }
                    40%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>
        </div>
    );
};

// End Game Modal Component
const EndGameModal = ({ status, winAmount, onConfirm }) => {
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    const handleConfirmWin = async () => {
        // ในระบบจริง Logic การยืนยันการรับรางวัลจะอยู่ที่นี่
        // แต่เนื่องจากเราได้ setGameState('END_WIN') ไปแล้ว และ claimWin ถูกเรียกไปแล้ว
        // เราสามารถถือว่าการยืนยันเสร็จสิ้นได้
        alert('ระบบได้บันทึกรางวัลของคุณแล้ว คุณจะกลับสู่หน้าหลัก');
        onConfirm(); // ไปหน้าหลักหรือหน้าอื่นต่อ
    };

    const handleConfirmLoss = () => {
        onConfirm(); // กลับหน้าหลัก
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center p-4 z-50">
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
                            onClick={handleConfirmLoss} 
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