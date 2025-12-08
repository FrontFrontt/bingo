// /frontend/pages/user/profile.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/profile';
// Endpoint สำหรับการแก้ไขข้อมูล (สมมติว่าเป็น PUT)
const UPDATE_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL + '/users/profile';

const UserProfilePage = () => {
    const [profile, setProfile] = useState({});
    const [editData, setEditData] = useState({}); // ข้อมูลที่ใช้ในการแก้ไข
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [updateMessage, setUpdateMessage] = useState(null); // ข้อความแจ้งเตือนหลังอัปเดต
    const router = useRouter();
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;


    const handleLogout = () => {
        localStorage.removeItem('bingoToken');
        localStorage.removeItem('bingoRole');
        router.push('/login');
    };
    
    // ฟังก์ชันดึงข้อมูลโปรไฟล์ (แยกออกมาเพื่อเรียกใช้ซ้ำได้)
    const fetchProfile = async () => {
        try {
            const response = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            setProfile(data);
            // ตั้งค่าข้อมูลแก้ไขเริ่มต้นเมื่อโหลดโปรไฟล์
            setEditData({
                full_name: data.full_name || '',
                phone_number: data.phone_number || '',
                bank_account_info: data.bank_account_info || ''
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
            if (error.response?.status === 401) {
                localStorage.removeItem('bingoToken');
                router.push('/login');
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        setEditData({ ...editData, [e.target.name]: e.target.value });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setUpdateMessage(null);
        setLoading(true);

        try {
            // ส่งข้อมูลแก้ไขไปยัง Backend (ต้องสร้าง Endpoint PUT /api/users/profile ใน Backend)
            await axios.put(UPDATE_API_URL, editData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // อัปเดตสำเร็จ: ดึงข้อมูลใหม่
            await fetchProfile(); 
            setIsEditing(false);
            setUpdateMessage({ type: 'success', text: '✅ อัปเดตข้อมูลโปรไฟล์สำเร็จ!' });

        } catch (error) {
            console.error('Error updating profile:', error.response?.data?.message || error);
            setUpdateMessage({ 
                type: 'error', 
                text: error.response?.data?.message || '❌ เกิดข้อผิดพลาดในการอัปเดตข้อมูล' 
            });
            setLoading(false);
        }
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

    // ฟังก์ชันแสดงข้อมูลในโหมดดู (View Mode)
    const renderField = (label, key, placeholder) => (
        <div className="pb-6 border-b border-slate-100 last:border-b-0">
            <label className="block text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
                {label}
            </label>
            <p className="text-xl font-light text-slate-700">
                {profile[key] || <span className="text-slate-300">{placeholder}</span>}
            </p>
        </div>
    );
    
    // ฟังก์ชันแสดงข้อมูลในโหมดแก้ไข (Edit Mode)
    const renderEditField = (label, key, type = 'text') => (
        <div className="pb-6 border-b border-slate-100 last:border-b-0">
            <label htmlFor={key} className="block text-sm text-slate-600 font-medium mb-1">
                {label}
            </label>
            <input
                id={key}
                name={key}
                type={type}
                value={editData[key]}
                onChange={handleChange}
                className="w-full mt-1 p-2 border border-sky-200 rounded-lg text-lg focus:ring-sky-500 focus:border-sky-500 transition-all"
                placeholder={`กรอก${label}`}
                required={key === 'full_name'} // ชื่อ-นามสกุลบังคับกรอก
            />
        </div>
    );


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">

                {/* Header & Navigation */}
                <header className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 p-6 mb-8">
                    <div className="flex items-center justify-between">
                        <Link href="/" 
                            className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-light transition-colors">
                            <span>←</span>
                            <span>กลับหน้าหลัก</span>
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 text-slate-600 font-light transition-all text-sm"
                        >
                            🚪 ออกจากระบบ
                        </button>
                    </div>
                </header>

                {/* Profile Header */}
                <div className="text-center mb-8">
                    <div className="inline-block mb-4">
                        <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                            <span className="text-5xl">👤</span>
                        </div>
                    </div>
                    <h1 className="text-3xl font-light text-slate-700 mb-2">โปรไฟล์ของฉัน</h1>
                    <p className="text-slate-400 font-light text-sm">ข้อมูลส่วนตัวและบัญชี</p>
                </div>
                
                {/* Update Message */}
                {updateMessage && (
                    <div className={`p-4 rounded-xl mb-4 ${updateMessage.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        <p className="font-medium">{updateMessage.text}</p>
                    </div>
                )}


                {/* Profile Info Card */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-sky-100 mb-6">
                    
                    {/* Username (แสดงอย่างเดียว) */}
                    <div className="pb-6 border-b border-slate-100">
                        <label className="block text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
                            ชื่อผู้ใช้
                        </label>
                        <p className="text-xl font-light text-slate-700">{profile.username}</p>
                    </div>

                    {isEditing ? (
                        // --- EDIT MODE ---
                        <form onSubmit={handleUpdateProfile} className="space-y-6 pt-6">
                            {renderEditField('ชื่อ-นามสกุล', 'full_name')}
                            {renderEditField('เบอร์โทรศัพท์', 'phone_number', 'tel')}
                            {renderEditField('ข้อมูลบัญชีธนาคาร (เลขบัญชี/ชื่อธนาคาร)', 'bank_account_info')}
                            
                            <div className="mt-8 flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 
                                    transition-all duration-200 text-white font-light py-3 rounded-xl shadow-lg 
                                    hover:shadow-xl active:scale-[0.98] items-center justify-center gap-2"
                                >
                                    <span>💾</span>
                                    <span>บันทึกข้อมูล</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-none w-24 border border-slate-300 bg-slate-100 text-slate-700 font-light py-3 rounded-xl hover:bg-slate-200"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </form>

                    ) : (
                        // --- VIEW MODE ---
                        <div className="space-y-6 pt-6">
                            {renderField('ชื่อ-นามสกุล', 'full_name', 'ยังไม่ได้ระบุ')}
                            {renderField('เบอร์โทรศัพท์', 'phone_number', 'ยังไม่ได้ระบุ')}
                            {renderField('ข้อมูลบัญชีธนาคาร', 'bank_account_info', 'ยังไม่ได้ระบุ')}
                        
                            {/* Edit Button */}
                            <div className="mt-8">
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 
                                    transition-all duration-200 text-white font-light py-3 rounded-xl shadow-lg 
                                    hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <span>✏️</span>
                                    <span>แก้ไขข้อมูล</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Boxes Grid (Unchanged) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Balance Info */}
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 backdrop-blur-sm rounded-2xl p-6 border border-emerald-200">
                        <div className="flex items-start gap-3">
                            <span className="text-3xl">💰</span>
                            <div className="flex-1">
                                <p className="text-xs text-emerald-600 font-light uppercase tracking-wider mb-1">ยอดเงินคงเหลือ</p>
                                <p className="text-2xl font-light text-emerald-700">
                                    {profile.wallet_balance?.toLocaleString() || '0'}
                                    <span className="text-sm ml-1">฿</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Member Since */}
                    <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 backdrop-blur-sm rounded-2xl p-6 border border-sky-200">
                        <div className="flex items-start gap-3">
                            <span className="text-3xl">📅</span>
                            <div className="flex-1">
                                <p className="text-xs text-sky-600 font-light uppercase tracking-wider mb-1">สมาชิกตั้งแต่</p>
                                <p className="text-lg font-light text-sky-700">
                                    {profile.created_at 
                                        ? new Date(profile.created_at).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'N/A'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Note Box (Unchanged) */}
                <div className="bg-amber-50/70 backdrop-blur-sm border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div className="flex-1">
                            <p className="text-sm font-normal text-amber-800 mb-2">หมายเหตุ</p>
                            <p className="text-sm text-amber-700 font-light leading-relaxed">
                                คุณสามารถดูและแก้ไขข้อมูลส่วนตัว เช่น ข้อมูลบัญชีธนาคารสำหรับรับเงินรางวัล ได้ที่หน้านี้
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Unchanged) */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                    <Link href="/deposit">
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">💰</span>
                                </div>
                                <div>
                                    <p className="font-light text-slate-700 text-sm">ฝากเงิน</p>
                                    <p className="text-xs text-slate-400 font-light">เติมเงินเข้าระบบ</p>
                                </div>
                            </div>
                        </div>
                    </Link>

                    <Link href="/">
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">🎮</span>
                                </div>
                                <div>
                                    <p className="font-light text-slate-700 text-sm">รอบเกม</p>
                                    <p className="text-xs text-slate-400 font-light">เข้าร่วมเล่นบิงโก</p>
                                </div>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default UserProfilePage;