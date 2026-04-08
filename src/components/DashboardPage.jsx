import React, { useState, useEffect } from "react";
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
  patients: propPatients = [],
  result = null,
  refreshData,
}) {
  const [localPatients, setLocalPatients] = useState(propPatients);
  const [patientsLoading, setPatientsLoading] = useState(false);

  const fetchPatients = async () => {
    setPatientsLoading(true);
    try {
      const res = await fetch("/api/patients");
      const data = await res.json();
      setLocalPatients(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    if (propPatients.length === 0 && localPatients.length === 0) {
      fetchPatients();
    }
  }, []);

  const patients = localPatients;

  // ===== DATA =====
  const patientPriority = {
    emergency: patients.filter(p => p?.priority === "emergency").length,
    urgent: patients.filter(p => p?.priority === "urgent").length,
    routine: patients.filter(p => p?.priority === "routine").length,
  };

  const skillDemand = {};
  patients.forEach(p => {
    p?.required_skills?.forEach(skill => {
      skillDemand[skill] = (skillDemand[skill] || 0) + 1;
    });
  });

  const topSkillsData = Object.entries(skillDemand)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const skillGapData = Object.entries(skillDemand)
    .map(([skill, demand]) => ({
      skill,
      demand,
      supply: nurses.filter(n => n?.skills?.includes(skill)).length,
    }))
    .filter(item => item.demand > item.supply);

  // ===== CHART DATA =====
  const patientPriorityChartData = {
    labels: ["Emergency", "High Priority", "Routine"],
    datasets: [{
      data: [patientPriority.emergency, patientPriority.urgent, patientPriority.routine],
      backgroundColor: ["#ef4444", "#f59e0b", "#6b7280"],
    }],
  };

  const topSkillsChartData = {
    labels: topSkillsData.map(([s]) => s),
    datasets: [{
      data: topSkillsData.map(([, c]) => c),
    }],
  };

  const loadChartData = {
    labels: nurses.map(n => n.full_name),
    datasets: [{
      label: "Minutes Used",
      data: nurses.map(n => n.current_minutes || 0),
    }],
  };

  const skillGapChartData = {
    labels: skillGapData.map(s => s.skill),
    datasets: [
      { label: "Demand", data: skillGapData.map(s => s.demand) },
      { label: "Supply", data: skillGapData.map(s => s.supply) },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50"} p-6 space-y-8`}>

      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">🏥 AI Nurse Scheduler</h1>
        <button onClick={toggleDarkMode}>
          {darkMode ? "🌞" : "🌙"}
        </button>
      </div>

      {/* RUN */}
      <button
        onClick={fetchSchedule}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl"
      >
        🚀 Run AI Scheduler
      </button>

      {/* ===== AI LOGIC EXPLANATION ===== */}
      <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-xl border">
        <h2 className="font-bold text-lg mb-3">🧠 AI Scheduler Logic</h2>
        <ul className="space-y-2 text-sm">
          <li><strong>Patient Priority:</strong> Emergency patients are scheduled first to minimize risk.</li>
          <li><strong>Skill Matching:</strong> Nurses are assigned only if they match required patient skills.</li>
          <li><strong>Workload Balance:</strong> Tasks are distributed evenly to avoid overloading specific nurses.</li>
          <li><strong>Delay Penalty:</strong> Late assignments are penalized to ensure timely service.</li>
          <li><strong>Daily Shift Limits:</strong> Each nurse has a maximum working time constraint.</li>
        </ul>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PATIENT */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <h3 className="font-bold mb-3">Patient Priority</h3>
          <div className="h-64">
            <Doughnut data={patientPriorityChartData} />
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Distribution of patients by priority helps identify urgent workload.
          </p>
        </div>

        {/* SKILLS */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <h3 className="font-bold mb-3">Top Required Skills</h3>
          <div className="h-64">
            <Pie data={topSkillsChartData} />
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Shows most demanded medical skills.
          </p>
        </div>

        {/* WORKLOAD */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <h3 className="font-bold mb-3">Nurse Workload</h3>
          <div className="h-64">
            <Bar data={loadChartData} options={commonOptions} />
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Displays workload distribution across nurses.
          </p>
        </div>

        {/* SKILL GAP */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl">
          <h3 className="font-bold mb-3">Skill Gap</h3>
          <div className="h-64">
            <Bar data={skillGapChartData} options={commonOptions} />
          </div>
          <p className="text-sm text-gray-500 mt-3 text-center">
            Highlights shortage between demand and available skills.
          </p>
        </div>

      </div>
    </div>
  );
}
