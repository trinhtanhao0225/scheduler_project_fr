import React, { useState, useEffect, useMemo } from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function DashboardPage({
  darkMode,
  toggleDarkMode,
  fetchSchedule,
  loading,
  nurses = [],
  patients: propPatients = [],   // Dữ liệu từ App.jsx
  result = null,
  refreshData,                   // Hàm tải lại dữ liệu từ App.jsx
}) {
  // Local state để bổ trợ nếu cần fetch riêng, nhưng ưu tiên propPatients
  const [localPatients, setLocalPatients] = useState(propPatients);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  // Đồng bộ localPatients khi propPatients từ App.jsx thay đổi
  useEffect(() => {
    if (propPatients && propPatients.length > 0) {
      setLocalPatients(propPatients);
    }
  }, [propPatients]);

  // Hàm fetch nội bộ (chỉ dùng làm fallback hoặc khi nhấn nút refresh riêng)
  const fetchPatientsInternal = async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      const baseUrl = import.meta.env.PROD ? 'https://140.115.59.61:8888' : '';
      const res = await fetch(`${baseUrl}/api/patients`, {
        headers: { "Accept": "application/json" }
      });

      const contentType = res.headers.get("content-type");
      if (!res.ok || !contentType || !contentType.includes("application/json")) {
        throw new Error(`Server returned HTML/Error instead of JSON`);
      }

      const data = await res.json();
      setLocalPatients(data || []);
    } catch (err) {
      console.error("[Dashboard] Fetch error:", err);
      setPatientsError(err.message);
    } finally {
      setPatientsLoading(false);
    }
  };

  const patients = localPatients;

  // ── Tính toán dữ liệu (Tối ưu bằng useMemo để tránh giật) ──────────────────
  const stats = useMemo(() => {
    const assignedCount = result?.assignments?.length || 0;
    const unmatched = result?.unmatched_patients || [];

    const priority = {
      emergency: patients.filter(p => p?.priority === "emergency").length,
      urgent: patients.filter(p => p?.priority === "urgent").length,
      routine: patients.filter(p => p?.priority === "routine").length,
    };

    const skillDemand = {};
    [...patients, ...unmatched].forEach(p => {
      p?.required_skills?.forEach(skill => {
        skillDemand[skill] = (skillDemand[skill] || 0) + 1;
      });
    });

    const skillGap = Object.entries(skillDemand)
      .map(([skill, demand]) => ({
        skill,
        demand,
        supply: nurses.filter(n => n?.skills?.includes(skill)).length,
      }))
      .filter(item => item.demand > item.supply)
      .sort((a, b) => b.demand - a.supply);

    const hourlyLoad = Array(24).fill(0);
    result?.assignments?.forEach(ass => {
      if (ass?.visit_time) {
        const hour = new Date(ass.visit_time).getHours();
        hourlyLoad[hour] += 1;
      }
    });

    return { assignedCount, unmatched, priority, skillGap, hourlyLoad, skillDemand };
  }, [patients, nurses, result]);

  // ── Cấu hình Biểu đồ ──────────────────────────────────────────────────────
  const loadChartData = {
    labels: nurses.map(n => n?.full_name || "N/A"),
    datasets: [{
      label: "Minutes Used",
      data: nurses.map(n => n?.current_minutes || 0),
      backgroundColor: nurses.map(n => {
        const pct = n?.max_minutes > 0 ? (n.current_minutes / n.max_minutes) * 100 : 0;
        return pct > 90 ? "rgba(239, 68, 68, 0.75)" : pct > 70 ? "rgba(249, 115, 22, 0.75)" : "rgba(59, 130, 246, 0.75)";
      }),
      borderWidth: 1,
    }],
  };

  const skillGapChartData = {
    labels: stats.skillGap.map(s => s.skill),
    datasets: [
      { label: "Demand", data: stats.skillGap.map(s => s.demand), backgroundColor: "rgba(239, 68, 68, 0.6)" },
      { label: "Available", data: stats.skillGap.map(s => s.supply), backgroundColor: "rgba(34, 197, 94, 0.6)" },
    ],
  };

  const hourlyLoadChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [{
      label: "Cases / Load",
      data: stats.hourlyLoad,
      backgroundColor: "rgba(139, 92, 246, 0.6)",
    }],
  };

  const patientPriorityChartData = {
    labels: ["Emergency", "High Priority", "Routine"],
    datasets: [{
      data: [stats.priority.emergency, stats.priority.urgent, stats.priority.routine],
      backgroundColor: ["#ef4444", "#f59e0b", "#6b7280"],
    }],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"} p-6 space-y-8 transition-colors duration-300`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🏥</span> AI Nurse Scheduler Dashboard
        </h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              if (refreshData) refreshData();
              else fetchPatientsInternal();
            }}
            disabled={patientsLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50"
          >
            {patientsLoading ? "Refreshing..." : "↻ Refresh Data"}
          </button>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={fetchSchedule}
        disabled={loading}
        className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${loading ? "bg-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}`}
      >
        {loading ? "🚀 Running AI..." : "🚀 Run AI Scheduler"}
      </button>

      {/* Debug Panel */}
      <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-xl border border-amber-200 dark:border-amber-800 text-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>Nurses: <strong>{nurses.length}</strong></div>
          <div>Patients: <strong>{patients.length}</strong></div>
          <div>Status: <strong>{result ? "Schedule Ready" : "No Schedule"}</strong></div>
          <div>Unmatched: <strong>{stats.unmatched.length}</strong></div>
        </div>
      </div>

      {patientsError && (
        <div className="bg-red-100 p-4 rounded-lg text-red-700 border border-red-300">
          <strong>Error:</strong> {patientsError}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Patient Priority Distribution</h3>
          <div className="h-64">
            {patients.length > 0 ? (
              <Doughnut data={patientPriorityChartData} options={commonOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">No patients loaded</div>
            )}
          </div>
        </div>

        {/* Workload Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Nurse Workload (Minutes)</h3>
          <div className="h-64">
            {nurses.length > 0 ? (
              <Bar data={loadChartData} options={commonOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 italic">No nurse data</div>
            )}
          </div>
        </div>

        {/* Skill Gap Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Skill Gaps</h3>
          <div className="h-64">
            {stats.skillGap.length > 0 ? (
              <Bar data={skillGapChartData} options={{ ...commonOptions, indexAxis: 'y' }} />
            ) : (
              <div className="h-full flex items-center justify-center text-green-500 italic">All skill demands met</div>
            )}
          </div>
        </div>

        {/* Hourly Load */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Hourly Peak Load</h3>
          <div className="h-64">
            <Bar data={hourlyLoadChartData} options={commonOptions} />
          </div>
        </div>
      </div>

      {/* AI Result JSON */}
      {result && (
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">AI Scheduler Raw Output</h3>
          <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
