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
import { db, type AppEnvironment } from './services/db';

function AppShell() {
  const { user, logout } = useAuth();
  const [addModal, setAddModal] = React.useState<{ open: boolean; initialCoords?: GPSCoordinates }>({ open: false });
  const [env, setEnv] = React.useState<AppEnvironment>(() => db.getEnvironment());

  React.useEffect(() => {
    return db.subscribe(() => {
      setEnv(db.getEnvironment());
    });
  }, []);

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

        {/* ── Environment Switcher (Live vs Demo) ── */}
        <div style={{
          margin: '12px 14px 8px',
          padding: '3px',
          background: 'var(--surface-2)',
          borderRadius: 8,
          display: 'flex',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => db.setEnvironment('live')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: env === 'live' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
              color: env === 'live' ? '#34d399' : 'var(--text-muted)',
              boxShadow: env === 'live' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Production Live Database (Supabase Cloud)"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: env === 'live' ? '#10b981' : '#64748b' }}></span>
            Live DB
          </button>
          <button
            onClick={() => db.setEnvironment('demo')}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              background: env === 'demo' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: env === 'demo' ? '#fcd34d' : 'var(--text-muted)',
              boxShadow: env === 'demo' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
            title="Demo Sandbox with 15 Sri Lanka valuations"
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: env === 'demo' ? '#f59e0b' : '#64748b' }}></span>
            Demo Sandbox
          </button>
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
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Demo Mode Banner */}
        {env === 'demo' && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#fcd34d',
            flexShrink: 0,
            zIndex: 100,
            flexWrap: 'wrap',
            gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <strong>DEMO SANDBOX MODE:</strong>
              <span>Viewing sample Sri Lanka land valuations. Changes made here will not affect your live database.</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => db.resetDemoData()}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11, padding: '3px 8px', color: '#fcd34d' }}
              >
                Reset Demo Data
              </button>
              <button
                onClick={() => db.setEnvironment('live')}
                className="btn btn-sm"
                style={{ fontSize: 11, padding: '3px 12px', background: '#10b981', color: '#fff', border: 'none', fontWeight: 600 }}
              >
                Switch to Live DB
              </button>
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/map" element={<MapPage onAddNew={(coords) => setAddModal({ open: true, initialCoords: coords })} />} />
            <Route path="/records" element={<RecordsPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
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
