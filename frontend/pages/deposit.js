// /frontend/pages/deposit.js
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Link from 'next/link';

const API_URL = 'http://localhost:4000/api/rounds/deposit';

const DepositPage = () => {
    const router = useRouter();
    const { roundId, amount } = router.query;

    const [depositAmount, setDepositAmount] = useState(amount || '');
    const [proofSlip, setProofSlip] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('bingoToken') : null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setProofSlip(file);
        
        // Create preview
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!proofSlip) {
            setError('กรุณาแนบสลิปหลักฐานการโอนเงิน');
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('round_id', roundId);
        formData.append('amount', depositAmount);
        formData.append('proof_slip', proofSlip);

        try {
            await axios.post(API_URL, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            alert('✅ ส่งคำขอซื้อตั๋ว/ฝากเงินสำเร็จ! โปรดรอ Admin อนุมัติ');
            router.push('/');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'การส่งคำขอล้มเหลว');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 p-6 md:p-12">
            <div className="max-w-2xl mx-auto">
                
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" 
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 font-light mb-4 transition-colors">
                        <span>←</span>
                        <span>กลับหน้าหลัก</span>
                    </Link>
                    <h1 className="text-3xl font-light text-slate-700 mb-2">ซื้อตั๋ว / ฝากเงิน</h1>
                    <p className="text-slate-400 font-light text-sm">แนบหลักฐานการโอนเงินเพื่อซื้อตั๋ว</p>
                </div>

                {/* Main Card */}
                <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-8 border border-sky-100 mb-6">
                    
                    {/* Round Info */}
                    <div className="bg-sky-50/50 rounded-2xl p-4 mb-6 border border-sky-100">
                        <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-1">รอบเกม</p>
                        <p className="text-2xl font-light text-slate-700">#{roundId}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Amount Input */}
                        <div>
                            <label className="block text-slate-600 text-xs font-light mb-2 uppercase tracking-wider">
                                จำนวนเงินที่โอน (บาท)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">💰</span>
                                <input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-sky-100 bg-white/50 
                                    focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 
                                    transition font-light text-slate-700 text-lg"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-slate-600 text-xs font-light mb-2 uppercase tracking-wider">
                                แนบหลักฐานการโอน (สลิป/รูปภาพ)
                            </label>
                            
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                    required
                                />
                                <label 
                                    htmlFor="file-upload"
                                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-sky-200 rounded-2xl cursor-pointer bg-sky-50/30 hover:bg-sky-50/50 transition-all"
                                >
                                    {previewUrl ? (
                                        <div className="relative w-full h-full p-2">
                                            <img 
                                                src={previewUrl} 
                                                alt="Preview" 
                                                className="w-full h-full object-contain rounded-xl"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <div className="text-5xl mb-2">📎</div>
                                            <p className="text-sm text-slate-500 font-light">คลิกเพื่อเลือกไฟล์</p>
                                            <p className="text-xs text-slate-400 font-light mt-1">รองรับไฟล์รูปภาพ</p>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {proofSlip && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                                    <span className="text-emerald-500">✓</span>
                                    <span className="font-light">{proofSlip.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProofSlip(null);
                                            setPreviewUrl(null);
                                            document.getElementById('file-upload').value = '';
                                        }}
                                        className="ml-auto text-rose-500 hover:text-rose-600 text-xs font-light"
                                    >
                                        ลบ
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-2">
                                <span className="text-rose-500 mt-0.5">⚠</span>
                                <p className="text-rose-600 text-sm font-light flex-1">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 
                            transition-all duration-200 text-white font-light py-4 rounded-xl shadow-lg 
                            hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>กำลังส่งคำขอ...</span>
                                </>
                            ) : (
                                <>
                                    <span>✓</span>
                                    <span>ยืนยันการโอนและซื้อตั๋ว</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Info Box */}
                <div className="bg-amber-50/70 backdrop-blur-sm border border-amber-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl">💡</span>
                        <div className="flex-1">
                            <p className="text-sm font-normal text-amber-800 mb-2">สำคัญ!</p>
                            <p className="text-sm text-amber-700 font-light leading-relaxed">
                                การดำเนินการจะเสร็จสมบูรณ์เมื่อ Admin ตรวจสอบสลิปและกดอนุมัติเท่านั้น 
                                กรุณารอการแจ้งเตือนจากระบบ
                            </p>
                        </div>
                    </div>
                </div>

                {/* Process Steps */}
                <div className="mt-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-sky-100 p-6">
                    <p className="text-sm font-light text-slate-600 mb-4">ขั้นตอนการทำรายการ</p>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-sky-600">1</span>
                            </div>
                            <p className="text-sm text-slate-600 font-light">กรอกจำนวนเงินที่โอน</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-sky-600">2</span>
                            </div>
                            <p className="text-sm text-slate-600 font-light">แนบสลิปหลักฐานการโอนเงิน</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-sky-600">3</span>
                            </div>
                            <p className="text-sm text-slate-600 font-light">รอ Admin ตรวจสอบและอนุมัติ</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-emerald-600">✓</span>
                            </div>
                            <p className="text-sm text-slate-600 font-light">เสร็จสิ้น - สามารถเข้าร่วมเกมได้</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepositPage;