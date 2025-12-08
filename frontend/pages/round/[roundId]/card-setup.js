// /frontend/pages/round/[roundId]/card-setup.js
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

// API สำหรับบันทึก Card (ใช้ Route เดิม)
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
            // ไม่นับช่องว่าง ('') และช่อง 'FREE'
            if (value !== '' && value !== 'FREE') {
                const num = parseInt(value);
                // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้องในช่วง 1-99
                if (!isNaN(num) && num >= 1 && num <= 99) {
                    counts[num] = (counts[num] || 0) + 1;
                    if (!indices[num]) indices[num] = [];
                    indices[num].push(index);

                    if (counts[num] > 1) {
                        duplicates.add(num);
                    }
                }
            }
        });

        // รวบรวม index ของทุกตัวเลขที่ซ้ำกัน
        let result = new Set();
        duplicates.forEach(num => {
            indices[num].forEach(index => result.add(index));
        });
        
        // กำหนดข้อความ Error หากมีเลขซ้ำ
        if (result.size > 0) {
            setError('พบตัวเลขซ้ำกันในตาราง กรุณาแก้ไขก่อนบันทึก');
        } else if (error === 'พบตัวเลขซ้ำกันในตาราง กรุณาแก้ไขก่อนบันทึก') {
            setError(''); // ล้าง Error ถ้าแก้ไขแล้ว
        }

        return result;
    }, [cardValues, error]);

    // ** Logic จับเวลาและเปลี่ยนหน้าอัตโนมัติ **
    useEffect(() => {
        // ดึง cardId เมื่อ roundId ถูกโหลด (ควรมี API เพื่อดึง card_id ของผู้ใช้ในรอบนั้นๆ)
        const fetchCardId = async () => {
            if (!roundId || !token) return;
            try {
                // ดึงข้อมูล Lobby เพื่อให้ได้ card_id และ card_numbers
                const response = await axios.get(`${USER_ROUNDS_API}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // โครงสร้างข้อมูลที่ใช้จาก userController.js: { game, myCard, players }
                const userCard = response.data.myCard; 

                if (userCard && userCard.card_id) {
                    setCardId(userCard.card_id);
                    
                    // หาก card_numbers ถูกบันทึกแล้ว (ไม่ว่าง/null) ให้อ่านค่ามาใส่ใน state
                    if (userCard.card_numbers && userCard.card_numbers !== '[]' && userCard.card_numbers !== 'null') {
                         const savedCard = JSON.parse(userCard.card_numbers);
                         // เปลี่ยน null กลับเป็น '' สำหรับช่องว่างที่ถูกบันทึก
                         setCardValues(savedCard.map(v => v === null ? '' : v)); 
                         setIsLocked(true); // ล็อคทันทีถ้ามีการบันทึกแล้ว
                    }
                }
            } catch (err) {
                console.error("Error fetching card setup data:", err);
                // จัดการ Error หากไม่พบ Card (อาจยังไม่ได้ลงทะเบียน)
            }
        };

        fetchCardId();

        // เริ่ม Timer
        if (timer > 0 && !isLocked) {
            const timerId = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);
            return () => clearInterval(timerId);
        } else if (timer === 0 && !isLocked) {
            // เมื่อเวลานับถอยหลังหมดลง
            // eslint-disable-next-line react-hooks/immutability
            handleLockAndSubmit(true); // บันทึกและล็อคโดยอัตโนมัติ
        }
    }, [timer, isLocked, roundId, token]);


    const handleCardChange = (index, value) => {
        // จำกัดให้เป็นตัวเลข 1-99
        if (value !== '' && (!/^\d*$/.test(value) || parseInt(value) < 1 || parseInt(value) > 99)) {
            // หากกรอกค่ามั่ว เช่น ตัวอักษร ให้ปล่อยว่าง
            if (!/^\d*$/.test(value)) value = '';
            // ถ้าเป็นตัวเลขนอกช่วงที่กำหนด ก็ปล่อยผ่านให้ Logic ใน handleLockAndSubmit จัดการ
        }

        const newValues = [...cardValues];
        newValues[index] = value;
        setCardValues(newValues);
    };

    const handleLockAndSubmit = async (isAutoSubmit = false) => {
        if (isLocked) return;
        
        // 1. ตรวจสอบ Card ID
        if (!cardId) {
             setError('ไม่พบ ID ตารางบิงโก กรุณาลองโหลดหน้าใหม่');
             return;
        }

        // 2. เตรียมค่า Card สำหรับบันทึก
        let cardToSave = [...cardValues];
        const autoDuplicateIndices = duplicateIndices; 
        
        // 3. Logic สำหรับ Auto Submit (หมดเวลา)
        if (isAutoSubmit) {
            console.log("Auto submitting card. Filtering invalid values...");
            
            // กรองค่าที่ไม่ถูกต้อง/ซ้ำ ให้เป็น null (ว่าง)
            cardToSave = cardToSave.map((value, index) => {
                if (value === 'FREE') return 'FREE';

                const num = parseInt(value);
                // ถ้าซ้ำ หรือ ไม่ใช่ตัวเลขที่ถูกต้อง (1-99) หรือเป็นช่องว่าง ให้ล้างเป็น null
                if (autoDuplicateIndices.has(index) || isNaN(num) || num < 1 || num > 99 || value === '') {
                    return null; 
                }
                return value;
            });

            // ตรวจสอบอีกครั้งว่ายังมีเลขซ้ำเหลืออยู่หรือไม่ (กรณีที่เลขซ้ำยังไม่ถูกล้างหมดจาก Map เดิม)
            // แต่เนื่องจากเรากรองค่าซ้ำออกหมดแล้ว (จาก autoDuplicateIndices) ส่วนนี้จึงเน้นที่การล้างค่าที่ไม่ถูกต้อง
        } else {
             // ถ้าเป็นการบันทึกด้วยตนเอง (Manual Submit) และพบเลขซ้ำ ให้หยุด
            if (autoDuplicateIndices.size > 0) { 
                setError('พบตัวเลขซ้ำกันในตาราง กรุณาแก้ไขก่อนบันทึก');
                return;
            }
        }
        
        try {
            // ทำการบันทึก Card Numbers ไปยัง Backend
            await axios.put(`${USER_ROUNDS_API}/${roundId}/card/${cardId}`, {
                // ส่งค่าที่ถูกต้อง ('FREE', 'xx', หรือ null)
                cardNumbers: JSON.stringify(cardToSave), 
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setIsLocked(true);
            setError('');
            
            if (!isAutoSubmit) {
                alert('บันทึกตารางบิงโกสำเร็จ!');
            }
            // เปลี่ยนหน้าไปยังหน้าเล่นเกมเมื่อบันทึกสำเร็จ (ทั้งอัตโนมัติและด้วยตนเอง)
            router.push(`/round/${roundId}/play`); 

        } catch (err) {
            console.error("Error submitting card:", err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกตาราง');
        }
    };


    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4 text-center">จัดเรียงตารางบิงโกของคุณ</h1>
            <div className={`text-xl font-bold p-3 text-center rounded-lg mb-6 ${timer <= 30 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                เวลาในการจัดเรียง: {timer} วินาที {timer === 0 && `(กำลังเปลี่ยนไปยังหน้าเล่นเกม)`}
            </div>

            <div className="grid grid-cols-5 gap-2 md:gap-4 border-4 border-indigo-500 p-2 rounded-xl bg-gray-50">
                {cardValues.map((value, index) => {
                    const isFreeCell = index === 12;
                    const isDuplicate = duplicateIndices.has(index); // ** ตรวจสอบเลขซ้ำ **
                    
                    // ตรวจสอบว่าเป็นค่าที่ไม่ถูกต้อง (มั่ว/นอกช่วง 1-99)
                    const isInvalid = value !== '' && value !== 'FREE' && (isNaN(parseInt(value)) || parseInt(value) < 1 || parseInt(value) > 99);
                    
                    // กำหนด Style ตามสถานะ
                    let inputClass = `w-full h-full text-center text-xl font-bold border-2 rounded`;
                    if (isLocked) {
                        inputClass += ' bg-gray-100 text-gray-500';
                    } else if (isDuplicate || isInvalid) { // ** ไฮไลท์สีแดงถ้าซ้ำหรือมั่ว **
                        inputClass += ' bg-red-100 border-red-500 text-red-700 shake-animation'; 
                    } else {
                        inputClass += ' bg-white border-indigo-300';
                    }

                    return (
                        <div key={index} className="aspect-square flex items-center justify-center">
                            {isFreeCell ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-700 font-bold rounded">
                                    FREE
                                </div>
                            ) : (
                                <input
                                    type="text" // เปลี่ยนเป็น text เพื่อรับค่าที่ยาวกว่า 2 หลักชั่วคราวแล้วตัด
                                    maxLength="2" // จำกัดจำนวนตัวอักษร
                                    value={value}
                                    onChange={(e) => handleCardChange(index, e.target.value)}
                                    disabled={isLocked}
                                    className={inputClass}
                                    placeholder="?"
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
                .shake-animation {
                    animation: shake 0.5s;
                }
            `}</style>
        </div>
    );
};

export default CardSetupPage;