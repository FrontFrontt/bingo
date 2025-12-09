// /frontend/pages/round/[roundId]/card-setup.js
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// API สำหรับบันทึก Card
const USER_ROUNDS_API = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/rounds';
const CARD_SIZE = 5;
const TOTAL_FIELDS = CARD_SIZE * CARD_SIZE;

const CardSetupPage = () => {
    const router = useRouter();
    const { roundId } = router.query;

    // สร้างตาราง 5x5 โดยช่องกลางเป็นช่องฟรี (index 12)
    const initialCard = Array(TOTAL_FIELDS).fill('');
    initialCard[12] = 'FREE'; // ช่องกลาง

    const [cardValues, setCardValues] = useState(initialCard);
    const [timer, setTimer] = useState(120); // 2 นาที
    const [isLocked, setIsLocked] = useState(false);
    const [cardId, setCardId] = useState(null);
    const [error, setError] = useState('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    // ** Logic ตรวจสอบเลขซ้ำและไฮไลท์สีแดง **
    const duplicateIndices = useMemo(() => {
        const counts = {};
        const duplicates = new Set();
        const indices = {};

        cardValues.forEach((value, index) => {
            if (value && value !== 'FREE' && /^\d+$/.test(value)) {
                const num = parseInt(value, 10);
                if (num < 1 || num > 99) return; // ไม่นับเลขมั่ว

                const key = String(num).padStart(2, '0');
                counts[key] = (counts[key] || 0) + 1;
                if (counts[key] > 1) {
                    duplicates.add(key);
                }
                indices[key] = indices[key] || [];
                indices[key].push(index);
            }
        });

        const result = new Set();
        duplicates.forEach(key => {
            indices[key].forEach(index => result.add(index));
        });
        return result;
    }, [cardValues]);

    // ** Logic ตรวจสอบเลขมั่ว (เกิน 99 หรือไม่ใช่ตัวเลข) **
    const invalidIndices = useMemo(() => {
        const result = new Set();
        cardValues.forEach((value, index) => {
            if (value && value !== 'FREE' && !isLocked) {
                if (!/^\d+$/.test(value) || parseInt(value, 10) < 1 || parseInt(value, 10) > 99) {
                    result.add(index);
                }
            }
        });
        return result;
    }, [cardValues, isLocked]);

    // ** Timer Logic **
    useEffect(() => {
        if (isLocked || timer <= 0) return;

        const timerId = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    // 🚨 เมื่อเวลาหมด ให้ทำการล็อคและส่งค่าทันที
                    handleLockAndSubmit(true); 
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timerId);
    }, [isLocked, timer]);

    // ** Logic Fetch Card เดิม **
    useEffect(() => {
        if (!roundId || !token) {
            router.push('/login');
            return;
        }

        const fetchExistingCard = async () => {
            try {
                const response = await axios.get(`${USER_ROUNDS_API}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const card = response.data.myCard;
                
                if (card && card.card_numbers && card.card_numbers !== 'null' && card.card_numbers !== '[]') {
                    // ถ้ามีตารางอยู่แล้ว ให้ redirect ไป Lobby เลย
                    router.push(`/round/${roundId}/lobby`); 
                    return;
                }
                
            } catch (err) {
                // หากดึงข้อมูลไม่ได้ (เช่น ยังไม่ลงทะเบียน) ไม่เป็นไร ให้ไปต่อ
                console.log('No existing card or registration found, proceeding to setup.');
            }
        };
        fetchExistingCard();
    }, [roundId, token]);


    const handleChange = (index, value) => {
        if (isLocked || index === 12) return; // ห้ามแก้ช่อง FREE

        const newValues = [...cardValues];
        // รับเฉพาะตัวเลข
        const numericValue = value.replace(/[^0-9]/g, '');
        
        // จำกัดความยาว
        if (numericValue.length <= 2) {
            newValues[index] = numericValue.padStart(2, '0');
        } else {
            newValues[index] = numericValue.substring(0, 2);
        }

        setCardValues(newValues);
        setError('');
    };

    const handleLockAndSubmit = async (isTimeout = false) => {
        if (isLocked) return;

        // 1. ตรวจสอบข้อผิดพลาดร้ายแรง: เลขซ้ำ
        if (duplicateIndices.size > 0) {
            setError('พบหมายเลขซ้ำบนตารางบิงโกของคุณ กรุณาแก้ไข');
            if (isTimeout) alert('เวลาหมด! ระบบไม่สามารถบันทึกตารางได้ เนื่องจากพบหมายเลขซ้ำ');
            return;
        }

        setIsLocked(true); // ล็อคเพื่อป้องกันการแก้ไขเพิ่มเติม

        // 2. จัดการข้อมูลก่อนส่ง: กรองเฉพาะเลขที่ถูกต้อง
        const cardArrayToSend = cardValues.map((value, index) => {
            if (index === 12) return 'FREE';
            
            if (value) {
                const num = parseInt(value, 10);
                // ถ้าเป็นตัวเลขระหว่าง 1-99 ให้ส่งค่าไป
                if (num >= 1 && num <= 99) {
                    return String(num).padStart(2, '0');
                }
            }
            // ถ้าเป็นช่องว่าง/เลขมั่ว/เกิน 99 ให้ส่งค่า null หรือ string ว่าง
            return ''; 
        });

        // 3. ตรวจสอบว่ามีตัวเลขบนตารางหรือไม่
        const hasNumbers = cardArrayToSend.filter(val => val !== 'FREE' && val !== '').length > 0;
        if (!hasNumbers) {
            setError('กรุณากรอกตัวเลขบนตารางบิงโกอย่างน้อยหนึ่งช่อง');
            setIsLocked(false);
            return;
        }

        try {
            // 4. บันทึกตาราง
            const API_URL = `${USER_ROUNDS_API}/${roundId}/card/create`;
            const response = await axios.post(
                API_URL, 
                { cardNumbers: cardArrayToSend },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setCardId(response.data.cardId);
            alert('บันทึกตารางบิงโกสำเร็จ! เตรียมเข้าสู่ Lobby');
            // 5. Redirect ไป Lobby เพื่อรอนับถอยหลัง
            router.push(`/round/${roundId}/lobby`);

        } catch (err) {
            console.error('Error submitting card:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกตาราง กรุณาลองใหม่');
            setIsLocked(false); // ปลดล็อคให้ผู้ใช้ลองใหม่
        }
    };
    
    // Helper สำหรับแสดงเวลา
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-12">
            <div className="max-w-xl mx-auto">
                <h1 className="text-3xl font-light text-slate-700 mb-2 text-center">สร้างตารางบิงโก</h1>
                <p className="text-sm text-slate-500 font-light mb-6 text-center">
                    รอบเกม ID: {roundId} - กรุณาใส่ตัวเลข 01-99 
                </p>

                {/* Timer Bar */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-light text-slate-600">
                            เวลาเหลือ: <span className="font-semibold text-rose-600">{formatTime(timer)}</span>
                        </span>
                        <span className={`text-sm font-light ${isLocked ? 'text-green-600' : 'text-slate-500'}`}>
                            {isLocked ? 'บันทึกแล้ว' : 'กำลังทำตาราง'}
                        </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className="bg-rose-500 h-2.5 rounded-full transition-all duration-1000" 
                            style={{ width: `${(timer / 120) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Bingo Card Grid */}
                <div className="grid grid-cols-5 gap-2 border-4 border-indigo-600 rounded-lg p-4 bg-white shadow-xl">
                    {cardValues.map((value, index) => {
                        const isFree = index === 12;
                        const isDuplicate = duplicateIndices.has(index);
                        const isInvalid = invalidIndices.has(index);
                        const isProblem = isDuplicate || isInvalid;

                        // กำหนด Class 
                        let cellClass = 'w-full aspect-square flex items-center justify-center border-2 rounded-lg text-xl font-semibold transition-all duration-100';
                        if (isFree) {
                            cellClass += ' bg-indigo-500 text-white cursor-not-allowed';
                        } else if (isLocked) {
                             cellClass += ' bg-gray-100 text-gray-700 cursor-not-allowed';
                        } else if (isProblem) {
                            cellClass += ' border-red-500 bg-red-100 text-red-700 shake';
                        } else if (value && value !== 'FREE') {
                            cellClass += ' border-green-500 bg-green-50 text-green-700';
                        } else {
                            cellClass += ' border-gray-300 hover:border-indigo-400';
                        }


                        return (
                            <div key={index} className={cellClass}>
                                {isFree ? (
                                    'FREE'
                                ) : (
                                    <input
                                        type="tel" // ใช้ type="tel" เพื่อให้แป้นพิมพ์มือถือแสดงตัวเลข
                                        value={value === '00' ? '' : value}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        disabled={isLocked}
                                        className={`w-full h-full text-center text-xl font-bold rounded-lg focus:outline-none focus:ring-2 bg-transparent ${isProblem ? 'text-red-700' : 'text-gray-800'}`}
                                        maxLength={2}
                                        onFocus={(e) => e.target.select()}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ** แสดงข้อความ Error สีแดงจาก Logic เลขซ้ำ/มั่ว ** */}
                {error && (
                     <p className="text-red-600 font-semibold mt-4 text-center p-2 border border-red-500 bg-red-50 rounded">
                        {error}
                    </p>
                )}

                <button
                    onClick={() => handleLockAndSubmit(false)}
                    disabled={isLocked || duplicateIndices.size > 0} // ** ปุ่มจะถูกปิดใช้งานถ้ามีเลขซ้ำ **
                    className={`mt-6 py-3 px-8 rounded-lg text-white font-bold transition-all w-full ${isLocked || duplicateIndices.size > 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isLocked ? 'ล็อคและบันทึกแล้ว' : 'ล็อคและเริ่มเล่น'}
                </button>
                <p className="text-sm text-gray-500 mt-2 text-center">ช่องว่าง (หรือเลขมั่ว/ซ้ำ) จะถูกบันทึกเป็นช่องเปล่า</p>

                {/* เพิ่ม CSS สำหรับ Animation */}
                <style jsx global>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20%, 60% { transform: translateX(-3px); }
                        40%, 80% { transform: translateX(3px); }
                    }
                    .shake {
                        animation: shake 0.4s;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default CardSetupPage;