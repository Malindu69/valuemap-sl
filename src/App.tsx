import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, PlusCircle, List, BarChart3, LogOut, MapPin, Menu, X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import RecordsPage from './pages/RecordsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import DemoPage from './pages/DemoPage';
import AddEditValuationModal from './components/AddEditValuationModal';
import './index.css';

import type { GPSCoordinates } from './types';
import { db } from './services/db';

// Ensure live mode on app boot
db.setEnvironment('live');

function AppShell() {
  const { user, logout } = useAuth();
  const [addModal, setAddModal] = React.useState<{ open: boolean; initialCoords?: GPSCoordinates }>({ open: false });
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!user) return <LoginPage />;

  const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
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
          {/* Close button visible only on mobile */}
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <Map size={16} /> Map View
          </NavLink>
          <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <List size={16} /> Valuations
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <BarChart3 size={16} /> Analytics
          </NavLink>

          <div className="nav-section-label" style={{ marginTop: 8 }}>Actions</div>
          <button
            className="nav-item"
            onClick={() => { setAddModal({ open: true }); setSidebarOpen(false); }}
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

      {/* ── Main Content ── */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              ValueMap SL
            </span>
          </div>
          <button className="hamburger-btn" onClick={() => { setAddModal({ open: true }); }} aria-label="Add valuation" style={{ color: '#10b981' }}>
            <PlusCircle size={22} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/map" element={<MapPage onAddNew={(coords) => setAddModal({ open: true, initialCoords: coords })} />} />
            <Route path="/records" element={<RecordsPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>

        {/* Mobile bottom navigation */}
        <nav className="mobile-bottom-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            <span>Map</span>
          </NavLink>
          <button className="mobile-nav-item mobile-nav-add" onClick={() => setAddModal({ open: true })}>
            <PlusCircle size={24} />
            <span>Add</span>
          </button>
          <NavLink to="/records" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <List size={20} />
            <span>Records</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>
        </nav>
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
      <Routes>
        {/* Hidden developer demo route – no auth required */}
        <Route path="/demo/*" element={<DemoPage />} />
        <Route path="/demo" element={<Navigate to="/demo/dashboard" replace />} />

        {/* Main live app */}
        <Route path="/*" element={
          <AuthProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}
