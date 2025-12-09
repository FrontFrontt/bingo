// /frontend/pages/round/[roundId]/lobby.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

// 🚨 FIX: ใช้ Environment Variable
const LOBBY_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/rounds';

const formatTime = (totalSeconds) => {
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return { days, hours, minutes, seconds };
};

const GameLobbyPage = () => {
    const router = useRouter();
    const { roundId } = router.query;

    const [lobbyData, setLobbyData] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [loading, setLoading] = useState(true);
    const [cardNumbers, setCardNumbers] = useState([]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    // 🚨 useEffect ตัวที่ 1: Fetch ข้อมูลและตรวจสอบ Redirect
    useEffect(() => {
        if (!roundId || !token) return;

        const fetchLobbyData = async () => {
            try {
                const response = await axios.get(`${LOBBY_API_BASE}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;

                // 🚨 FIX 1: ตรวจสอบ Card Numbers ทันที
                const userCard = data.myCard;
                if (!userCard || userCard.card_numbers === null || userCard.card_numbers === 'null' || userCard.card_numbers === '[]' || userCard.card_numbers.length === 0) {
                    // ถ้ายังไม่ได้สร้างตาราง ให้ส่งไปหน้าสร้างตารางทันที
                    router.push(`/round/${roundId}/card-setup`);
                    return; 
                }
                
                setLobbyData(data);
                // แปลง card_numbers จาก JSON String เป็น Array
                const cardArray = JSON.parse(userCard.card_numbers || '[]');
                setCardNumbers(cardArray);

                // คำนวณเวลาที่เหลือ
                let gameStartTime = new Date(data.game.play_time);
                if (isNaN(gameStartTime.getTime()) && typeof data.game.play_time === 'string') {
                    gameStartTime = new Date(data.game.play_time.replace(' ', 'T'));
                }

                const now = new Date().getTime();
                const remaining = Math.max(0, Math.floor((gameStartTime.getTime() - now) / 1000));
                
                // 🚨 FIX 2: ถ้าถึงเวลาเล่นแล้ว (เวลาเหลือ 0) ให้ส่งไปหน้า Play ทันที
                if (remaining <= 0) {
                     router.push(`/round/${roundId}/play`); 
                     return;
                }
                
                setTimeRemaining(remaining);
                setLoading(false);

            } catch (error) {
                console.error('Error fetching lobby data:', error.response?.data?.message || error.message);
                if (error.response?.status === 404) {
                    alert('ไม่พบรอบเกมหรือคุณยังไม่ได้ลงทะเบียนสำหรับรอบนี้');
                    router.push('/');
                } else if (error.response?.status === 401 || error.response?.status === 403) {
                     router.push('/login');
                }
                setLoading(false);
            }
        };

        fetchLobbyData();
    }, [roundId, token]);

    // 🚨 useEffect ตัวที่ 2: Timer
    useEffect(() => {
        if (timeRemaining <= 0 || loading) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // 🎯 แก้ไข: เปลี่ยนไปที่หน้า play เมื่อเวลาหมดลง
                    router.push(`/round/${roundId}/play`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining, loading]); 

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
                <p className="text-slate-600 font-light">กำลังโหลดห้อง Lobby...</p>
            </div>
        );
    }
    
    if (timeRemaining <= 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
                <p className="text-slate-600 font-light">กำลังนำเข้าสู่ห้องเล่น...</p>
            </div>
        );
    }

    const time = formatTime(timeRemaining);
    const isGameStarted = timeRemaining <= 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-light text-slate-700 mb-2 text-center">ห้องรอเกม (Lobby)</h1>
                <p className="text-sm text-slate-500 font-light mb-8 text-center">
                    รอบเกม ID: {roundId} - เตรียมตัวให้พร้อม!
                </p>

                {/* Countdown Timer */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-rose-200 p-8 mb-8 text-center">
                    <p className="text-lg text-rose-600 font-light mb-4">เกมจะเริ่มใน:</p>
                    <div className="flex justify-center gap-4">
                        <TimeSegment value={time.days} label="วัน" />
                        <TimeSegment value={time.hours} label="ชม." />
                        <TimeSegment value={time.minutes} label="นาที" />
                        <TimeSegment value={time.seconds} label="วินาที" />
                    </div>
                </div>

                {/* My Card Preview */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-sky-100 p-6 mb-8">
                    <h3 className="text-xl font-light text-slate-700 mb-3">ตารางบิงโกของคุณ</h3>
                    <div className="grid grid-cols-5 gap-1 border-2 border-indigo-500 p-2 rounded-lg max-w-xs mx-auto">
                        {cardNumbers.map((num, index) => (
                            <div
                                key={index}
                                className={`w-full aspect-square flex items-center justify-center rounded text-sm font-semibold ${
                                    num === 'FREE' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-800'
                                }`}
                            >
                                {num}
                            </div>
                        ))}
                    </div>
                    <p className="text-center text-xs text-slate-500 mt-4">
                        คุณสร้างตารางเรียบร้อยแล้ว หากต้องการแก้ไข <Link href={`/round/${roundId}/card-setup`} className="text-sky-600 underline">คลิกที่นี่</Link> (ก่อนเวลาเริ่ม)
                    </p>
                </div>

                {/* Action Button (ไม่จำเป็นต้องมี เพราะ Timer จะ Redirect เอง) */}
                <button
                    onClick={() => router.push(`/round/${roundId}/play`)}
                    disabled={!isGameStarted}
                    className={`w-full py-3 rounded-xl font-light transition-all ${!isGameStarted ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                    {isGameStarted ? '🎮 เข้าสู่ห้องเล่นบิงโก!' : '⏳ รอเวลาเริ่มเกม...'}
                </button>

                {/* Tip */}
                <div className="mt-6 bg-sky-50/70 backdrop-blur-sm border border-sky-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">💡</span>
                        <p className="text-sm text-sky-700 font-light">
                            เตรียมพร้อม! เมื่อเกมเริ่มคุณจะต้องทำเครื่องหมายหมายเลขที่ถูกเรียกบนตารางบิงโกของคุณ
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Component ช่วยแสดงผลเวลา
const TimeSegment = ({ value, label }) => (
    <div className="flex flex-col items-center min-w-[70px]">
        <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-400 to-orange-400 rounded-xl blur-lg opacity-50"></div>
            <div className="relative bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl px-4 py-3 min-w-[60px] flex items-center justify-center">
                <p className="text-3xl font-light">
                    {String(value).padStart(2, '0')}
                </p>
            </div>
        </div>
        <p className="text-sm text-slate-600 mt-1 font-light">{label}</p>
    </div>
);

export default GameLobbyPage;