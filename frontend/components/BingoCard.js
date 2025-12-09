// /frontend/components/BingoCard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ช่วงตัวเลข: 01 ถึง 99 (4.1)
const NUMBER_RANGE = Array.from({ length: 99 }, (_, i) => String(i + 1).padStart(2, '0'));
const CARD_SIZE = 25;

const BingoCard = ({ roundId, existingCard, onCardConfirmed }) => {
    // ใช้ Set เพื่อจัดการตัวเลขที่เลือก (เพื่อความง่ายในการตรวจสอบตัวเลขซ้ำ)
    const [selectedNumbers, setSelectedNumbers] = useState(new Set(existingCard || []));
    const [error, setError] = useState('');
    const isEditing = !existingCard;
    const isFull = selectedNumbers.size === CARD_SIZE;

    useEffect(() => {
        if (existingCard) {
            setSelectedNumbers(new Set(existingCard));
        }
    }, [existingCard]);

    const toggleNumber = (num) => {
        if (!isEditing) return; // ไม่อนุญาตให้แก้ไขเมื่อยืนยันแล้ว

        const newNumbers = new Set(selectedNumbers);
        if (newNumbers.has(num)) {
            newNumbers.delete(num);
        } else if (newNumbers.size < CARD_SIZE) {
            newNumbers.add(num);
        }
        setSelectedNumbers(newNumbers);
        setError('');
    };

    // U-04 ข้อ 4: ระบบสุ่มเลข 25 ตัวให้
    const handleRandomize = () => {
        const shuffled = [...NUMBER_RANGE].sort(() => 0.5 - Math.random());
        const randomCard = shuffled.slice(0, CARD_SIZE);
        setSelectedNumbers(new Set(randomCard));
        setError('');
    };

    // U-04 ข้อ 5: ยืนยันตาราง
    const handleConfirmCard = async () => {
        if (selectedNumbers.size !== CARD_SIZE) {
            setError('กรุณาเลือกตัวเลขให้ครบ 25 ตัว');
            return;
        }

        try {
            const token = localStorage.getItem('bingoToken');
            const cardArray = Array.from(selectedNumbers);

            const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/cards/create';

            // ส่งข้อมูลไปยัง Backend API เพื่อจัดเก็บ (U-04 ข้อ 5)
            await axios.post(API_URL, {
                roundId,
                cardNumbers: cardArray,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert('ยืนยันตารางบิงโกสำเร็จ! รอเวลาเริ่มเกม');
            onCardConfirmed(cardArray); // อัปเดตสถานะในหน้าหลัก
        } catch (err) {
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยันตาราง');
        }
    };

    return (
        <div className="p-4">
            <h3 className="text-xl font-semibold mb-4 text-center">
                {isEditing ? `เลือกตัวเลขของคุณ (${selectedNumbers.size}/${CARD_SIZE})` : 'ตารางบิงโกที่ยืนยันแล้ว'}
            </h3>

            {/* ตารางแสดงผล 5x5 */}
            <div className="grid grid-cols-5 gap-1 mx-auto max-w-sm">
                {Array.from({ length: CARD_SIZE }).map((_, index) => {
                    const num = Array.from(selectedNumbers)[index];
                    const isSelected = !!num; // แสดงเฉพาะเลขที่เลือกไว้ในตาราง

                    return (
                        <div
                            key={index}
                            className={`flex items-center justify-center aspect-square border text-lg font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'
                                }`}
                        >
                            {num || (isEditing ? '?' : '')}
                        </div>
                    );
                })}
            </div>

            {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}

            {isEditing && (
                <div className="mt-6">
                    {/* ปุ่มสุ่มเลข */}
                    <button
                        onClick={handleRandomize}
                        className="w-full bg-yellow-500 text-white font-bold py-2 rounded mb-2 hover:bg-yellow-600"
                    >
                        สุ่มตัวเลข 25 ตัว (U-04 ข้อ 4)
                    </button>
                    {/* ปุ่มยืนยัน */}
                    <button
                        onClick={handleConfirmCard}
                        disabled={!isFull}
                        className={`w-full font-bold py-2 rounded transition ${isFull ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-400 text-gray-600 cursor-not-allowed'}`}
                    >
                        ยืนยันตาราง (U-04 ข้อ 5)
                    </button>
                </div>
            )}

            {/* ส่วนสำหรับเลือก/ยกเลิกตัวเลข 01-99 (ถ้าอยู่ในโหมดเลือกเอง) */}
            {isEditing && (
                <div className="mt-8">
                    <h4 className="text-lg font-semibold mb-3">เลือกตัวเลขทั้งหมด (01-99)</h4>
                    <div className="grid grid-cols-7 gap-1 max-w-lg mx-auto">
                        {NUMBER_RANGE.map(num => (
                            <button
                                key={num}
                                onClick={() => toggleNumber(num)}
                                className={`p-1 border rounded text-xs transition duration-100 ${selectedNumbers.has(num) ? 'bg-indigo-200 border-indigo-500' : 'bg-white hover:bg-gray-100'
                                    }`}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BingoCard;