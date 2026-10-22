import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, PlusCircle, List, BarChart3, LogOut, MapPin, Menu, X, Eye,
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
  const { user, logout, canEdit } = useAuth();
  const [addModal, setAddModal] = React.useState<{ open: boolean; initialCoords?: GPSCoordinates }>({ open: false });
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  if (!user) return <LoginPage />;

  const isGuest = user.id === 'guest';
  const initials = isGuest ? '👁' : user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  function openAdd() {
    if (!canEdit) return; // guests can't add
    setAddModal({ open: true });
  }

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
          <button
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Guest notice banner */}
        {isGuest && (
          <div style={{
            margin: '10px 12px',
            padding: '8px 12px',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 8,
            fontSize: 11,
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Eye size={13} />
            <div>
              <div style={{ fontWeight: 600 }}>View-Only Mode</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 1 }}>Sign in to add records</div>
            </div>
          </div>
        )}

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

          {canEdit && (
            <>
              <div className="nav-section-label" style={{ marginTop: 8 }}>Actions</div>
              <button
                className="nav-item"
                onClick={() => { openAdd(); setSidebarOpen(false); }}
                style={{ color: '#10b981', fontWeight: 600 }}
              >
                <PlusCircle size={16} /> Add Valuation
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={isGuest ? { fontSize: 16, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' } : {}}>
              {initials}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{isGuest ? 'Guest Viewer' : user.role}</div>
            </div>
            <button className="logout-btn" onClick={logout} title={isGuest ? 'Back to Login' : 'Logout'}>
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
            <MapPin size={15} color="#60a5fa" />
            <span style={{ fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              ValueMap SL
            </span>
          </div>
          {canEdit ? (
            <button className="hamburger-btn" onClick={openAdd} aria-label="Add valuation" style={{ color: '#10b981' }}>
              <PlusCircle size={22} />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage onAddNew={openAdd} />} />
            <Route path="/map" element={<MapPage onAddNew={(coords) => { if (canEdit) setAddModal({ open: true, initialCoords: coords }); }} />} />
            <Route path="/records" element={<RecordsPage onAddNew={openAdd} />} />
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
          {canEdit ? (
            <button className="mobile-nav-item mobile-nav-add" onClick={openAdd}>
              <PlusCircle size={24} />
              <span>Add</span>
            </button>
          ) : (
            <NavLink to="/analytics" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Analytics</span>
            </NavLink>
          )}
          <NavLink to="/records" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <List size={20} />
            <span>Records</span>
          </NavLink>
          {canEdit ? (
            <NavLink to="/analytics" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Analytics</span>
            </NavLink>
          ) : (
            <button className="mobile-nav-item" onClick={logout} style={{ color: 'var(--text-muted)' }}>
              <LogOut size={20} />
              <span>Sign In</span>
            </button>
          )}
        </nav>
      </div>

      {addModal.open && canEdit && (
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
