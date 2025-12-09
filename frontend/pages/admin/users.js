// /frontend/pages/admin/users.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import axios from 'axios';

const ADMIN_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL + "/admin";

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${ADMIN_API_BASE}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
        } finally {
            setLoading(false);
        }
    };

    // Filter users based on search term
    const filteredUsers = users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone_number?.includes(searchTerm)
    );

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
                    <h1 className="text-3xl font-light text-slate-700 mb-2">จัดการผู้ใช้</h1>
                    <p className="text-slate-400 font-light text-sm">แสดงผู้ใช้ทั้งหมด {users.length} ราย</p>
                </div>

                {/* Search & Stats Bar */}
                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="ค้นหาผู้ใช้..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-sky-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 font-light bg-white/50"
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">ทั้งหมด</p>
                                <p className="text-2xl font-light text-slate-700">{users.length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">กำลังแสดง</p>
                                <p className="text-2xl font-light text-sky-600">{filteredUsers.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Users Table */}
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b border-slate-200 bg-white/40">
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ชื่อผู้ใช้</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">เบอร์โทร</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">วันที่สมัคร</th>
                                    <th className="px-6 py-4 text-left text-xs font-light text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center">
                                            <div className="text-6xl mb-4">👤</div>
                                            <p className="text-slate-400 font-light">ไม่พบผู้ใช้ที่ค้นหา</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.user_id} className="hover:bg-sky-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center text-xs font-light text-sky-600">
                                                        {user.user_id}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-700">{user.username}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-600">
                                                    {user.full_name || <span className="text-slate-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-600">
                                                    {user.phone_number || <span className="text-slate-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-light text-slate-600">
                                                    {new Date(user.created_at).toLocaleDateString('th-TH', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button className="text-sm text-sky-600 hover:text-sky-700 font-light transition-colors flex items-center gap-2 ml-auto">
                                                    <span>ดูรายละเอียด</span>
                                                    <span>→</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Summary Card */}
                {filteredUsers.length > 0 && (
                    <div className="mt-6 bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-light text-slate-600">
                                แสดง {filteredUsers.length} จาก {users.length} รายการ
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-sm text-sky-600 hover:text-sky-700 font-light transition-colors"
                                >
                                    ล้างการค้นหา
                                </button>
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminUsersPage;