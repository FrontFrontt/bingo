// /frontend/pages/index.js (FINAL VERSION - มีการจัดการสถานะการลงทะเบียน)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';

const ACTIVE_ROUNDS_API = process.env.NEXT_PUBLIC_API_BASE_URL + '/rounds/active';
const USER_ROUNDS_API = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/rounds';

const formatDateTime = (dateString) => {
    if (!dateString) return 'ไม่ระบุเวลา';

    let date = new Date(dateString);

    if (isNaN(date.getTime()) && typeof dateString === 'string') {
        date = new Date(dateString.replace(' ', 'T'));
    }

    if (isNaN(date.getTime())) {
        return 'ไม่สามารถแสดงวันที่ได้';
    }

    return date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getRoundStatus = (round) => {
    const now = new Date().getTime();
    const registrationEndTime = new Date(round.end_time).getTime();

    let gameStartTimeMs = NaN;
    if (round.play_time) {
        let tempDate = new Date(round.play_time);
        if (isNaN(tempDate.getTime())) {
            tempDate = new Date(round.play_time.replace(' ', 'T'));
        }
        gameStartTimeMs = tempDate.getTime();
    }
    
    // 3. เกมจบแล้ว (เมื่อถึง/เกิน play_time)
    if (now >= gameStartTimeMs) {
        return { status: 'completed', text: 'จบงานแล้ว', color: 'slate', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
    }

    // 2. หมดเวลาลงทะเบียน (แต่เกมยังไม่เริ่ม)
    if (now >= registrationEndTime) {
        return { status: 'closed-reg', text: 'หมดเวลาลงทะเบียน', color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-amber-300' };
    }

    // 1. เปิดลงทะเบียน
    return { status: 'active', text: 'เปิดลงทะเบียน', color: 'emerald', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300' };
};

const GameRoundList = () => {
    const [rounds, setRounds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userRegistrationStatus, setUserRegistrationStatus] = useState({});

    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    const fetchRegistrationStatus = async (roundsList) => {
        const statusMap = {};
        const requests = roundsList.map(round =>
            axios.get(
                `${USER_ROUNDS_API}/${round.round_id}/registration-status`,
                { headers: { Authorization: `Bearer ${token}` } }
            ).then(response => {
                statusMap[round.round_id] = response.data.isRegistered;
            }).catch(error => {
                // console.error(`Error fetching reg status for round ${round.round_id}:`, error.message);
                statusMap[round.round_id] = false;
            })
        );

        await Promise.all(requests);
        setUserRegistrationStatus(statusMap);
    };

    const fetchRounds = async () => {
        try {
            const response = await axios.get(ACTIVE_ROUNDS_API, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const fetchedRounds = response.data;
            setRounds(fetchedRounds);
            await fetchRegistrationStatus(fetchedRounds);
        } catch (error) {
            console.error('Error fetching rounds:', error.response?.data?.message || error.message);
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('bingoToken');
                localStorage.removeItem('bingoRole');
                router.push('/login');
            }
            setRounds([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (roundId, ticketPrice) => {
        try {
            const response = await axios.post(
                `${USER_ROUNDS_API}/${roundId}/register`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            alert(response.data.message);
            setUserRegistrationStatus(prev => ({ ...prev, [roundId]: true }));
            router.push(`/round/${roundId}/lobby`);

        } catch (error) {
            const msg = error.response?.data?.message || 'เกิดข้อผิดพลาดในการซื้อตั๋ว';
            if (msg.includes('ยอดเงินไม่เพียงพอ')) {
                alert(`❌ ยอดเงินไม่พอ! กรุณาไปหน้าฝากเงิน. ต้องมี ${ticketPrice} บาท`);
                router.push(`/deposit?roundId=${roundId}&amount=${ticketPrice}`);
            } else if (msg.includes('คุณลงทะเบียนรอบนี้แล้ว')) {
                router.push(`/round/${roundId}/lobby`);
            } else {
                alert(`❌ ${msg}`);
            }
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('bingoToken');
        localStorage.removeItem('bingoRole');
        router.push('/login');
    };

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        fetchRounds();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-light">กำลังโหลดรอบเกม...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
            <div className="max-w-5xl mx-auto p-6 md:p-12">
                
                {/* Header */}
                <header className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-light text-slate-700 mb-1">รอบเกมบิงโก</h1>
                            <p className="text-sm text-slate-400 font-light">เลือกรอบที่ต้องการเข้าร่วม</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link 
                                href="/user/profile" 
                                className="px-4 py-2 rounded-xl border border-sky-200 bg-sky-50/50 hover:bg-sky-100/50 text-sky-600 font-light transition-all text-sm"
                            >
                                👤 โปรไฟล์
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 text-slate-600 font-light transition-all text-sm"
                            >
                                🚪 ออกจากระบบ
                            </button>
                        </div>
                    </div>
                </header>

                {/* Rounds List */}
                {rounds.length === 0 ? (
                    <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 p-12 text-center">
                        <div className="text-7xl mb-4">🎮</div>
                        <p className="text-xl font-light text-slate-700 mb-2">ยังไม่มีรอบเกมเปิดอยู่ในขณะนี้</p>
                        <p className="text-sm text-slate-400 font-light">โปรดรอผู้ดูแลระบบเปิดรอบเกมใหม่</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {rounds.map(round => {
                            const status = getRoundStatus(round);
                            const isRegistered = userRegistrationStatus[round.round_id];

                            let cardClass = 'bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border transition-all ';
                            let badgeClass = 'px-3 py-1 rounded-full text-xs font-light ';

                            // --- Logic การกำหนด Class ตามสถานะ ---
                            if (status.status === 'completed') {
                                cardClass += 'border-slate-200 opacity-60';
                                badgeClass += 'bg-slate-100 text-slate-500';
                            } else if (status.status === 'closed-reg') {
                                badgeClass += 'bg-amber-100 text-amber-600';
                                if (isRegistered) {
                                    // หมดเวลาแล้ว แต่ลงทะเบียนแล้ว = รอเล่น
                                    cardClass += 'border-amber-400 hover:shadow-md ring-2 ring-amber-100'; 
                                } else {
                                    // หมดเวลาแล้ว และยังไม่ได้ลงทะเบียน = ลงทะเบียนไม่ทัน
                                    cardClass += 'border-amber-200 opacity-80'; 
                                }
                            } else if (isRegistered) {
                                cardClass += 'border-emerald-300 hover:shadow-md ring-2 ring-emerald-100';
                                badgeClass += 'bg-emerald-100 text-emerald-600';
                            } else {
                                cardClass += 'border-sky-200 hover:shadow-md';
                                badgeClass += 'bg-sky-100 text-sky-600';
                            }

                            return (
                                <div key={round.round_id} className={cardClass + ' p-6'}>
                                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                                        <div className="flex-1">
                                            <h3 className="text-2xl font-light text-slate-700 mb-2">{round.title}</h3>
                                            
                                            {isRegistered && (
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-600 font-light mb-3">
                                                    <span>✓</span>
                                                    <span>คุณลงทะเบียนแล้ว</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <span className={badgeClass + ' whitespace-nowrap'}>
                                            {status.text}
                                        </span>
                                    </div>

                                    {/* Prize & Ticket Info */}
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl">
                                            <p className="text-xs text-emerald-600 font-light uppercase tracking-wider mb-1">เงินรางวัล</p>
                                            <p className="text-2xl font-light text-emerald-700">
                                                {parseFloat(round.prize_amount).toLocaleString()}
                                                <span className="text-sm ml-1">฿</span>
                                            </p>
                                        </div>
                                        <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 p-4 rounded-xl">
                                            <p className="text-xs text-sky-600 font-light uppercase tracking-wider mb-1">ราคาตั๋ว</p>
                                            <p className="text-2xl font-light text-sky-700">
                                                {parseFloat(round.ticket_price).toLocaleString()}
                                                <span className="text-sm ml-1">฿</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                                        <div className="flex items-start gap-3">
                                            <span className="text-slate-400 mt-0.5">📅</span>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-light mb-1">ช่วงลงทะเบียน</p>
                                                <p className="text-sm text-slate-600 font-light">
                                                    {formatDateTime(round.start_time)} - {formatDateTime(round.end_time)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-start gap-3">
                                            <span className="text-slate-400 mt-0.5">🎮</span>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-light mb-1">วันที่เล่นจริง</p>
                                                <p className="text-sm text-slate-700 font-normal">
                                                    {formatDateTime(round.play_time)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <span className="text-slate-400 mt-0.5">👥</span>
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-400 font-light mb-1">ผู้เข้าร่วม</p>
                                                <p className="text-sm text-slate-700 font-normal">
                                                    {round.participant_count || 0} คน
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        className={`w-full py-3 rounded-xl font-light transition-all ${
                                            status.status === 'completed' || (status.status === 'closed-reg' && !isRegistered)
                                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                                : isRegistered || status.status === 'closed-reg' // ลงทะเบียนแล้ว หรือหมดเวลาแล้ว (แต่ลงแล้ว)
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                                : 'bg-sky-500 hover:bg-sky-600 text-white'
                                        }`}
                                        
                                        // ปิดใช้งานปุ่ม ถ้าเกมจบแล้ว หรือ หมดเวลาลงทะเบียนและผู้ใช้ไม่ได้ลง
                                        disabled={
                                            status.status === 'completed' || 
                                            (status.status === 'closed-reg' && !isRegistered)
                                        }

                                        onClick={() => {
                                            if (isRegistered && status.status !== 'completed') {
                                                router.push(`/round/${round.round_id}/lobby`);
                                            } else if (status.status === 'active') {
                                                handleRegister(round.round_id, round.ticket_price);
                                            } else {
                                                alert(`❌ ${status.text} แล้ว คุณไม่สามารถเข้าร่วมได้`);
                                            }
                                        }}
                                    >
                                        {status.status === 'completed'
                                            ? 'รอบนี้จบแล้ว'
                                            : (status.status === 'closed-reg' && !isRegistered)
                                            ? 'หมดเวลาลงทะเบียน' // ข้อความสำหรับกรณีหมดเวลาและไม่ได้ลง
                                            : (isRegistered || status.status === 'closed-reg') // ถ้าลงทะเบียนแล้ว หรือหมดเวลาแล้ว (แต่ลงแล้ว)
                                            ? '✓ เข้าสู่ Game Lobby'
                                            : `ซื้อตั๋วบิงโก (${round.ticket_price} ฿)`
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-slate-400 font-light">
                        เข้าสู่ระบบในฐานะ: {localStorage.getItem('bingoRole') || 'user'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GameRoundList;