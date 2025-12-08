// /frontend/pages/admin/transactions.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + '/admin';
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_BASE_URL; // สำหรับดูรูปสลิป

const AdminTransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    // 'all', 'deposit', 'withdraw' (ใช้ 'withdraw' เป็นชื่อ filter สำหรับ 'win')
    const [filterType, setFilterType] = useState('all'); 
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        fetchPendingTransactions();
    }, []);

    const fetchPendingTransactions = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${ADMIN_API_BASE}/transactions/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Note: response.data จะมี transaction_type เป็น 'deposit' หรือ 'win'
            setTransactions(response.data);
        } catch (error) {
            console.error('Error fetching pending transactions:', error);
            alert('เกิดข้อผิดพลาดในการโหลดรายการธุรกรรมที่รออนุมัติ');
        } finally {
            setLoading(false);
        }
    };
    
    const handleUpdateStatus = async (transaction_id, status) => {
        if (!confirm(`ยืนยันการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} ธุรกรรม ID ${transaction_id} หรือไม่?`)) {
            return;
        }
        
        try {
            await axios.put(`${ADMIN_API_BASE}/transactions/${transaction_id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`ทำรายการ ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'} สำเร็จ`);
            fetchPendingTransactions();
        } catch (error) {
            console.error('Error updating transaction status:', error.response?.data?.message || error.message);
            alert(`ทำรายการล้มเหลว: ${error.response?.data?.message || 'โปรดตรวจสอบคอนโซล'}`);
        }
    };

    // Filter transactions by type
    const filteredTransactions = transactions.filter(tx => {
        if (filterType === 'all') return true;
        if (filterType === 'deposit') return tx.transaction_type === 'deposit';
        // 🚨 FIX: Map filter 'withdraw' ไปยัง transaction_type 'win'
        if (filterType === 'withdraw') return tx.transaction_type === 'win';
        return false;
    });

    // 🚨 FIX: คำนวณจำนวนรายการที่รออนุมัติ
    const depositCount = transactions.filter(tx => tx.transaction_type === 'deposit').length;
    // ใช้ 'win' ในการนับจำนวน
    const winCount = transactions.filter(tx => tx.transaction_type === 'win').length; 

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
                    <h1 className="text-3xl font-light text-slate-700 mb-2">อนุมัติธุรกรรม</h1>
                    <p className="text-slate-400 font-light text-sm">จัดการรายการฝาก-ถอนที่รออนุมัติ</p>
                </div>

                {/* Stats & Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Total Pending */}
                    <div 
                        onClick={() => setFilterType('all')}
                        className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${
                            filterType === 'all' ? 'border-sky-300 ring-2 ring-sky-200' : 'border-sky-100 hover:border-sky-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">⏳</span>
                            {filterType === 'all' && <span className="text-xs text-sky-600 font-light">กำลังแสดง</span>}
                        </div>
                        <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">รอทั้งหมด</p>
                        <p className="text-3xl font-light text-slate-700">{transactions.length}</p>
                    </div>

                    {/* Deposit Pending */}
                    <div 
                        onClick={() => setFilterType('deposit')}
                        className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${
                            filterType === 'deposit' ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-emerald-100 hover:border-emerald-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">💰</span>
                            {filterType === 'deposit' && <span className="text-xs text-emerald-600 font-light">กำลังแสดง</span>}
                        </div>
                        <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">เติมเงิน</p>
                        <p className="text-3xl font-light text-emerald-600">{depositCount}</p>
                    </div>

                    {/* Withdraw/Win Pending */}
                    <div 
                        onClick={() => setFilterType('withdraw')} // ใช้ชื่อ filter 'withdraw'
                        className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${
                            filterType === 'withdraw' ? 'border-rose-300 ring-2 ring-rose-200' : 'border-rose-100 hover:border-rose-200'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">💸</span>
                            {filterType === 'withdraw' && <span className="text-xs text-rose-600 font-light">กำลังแสดง</span>}
                        </div>
                        <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">รับรางวัล</p>
                        <p className="text-3xl font-light text-rose-600">{winCount}</p> {/* 🚨 FIX: ใช้ winCount */}
                    </div>

                    {/* Showing Count */}
                    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">📋</span>
                        </div>
                        <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">กำลังแสดง</p>
                        <p className="text-3xl font-light text-sky-600">{filteredTransactions.length}</p>
                    </div>
                </div>
                
                {/* Transactions Table */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-200 bg-white/40">
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ผู้ใช้</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ประเภท</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">จำนวนเงิน</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">หลักฐาน</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">วันที่</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <div className="text-6xl mb-4">✅</div>
                                            <p className="text-slate-400 font-light">
                                                {filterType === 'all' 
                                                    ? 'ไม่มีรายการธุรกรรมที่ต้องอนุมัติ' 
                                                    : `ไม่มีรายการ${filterType === 'deposit' ? 'เติมเงิน' : 'รับรางวัล'}ที่ต้องอนุมัติ`
                                                }
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map((tx) => (
                                        <tr key={tx.transaction_id} className="hover:bg-sky-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-xs font-light text-sky-600">
                                                        {tx.transaction_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-700">{tx.username}</div>
                                                <div className="text-xs font-light text-slate-400">{tx.full_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {/* 🚨 FIX: ใช้ tx.transaction_type เป็น 'deposit' หรือ 'win' */}
                                                {tx.transaction_type === 'deposit' ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-light">
                                                        💰 เติมเงิน
                                                    </span>
                                                ) : (
                                                    // หากเป็น 'win' จะแสดงเป็น 'รับรางวัล'
                                                    <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-light">
                                                        💸 รับรางวัล
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-lg font-light text-slate-700">
                                                    {tx.amount.toLocaleString()} 
                                                    <span className="text-sm ml-1 text-slate-400">฿</span>
                                                </div>
                                            </td>
                                            {/* คอลัมน์หลักฐาน (Proof) */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {tx.proof_image_url ? (
                                                    // ใช้ BACKEND_BASE_URL + tx.proof_image_url
                                                    <a 
                                                        href={`${BACKEND_BASE_URL}${tx.proof_image_url}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-light transition-colors"
                                                    >
                                                        <span>ดูสลิป</span>
                                                        <span>↗</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-300 text-sm font-light">—</span>
                                                )}
                                            </td>
                                            {/* ... (วันที่ and Action columns) ... */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-600">
                                                    {new Date(tx.created_at).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                                <div className="text-xs font-light text-slate-400">
                                                    {new Date(tx.created_at).toLocaleTimeString('th-TH', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleUpdateStatus(tx.transaction_id, 'approved')}
                                                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-light transition-colors"
                                                    >
                                                        ✓ อนุมัติ
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus(tx.transaction_id, 'rejected')}
                                                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-light transition-colors"
                                                    >
                                                        ✕ ปฏิเสธ
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Footer */}
                {filteredTransactions.length > 0 && (
                    <div className="mt-6 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-light text-slate-600">
                                แสดง {filteredTransactions.length} รายการ
                                {filterType === 'deposit' && ' (เติมเงิน)'}
                                {filterType === 'withdraw' && ' (รับรางวัล)'}
                            </p>
                            {filterType !== 'all' && (
                                <button
                                    onClick={() => setFilterType('all')}
                                    className="text-sm text-sky-600 hover:text-sky-700 font-light transition-colors"
                                >
                                    แสดงทั้งหมด
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminTransactionsPage;