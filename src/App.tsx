import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, PlusCircle, List, BarChart3, LogOut, MapPin,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import RecordsPage from './pages/RecordsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AddEditValuationModal from './components/AddEditValuationModal';
import './index.css';

import type { GPSCoordinates } from './types';

function AppShell() {
  const { user, logout } = useAuth();
  const [addModal, setAddModal] = React.useState<{ open: boolean; initialCoords?: GPSCoordinates }>({ open: false });

  if (!user) return <LoginPage />;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32,
              background: 'linear-gradient(135deg, #2563eb, #10b981)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MapPin size={16} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-title">ValueMap SL</div>
              <div className="sidebar-logo-sub">Land Valuation</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Map size={16} /> Map View
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <List size={16} /> Valuations
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={16} /> Analytics
          </NavLink>

          <div className="nav-section-label" style={{ marginTop: 8 }}>Actions</div>
          <button
            className="nav-item"
            onClick={() => setAddModal({ open: true })}
            style={{ color: '#10b981', fontWeight: 600 }}
          >
            <PlusCircle size={16} /> Add Valuation
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
            <button className="logout-btn" onClick={logout} title="Logout">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Pages ── */}
      <div className="main-content">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage onAddNew={() => setAddModal({ open: true })} />} />
          <Route path="/map" element={<MapPage onAddNew={(coords) => setAddModal({ open: true, initialCoords: coords })} />} />
          <Route path="/records" element={<RecordsPage onAddNew={() => setAddModal({ open: true })} />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>

      {addModal.open && (
        <AddEditValuationModal
          initialCoordinates={addModal.initialCoords}
          onClose={() => setAddModal({ open: false })}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
