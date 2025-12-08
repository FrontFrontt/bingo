// /frontend/pages/login.js
import React, { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";

const API_URL = "http://localhost:4000/api/auth";

const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/login`, { username, password });
            const { token, role } = response.data;

            localStorage.setItem("bingoToken", token);
            localStorage.setItem("bingoRole", role);

            role === "admin" ? router.push("/admin/dashboard") : router.push("/");
        } catch (err) {
            setError(err.response?.data?.message || "การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบข้อมูล");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 px-4">
            
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl"></div>
            </div>

            {/* Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-white/70 backdrop-blur-xl shadow-xl rounded-3xl p-10 border border-sky-100">

                    {/* Logo/Brand */}
                    <div className="text-center mb-8">
                        <div className="inline-block mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                                <span className="text-3xl">🎮</span>
                            </div>
                        </div>
                        <h1 className="text-3xl font-light text-slate-700 mb-2">
                            เข้าสู่ระบบ
                        </h1>
                        <p className="text-slate-400 text-sm font-light">
                            ระบบบิงโกออนไลน์
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Username */}
                        <div>
                            <label className="block text-slate-600 text-xs font-light mb-2 uppercase tracking-wider">
                                ชื่อผู้ใช้
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">👤</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-sky-100 bg-white/50 
                                    focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 
                                    transition font-light text-slate-700 placeholder:text-slate-300"
                                    placeholder="กรอกชื่อผู้ใช้"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-slate-600 text-xs font-light mb-2 uppercase tracking-wider">
                                รหัสผ่าน
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-sky-100 bg-white/50
                                    focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 
                                    transition font-light text-slate-700 placeholder:text-slate-300"
                                    placeholder="กรอกรหัสผ่าน"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2">
                                <span className="text-rose-500 mt-0.5">⚠</span>
                                <p className="text-rose-600 text-sm font-light flex-1">{error}</p>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 
                            transition-all duration-200 text-white font-light py-3 rounded-xl shadow-lg 
                            hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>กำลังเข้าสู่ระบบ...</span>
                                </>
                            ) : (
                                <span>เข้าสู่ระบบ</span>
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-4 bg-white/70 text-slate-400 font-light">หรือ</span>
                            </div>
                        </div>

                        {/* Register */}
                        <div className="text-center">
                            <p className="text-sm text-slate-600 font-light mb-3">
                                ยังไม่มีบัญชี?
                            </p>
                            <Link
                                href="/register"
                                className="inline-block w-full py-3 rounded-xl border border-sky-200 bg-sky-50/50 
                                hover:bg-sky-100/50 text-sky-600 font-light transition-all"
                            >
                                สมัครสมาชิก
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Footer Text */}
                <p className="text-center text-xs text-slate-400 font-light mt-6">
                    ระบบบิงโกออนไลน์ © 2024
                </p>
            </div>
        </div>
    );
};

export default LoginPage;