import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import RideRequest from './pages/RideRequest'; // ✅ عدلنا الاسم
import DriverDocsPage from './pages/DriverDocs';
import AdminPanel from './pages/AdminPanel';

import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Support from './pages/Support';

const App = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Cairo', sans-serif; direction: rtl; }
        body { background: linear-gradient(135deg, #0c1445, #3949ab); min-height: 100vh; }
      `}</style>
      
      <Router>
        <Routes>
          <Route path="/" element={<RegisterPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ride" element={<RideRequest />} /> {/* ✅ عدلنا هنا */}
          <Route path="/driver-docs" element={<DriverDocsPage />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/support" element={<Support />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </Router>
    </>
  );
};

export default App;