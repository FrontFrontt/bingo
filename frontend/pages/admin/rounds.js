// /frontend/pages/admin/rounds.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/admin";

// ฟังก์ชันช่วยเหลือสำหรับแสดงวันที่
const formatDateTime = (dateString) => {
    if (!dateString) return 'ไม่ระบุเวลา';
    let date = new Date(dateString);
    if (isNaN(date.getTime()) && typeof dateString === 'string') {
        date = new Date(dateString.replace(' ', 'T'));
    }
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('th-TH', {
        dateStyle: 'short',
        timeStyle: 'short'
    });
};

const AdminRoundsPage = () => {
    const [rounds, setRounds] = useState([]);
    const [newRound, setNewRound] = useState({
        title: '',
        start_time: '',
        end_time: '',
        play_time: '',
        ticket_price: 10,
        prize_amount: 1000
    });

    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;
    const [selectedRoundId, setSelectedRoundId] = useState(null);

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        fetchRounds();
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setNewRound(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const fetchRounds = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${ADMIN_API_BASE}/rounds`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRounds(response.data);
        } catch (error) {
            console.error('Error fetching rounds:', error);
            alert('เกิดข้อผิดพลาดในการโหลดรอบเกม');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRound = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${ADMIN_API_BASE}/rounds`, newRound, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('สร้างรอบเกมใหม่สำเร็จ!');
            setNewRound({ title: '', start_time: '', end_time: '', ticket_price: 10, prize_amount: 1000 });
            fetchRounds();
        } catch (error) {
            console.error('Error creating round:', error.response?.data?.message || error.message);
            alert(`สร้างรอบเกมล้มเหลว: ${error.response?.data?.message || 'โปรดตรวจสอบข้อมูล'}`);
        }
    };

    const getAdminRoundStatus = (round) => {
        const now = new Date().getTime();
        const regEndTime = new Date(round.end_time).getTime();

        // ใช้ play_time สำหรับการตรวจสอบสถานะเกม (ถ้ามี)
        let gameStartTime = new Date(round.play_time).getTime();

        // Fallback: ถ้า play_time ยังไม่มีใน DB (เก่า) ให้ใช้ end_time
        if (isNaN(gameStartTime)) {
            gameStartTime = regEndTime;
        }

        if (now > gameStartTime) {
            return { text: 'จบงานแล้ว', color: 'text-slate-500', bgColor: 'bg-slate-50', borderColor: 'border-slate-200' };
        }
        if (now > regEndTime) {
            return { text: 'รอเริ่มเล่น', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
        }
        return {
            text: round.is_active ? 'เปิดลงทะเบียน' : 'ถูกปิด',
            color: round.is_active ? 'text-emerald-600' : 'text-slate-500',
            bgColor: round.is_active ? 'bg-emerald-50' : 'bg-slate-50',
            borderColor: round.is_active ? 'border-emerald-200' : 'border-slate-200'
        };
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600 font-light">กำลังโหลดข้อมูล...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin/dashboard"
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-light mb-4 transition-colors">
                        <span>←</span>
                        <span>กลับสู่ Dashboard</span>
                    </Link>
                    <h1 className="text-3xl font-light text-slate-700 mb-2">จัดการรอบเกม</h1>
                    <p className="text-slate-400 font-light text-sm">สร้างและจัดการรอบเกม Bingo</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* ส่วนสร้างรอบเกม */}
                    <div className="col-span-1">
                        <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-sky-100 sticky top-6">
                            <h2 className="text-xl font-light text-slate-700 mb-6">สร้างรอบเกมใหม่</h2>

                            <form onSubmit={handleCreateRound} className="space-y-4">

                                {/* ชื่อรอบเกม */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">ชื่อรอบเกม</label>
                                    <input
                                        type="text"
                                        name="title"
                                        placeholder="เช่น รอบเช้า 11:00"
                                        required
                                        value={newRound.title}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>

                                {/* วัน/เวลาเริ่มการลงทะเบียน (start_time) */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">วัน/เวลาเริ่มการลงทะเบียน</label>
                                    <input
                                        type="datetime-local"
                                        name="start_time"
                                        required
                                        value={newRound.start_time}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>

                                {/* วัน/เวลาสิ้นสุดการลงทะเบียน (end_time) */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">วัน/เวลาสิ้นสุดการลงทะเบียน</label>
                                    <input
                                        type="datetime-local"
                                        name="end_time"
                                        required
                                        value={newRound.end_time}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>

                                {/* **NEW INPUT: วัน/เวลาเริ่มเล่นเกม (play_time)** */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">วัน/เวลาเริ่มเล่นเกม</label>
                                    <input
                                        type="datetime-local"
                                        name="play_time"
                                        required
                                        value={newRound.play_time}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>
                                {/* ---------------------------------------------------- */}

                                {/* ราคาตั๋ว */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">ราคาตั๋ว (บาท)</label>
                                    <input
                                        type="number"
                                        name="ticket_price"
                                        placeholder="10"
                                        required
                                        value={newRound.ticket_price}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>

                                {/* เงินรางวัล */}
                                <div>
                                    <label className="block text-xs font-light text-slate-500 mb-2 uppercase tracking-wider">เงินรางวัล (บาท)</label>
                                    <input
                                        type="number"
                                        name="prize_amount"
                                        placeholder="1000"
                                        required
                                        value={newRound.prize_amount}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-light py-3 rounded-xl transition-colors mt-6"
                                >
                                    สร้างรอบเกม
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* ส่วนแสดงรายการรอบเกม */}
                    <div className="col-span-1 lg:col-span-2">
                        {/* ... (Header List เดิม) ... */}
                        <div className="space-y-4">
                            {rounds.length === 0 ? (
                                <div className="bg-white/60 backdrop-blur-sm p-12 rounded-2xl shadow-sm border border-sky-100 text-center">
                                    <div className="text-6xl mb-4">🎮</div>
                                    <p className="text-slate-400 font-light">ยังไม่มีรอบเกม</p>
                                </div>
                            ) : (
                                rounds.map(round => {
                                    const statusInfo = getAdminRoundStatus(round);

                                    return (
                                        <div
                                            key={round.round_id}
                                            className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border ${statusInfo.borderColor} hover:shadow-md transition-all`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                {/* ... (Title และ Status เดิม) ... */}
                                                <div className="flex-1">
                                                    <h3 className="font-light text-lg text-slate-700 mb-1">
                                                        {round.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-light">
                                                        ID: {round.round_id}
                                                    </p>
                                                </div>

                                                <span className={`px-3 py-1 rounded-full text-xs font-light ${statusInfo.bgColor} ${statusInfo.color}`}>
                                                    {statusInfo.text}
                                                </span>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-400 font-light">👥</span>
                                                    <span className="text-slate-600 font-light">
                                                        ผู้เข้าร่วม: <span className="font-normal">{round.participant_count || 0}</span> คน
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-400 font-light">📅</span>
                                                    <span className="text-slate-600 font-light">
                                                        ลงทะเบียน: {formatDateTime(round.start_time)} ถึง {formatDateTime(round.end_time)}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-400 font-light">🎮</span>
                                                    <span className="text-slate-700 font-normal">
                                                        เล่นจริง: {formatDateTime(round.play_time || round.end_time)}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* ... (เงินรางวัล, ราคาตั๋ว, ปุ่มเดิม) ... */}
                                            <div className="flex items-center gap-6 pb-4 mb-4 border-b border-slate-100">
                                                <div>
                                                    <p className="text-xs text-slate-400 font-light mb-1">เงินรางวัล</p>
                                                    <p className="text-lg font-light text-emerald-600">{round.prize_amount.toLocaleString()} ฿</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-light mb-1">ราคาตั๋ว</p>
                                                    <p className="text-lg font-light text-sky-600">{round.ticket_price.toLocaleString()} ฿</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-light mb-1">ผู้ชนะ(บิงโก!)</p>
                                                    <p className="text-lg font-light text-slate-700">{round.winning_number || '—'}</p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setSelectedRoundId(round.round_id)}
                                                className="text-sm text-sky-600 hover:text-sky-700 font-light flex items-center gap-2 transition-colors"
                                            >
                                                <span>ดูรายชื่อผู้เล่น</span>
                                                <span>→</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {selectedRoundId && (
                <RoundPlayersModal roundId={selectedRoundId} onClose={() => setSelectedRoundId(null)} />
            )}
        </div>
    );
};

// Component Modal สำหรับแสดงรายชื่อผู้เล่น
const RoundPlayersModal = ({ roundId, onClose }) => {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const response = await axios.get(`${ADMIN_API_BASE}/rounds/${roundId}/players`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPlayers(response.data);
            } catch (error) {
                console.error("Error fetching players:", error);
                alert("ไม่สามารถดึงรายชื่อผู้เล่นได้");
            } finally {
                setLoading(false);
            }
        };
        fetchPlayers();
    }, [roundId]);

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-sky-100">

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-light text-slate-700">ผู้เล่นในรอบเกม</h2>
                        <p className="text-sm text-slate-400 font-light mt-1">Round #{roundId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors text-slate-400 hover:text-slate-600"
                    >
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-light">กำลังโหลด...</p>
                    </div>
                ) : players.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🎮</div>
                        <p className="text-slate-400 font-light">ยังไม่มีผู้เล่นที่ยืนยันตารางบิงโกในรอบนี้</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ตารางบิงโก</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ชนะ</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">เงินรางวัล</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {players.map((player, index) => (
                                    <tr
                                        key={index}
                                        className={`${player.is_winner ? 'bg-amber-50' : 'hover:bg-sky-50/30'} transition-colors`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-slate-700">
                                            {player.username}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-light text-slate-500 max-w-sm overflow-hidden truncate">
                                            {player.card_numbers}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {player.is_winner ? (
                                                <span className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-full text-xs font-light">✓ ชนะ</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-slate-700">
                                            {player.win_amount > 0 ? (
                                                <span className="text-emerald-600 font-normal">{player.win_amount.toLocaleString()} ฿</span>
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white font-light rounded-xl transition-colors"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminRoundsPage;