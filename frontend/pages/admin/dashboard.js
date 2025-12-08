// /frontend/pages/admin/dashboard.js
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL + "/admin/dashboard-summary";

// Helper function สำหรับ format วันที่ให้เป็น 'DD/MM/YYYY'
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Helper function เพื่อคำนวณช่วงเวลาเริ่มต้น/สิ้นสุด (จำลองการทำงานของ Date Picker)
const calculateDateRange = (type, date) => {
  let startDate = new Date(date);
  let endDate = new Date(date);

  // ตั้งเวลาให้เป็น 00:00:00 ของวันเริ่มต้น และ 23:59:59 ของวันสิ้นสุด
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  if (type === 'day') {
    // [วันเดียว]
  } else if (type === 'week') {
    // [7 วันย้อนหลัง]
    startDate.setDate(startDate.getDate() - 6);
  } else if (type === 'month') {
    // [เดือนที่แล้ว ถึง วันนี้]
    startDate.setDate(1); // เริ่มต้นเดือน
    const today = new Date();
    endDate = new Date(today.setHours(23, 59, 59, 999));
  }

  return {
    startDate: startDate.toISOString().slice(0, 10), // YYYY-MM-DD
    endDate: endDate.toISOString().slice(0, 10)     // YYYY-MM-DD
  };
};

const AdminDashboardPage = () => {
  const [summary, setSummary] = useState({
    totalUsers: 0,
    totalDepositRevenue: 0,
    totalPayoutExpense: 0,
    pendingTransactions: 0,
  });
  const [graphData, setGraphData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('week'); // 🚨 NEW STATE: Default filter is 'week'

  // 🚨 NEW STATE: จัดการช่วงเวลาที่เลือก
  const [filterType, setFilterType] = useState('week'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date()); // วันที่ที่ใช้เป็นจุดอ้างอิงในการกรอง

  // ** ใช้ useMemo คำนวณช่วงวันที่ที่จะส่งไป Backend **
  const { startDate, endDate } = useMemo(() => {
    return calculateDateRange(filterType, currentDate);
  }, [filterType, currentDate]);

  const router = useRouter();

  useEffect(() => {
    const role = localStorage.getItem("bingoRole");
    const token = localStorage.getItem("bingoToken");

    if (!token || role !== "admin") {
      alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
      router.push("/login");
      return;
    }

    const fetchDashboard = async () => {
      try {
        // 🚨 MODIFICATION: ส่ง startDate และ endDate ไป Backend แทน filter
        const response = await axios.get(
          `${API_URL}?startDate=${startDate}&endDate=${endDate}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setSummary(response.data.summary || summary);
        setGraphData(response.data.graphData || []);
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        // 🚨 หากเกิด Error 500 ให้แสดงข้อความแจ้งเตือน
        if (error.response?.status === 500) {
          alert(`❌ Error 500: เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ในการดึงข้อมูลกราฟ: ${error.response.data?.message || 'โปรดตรวจสอบ Log'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    // 🚨 MODIFICATION: Re-fetch เมื่อ startDate หรือ endDate เปลี่ยน
    fetchDashboard();
  }, [router, startDate, endDate]);

  const handleLogout = () => {
    localStorage.removeItem("bingoToken");
    localStorage.removeItem("bingoRole");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-light">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50">

      {/* ============ Sidebar ============ */}
      <aside className="w-72 bg-white/80 backdrop-blur-sm shadow-xl border-r border-sky-100 hidden md:block">
        <div className="p-8">
          <h1 className="text-2xl font-light text-sky-600 tracking-wide">Bingo</h1>
          <p className="text-xs text-slate-400 mt-1 font-light">Admin Portal</p>
        </div>

        <nav className="space-y-1 px-4 mt-8">
          <Link href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sky-50 text-sky-600 font-light transition-all">
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link href="/admin/rounds"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-sky-600 font-light transition-all">
            <span className="text-lg">🎮</span>
            <span>จัดการรอบเกม</span>
          </Link>

          <Link href="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-sky-600 font-light transition-all">
            <span className="text-lg">👥</span>
            <span>จัดการผู้ใช้</span>
          </Link>

          {/* Badge สำหรับคำขอธุรกรรมค้าง */}
          <Link href="/admin/transactions"
            className="flex items-center justify-between px-4 py-3 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-sky-600 font-light transition-all">
            <div className="flex items-center gap-3">
              <span className="text-lg">💰</span>
              <span>อนุมัติธุรกรรม</span>
            </div>
            {summary.pendingTransactions > 0 && (
              <span className="w-6 h-6 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {summary.pendingTransactions}
              </span>
            )}
          </Link>

          <div className="border-t border-slate-200 my-6"></div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 font-light transition-all w-full"
          >
            <span className="text-lg">🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </nav>
      </aside>

      {/* ============ Main Content ============ */}
      <main className="flex-1 p-8 md:p-12">

        {/* Header */}
        <header className="mb-10">
          <h2 className="text-3xl font-light text-slate-700 mb-2">Dashboard</h2>
          <p className="text-slate-400 font-light text-sm">ภาพรวมระบบ Bingo</p>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

          {/* Card 1: ผู้ใช้ทั้งหมด (Total Users) */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
            <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
              ผู้ใช้ทั้งหมด (role=user)
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">👥</span>
              <p className="text-4xl font-light text-slate-700">
                {summary.totalUsers.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Card 2: รายรับ (Total Deposit Revenue) */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
            <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
              รายรับ (เติมเงินอนุมัติ)
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⬆️</span>
              <p className="text-4xl font-light text-emerald-600">
                ฿{summary.totalDepositRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Card 3: รายจ่าย (Total Payout Expense) */}
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100">
            <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
              รายจ่าย (รางวัลอนุมัติ)
            </p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⬇️</span>
              <p className="text-4xl font-light text-rose-600">
                ฿{summary.totalPayoutExpense.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Card 4: คำขอธุรกรรมค้าง (Pending Transactions) */}
          <Link href="/admin/transactions" className="block">
            <div
              className={`bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border cursor-pointer transition-all ${summary.pendingTransactions > 0 ? 'border-amber-400 ring-2 ring-amber-200 hover:border-amber-500' : 'border-sky-100 hover:border-sky-200'
                }`}
            >
              <p className="text-xs text-slate-400 font-light uppercase tracking-wider mb-2">
                คำขอธุรกรรมค้าง
              </p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">⏳</span>
                <p className={`text-4xl font-light ${summary.pendingTransactions > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                  {summary.pendingTransactions.toLocaleString()}
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* =================== GRAPH =================== */}
        <div className="bg-white/60 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-sky-100 mb-10">

          {/* 🚨 NEW UI: Filter Buttons & Summary Text */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-light text-slate-700">แนวโน้มรายรับและผู้เข้าเล่น</h3>

            {/* Text สรุปช่วงเวลา */}
            <p className="text-sm text-slate-500 font-light">
              กำลังแสดงข้อมูล:
              <span className="font-medium text-sky-600 ml-1">
                {formatDate(startDate)}
                {filterType !== 'day' && ` ถึง ${formatDate(endDate)}`}
              </span>
            </p>
          </div>

          {/* 🚨 NEW UI: Filter Buttons (จำลอง Date Picker) */}
          <div className="flex space-x-3 mb-6">
            {/* Note: ในระบบจริง ปุ่มเหล่านี้จะเปลี่ยน State เพื่อให้ Date Picker แสดงผลหรือเปลี่ยนค่า currentDate */}
            {['day', 'week', 'month'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilterType(f);
                  // หากเลือก 'day' หรือ 'week' ให้ยึดจากวันที่ปัจจุบัน
                  setCurrentDate(new Date());
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === f
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-sky-50'
                  }`}
              >
                {f === 'day' ? 'ดู 1 วัน' : f === 'week' ? 'ดู 7 วัน' : 'ดู 1 เดือน'}
              </button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            {/* ... (LineChart Component - Unchanged) ... */}
            <LineChart data={graphData}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />

              {/* LINE 1: Revenue (รายรับ) */}
              <Line
                yAxisId={0} // ใช้แกน Y หลัก (ซ้าย)
                type="monotone"
                dataKey="revenue"
                name="รายรับ (฿)"
                stroke="#10b981" // สีเขียว
                strokeWidth={2}
              />

              {/* LINE 2: Participants (ผู้เข้าเล่น) */}
              <Line
                yAxisId={1} // ใช้แกน Y รอง (ขวา)
                type="monotone"
                dataKey="participants"
                name="ผู้เข้าเล่น (คน)"
                stroke="#ef4444" // สีแดง
                strokeWidth={2}
              />

              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                style={{ fontSize: '12px', fontWeight: '300' }}
                // 🚨 MODIFICATION: ปรับ format X-Axis ให้ดูง่ายขึ้น (แสดงเฉพาะวัน/เดือน)
                tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
              />

              {/* Primary Y-axis (Revenue) */}
              <YAxis
                yAxisId={0}
                stroke="#10b981"
                style={{ fontSize: '12px', fontWeight: '300' }}
                tickFormatter={(value) => `${value.toLocaleString()} ฿`}
              />

              {/* Secondary Y-axis (Participants) - Positioned on the right */}
              <YAxis
                yAxisId={1}
                orientation="right"
                stroke="#ef4444"
                style={{ fontSize: '12px', fontWeight: '300' }}
                tickFormatter={(value) => `${value} คน`}
              />

              {/* Tooltip (Formatter already fixed in previous step) */}
              <Tooltip
                formatter={(value, name) => {
                  const unit = name.includes('฿') ? '฿' : 'คน';
                  const prefix = name.includes('฿') ? '฿' : '';
                  return [`${prefix}${value.toLocaleString()} ${unit}`, name];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e0f2fe',
                  borderRadius: '12px',
                  fontWeight: '300'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Menu Buttons */}
        <h3 className="text-xl font-light text-slate-700 mb-6">เมนูจัดการ</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/rounds">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">🎮</span>
                </div>
                <div>
                  <p className="font-light text-slate-700">จัดการรอบเกม</p>
                  <p className="text-xs text-slate-400 font-light">Game Rounds</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/users">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-2xl">👥</span>
                </div>
                <div>
                  <p className="font-light text-slate-700">จัดการผู้ใช้</p>
                  <p className="text-xs text-slate-400 font-light">User Management</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/transactions">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-sky-100 hover:shadow-md hover:border-sky-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform relative">
                  {/* Badge สำหรับแสดงจำนวนค้างในปุ่ม Menu */}
                  {summary.pendingTransactions > 0 && (
                    <div className="absolute top-[-5px] right-[-5px] w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {summary.pendingTransactions}
                    </div>
                  )}
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <p className="font-light text-slate-700">อนุมัติธุรกรรม</p>
                  <p className="text-xs text-slate-400 font-light">Transactions</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

      </main>
    </div>
  );
};

export default AdminDashboardPage;