// /frontend/pages/round/[roundId]/lobby.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';

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

    useEffect(() => {
        if (!roundId || !token) return;

        const fetchLobbyData = async () => {
            try {
                const response = await axios.get(`${LOBBY_API_BASE}/${roundId}/lobby`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                setLobbyData(data);
                // Note: โค้ดนี้จะใช้ได้เฉพาะเมื่อ userController.js ถูกแก้ให้สร้าง Card_numbers เป็น JSON String 
                // หรือในตอนแรกที่ลงทะเบียน Card Numbers ถูกสร้างขึ้นแล้ว (ตาม Logic เดิม)
                setCardNumbers(JSON.parse(data.myCard.card_numbers));

                // **แก้ไข: ใช้ play_time ในการคำนวณเวลานับถอยหลัง**
                let gameStartTime = new Date(data.game.play_time); // <--- ใช้ play_time

                // รองรับ MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) 
                if (isNaN(gameStartTime.getTime()) && typeof data.game.play_time === 'string') {
                    gameStartTime = new Date(data.game.play_time.replace(' ', 'T'));
                }

                const gameStartTimeMs = gameStartTime.getTime();
                const now = new Date().getTime();
                const remaining = Math.max(0, Math.floor((gameStartTimeMs - now) / 1000));
                setTimeRemaining(remaining);

            } catch (error) {
                alert(error.response?.data?.message || 'ไม่สามารถโหลดข้อมูล Lobby ได้');
                router.push('/');
            } finally {
                setLoading(false);
            }
        };

        fetchLobbyData();
    }, [roundId]);

    useEffect(() => {
        if (timeRemaining <= 0) return;

        const timer = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // 🎯 แก้ไข: เปลี่ยนไปที่หน้า card-setup แทน play
                    router.push(`/round/${roundId}/card-setup`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeRemaining]);

    if (loading || !lobbyData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-light text-lg">กำลังโหลด Game Lobby...</p>
                </div>
            </div>
        );
    }

    const isGameStarted = timeRemaining <= 0;
    const { days, hours, minutes, seconds } = formatTime(timeRemaining);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-6 md:p-12">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/"
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-light mb-4 transition-colors">
                        <span>←</span>
                        <span>กลับหน้าหลัก</span>
                    </Link>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-light text-slate-700">
                            {lobbyData?.game?.title || 'Game Lobby'}
                        </h1>
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-light">
                            {isGameStarted ? '🎮 เริ่มแล้ว' : '⏳ รอเริ่ม'}
                        </span>
                    </div>
                    <p className="text-slate-400 font-light text-sm">รอบที่ #{roundId}</p>
                </div>

                {/* Countdown Timer */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-12 border border-sky-100 mb-8">
                    {isGameStarted ? (
                        <div className="text-center">
                            <div className="text-7xl mb-4 animate-bounce">🎉</div>
                            <p className="text-3xl font-light text-emerald-600 mb-2">เกมเริ่มแล้ว!</p>
                            <p className="text-slate-400 font-light">กดปุ่มด้านล่างเพื่อเข้าเล่น</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-sm text-slate-400 font-light uppercase tracking-wider mb-6">
                                เกมจะเริ่มต้นใน
                            </p>

                            {/* Countdown Display */}
                            <div className="flex justify-center items-center gap-3 md:gap-6">
                                {days > 0 && (
                                    <>
                                        <TimeSegment value={days} label="วัน" />
                                        <span className="text-3xl text-slate-300 font-light">:</span>
                                    </>
                                )}
                                <TimeSegment value={hours} label="ชั่วโมง" />
                                <span className="text-3xl text-slate-300 font-light">:</span>
                                <TimeSegment value={minutes} label="นาที" />
                                <span className="text-3xl text-slate-300 font-light">:</span>
                                <TimeSegment value={seconds} label="วินาที" />
                            </div>

                            <p className="text-slate-400 font-light text-sm mt-6">
                                เตรียมตัวให้พร้อม...
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Players List */}
                    <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-sky-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-light text-slate-700">ผู้เข้าร่วม</h2>
                            <div className="px-4 py-2 bg-sky-50 rounded-full">
                                <span className="text-sm font-light text-sky-600">
                                    {lobbyData.players.length} คน
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
                            {lobbyData.players.map((player, index) => (
                                <div
                                    key={player.card_id}
                                    className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/50 hover:bg-sky-100/50 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-xs font-light">{index + 1}</span>
                                    </div>
                                    <span className="text-sm font-light text-slate-700">{player.username}</span>
                                </div>
                            ))}
                        </div>
                        {lobbyData.players.length === 0 && (
                            <div className="text-center py-8">
                                <div className="text-5xl mb-3">👥</div>
                                <p className="text-slate-400 font-light text-sm">ยังไม่มีผู้เล่นคนอื่น</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Game Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">💎</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">เงินรางวัล</p>
                                <p className="text-xl font-light text-emerald-600">
                                    {lobbyData.game.prize_amount?.toLocaleString()} ฿
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🎟️</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">ราคาตั๋ว</p>
                                <p className="text-xl font-light text-sky-600">
                                    {lobbyData.game.ticket_price?.toLocaleString()} ฿
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-amber-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                                <span className="text-2xl">🎮</span>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">สถานะ</p>
                                <p className="text-lg font-light text-amber-600">
                                    {isGameStarted ? 'พร้อมเล่น' : 'กำลังรอ'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Play Button */}
                <button
                    // *** Path สำหรับปุ่มนี้ก็ควรเปลี่ยนไปที่ card-setup ด้วย ***
                    disabled={!isGameStarted}
                    onClick={() => router.push(`/round/${roundId}/card-setup`)} // *** New Path ***
                    className={`w-full py-4 rounded-2xl font-light text-lg transition-all ${isGameStarted
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                >
                    {isGameStarted ? '🎮 เข้าสู่ห้องเล่นบิงโก! (สร้างตาราง)' : '⏳ รอเวลาเริ่มเกม...'}
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
        <p className="text-xs font-light text-slate-400 mt-2 uppercase tracking-wider">{label}</p>
    </div>
);

export default GameLobbyPage;