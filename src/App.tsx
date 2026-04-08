import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DashboardPage from "./components/DashboardPage";
import EntityManager from "./components/EntityManager";
import AssignmentsPage from "./components/AssignmentsPage";

// Thay link này bằng link backend thật của bạn
const BASE_URL = import.meta.env.PROD 
  ? 'https://140.115.59.61:8888' 
  : 'http://localhost:8000'; 

export default function App() {
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem("darkMode") || "true"));
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Đã xóa /api/ ở các đường dẫn dưới đây
  const loadEntities = useCallback(async () => {
    try {
      console.log("[App] Fetching data from root paths...");
      const [patientRes, nurseRes] = await Promise.all([
        fetch(`${BASE_URL}/patients`), // Đã sửa: /api/patients -> /patients
        fetch(`${BASE_URL}/nurses`)    // Đã sửa: /api/nurses -> /nurses
      ]);

      if (patientRes.ok) {
        const pData = await patientRes.json();
        setPatients(pData);
      }
      if (nurseRes.ok) {
        const nData = await nurseRes.json();
        setNurses(nData);
      }
    } catch (err) {
      console.error("Error loading entities:", err);
    }
  }, []);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      // Đã sửa: /api/ai-schedule -> /ai-schedule (hoặc endpoint thực tế của bạn)
      const res = await fetch(`${BASE_URL}/ai-schedule`, { method: "POST" });
      const data = await res.json();
      setResult(data);
      loadEntities(); 
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen p-6 max-w-7xl mx-auto bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        <nav className="flex gap-6 mb-8 text-lg font-medium border-b border-gray-200 dark:border-gray-800 pb-4">
          <Link to="/" className="dark:text-gray-300 hover:text-blue-500 transition-colors">Dashboard</Link>
          <Link to="/entities" className="dark:text-gray-300 hover:text-blue-500 transition-colors">Manage Entities</Link>
          <Link to="/assignments" className="dark:text-gray-300 hover:text-blue-500 transition-colors">Current Schedule</Link>
        </nav>

        <Routes>
          <Route path="/" element={
            <DashboardPage
              darkMode={darkMode}
              toggleDarkMode={() => setDarkMode(!darkMode)}
              fetchSchedule={fetchSchedule}
              loading={loading}
              nurses={nurses}
              patients={patients}
              result={result}
              refreshData={loadEntities}
            />
          }/>
          <Route path="/entities" element={<EntityManager refresh={loadEntities} />}/>
          <Route path="/assignments" element={<AssignmentsPage nurses={nurses} patients={patients} />}/>
        </Routes>
      </div>
    </Router>
  );
}
