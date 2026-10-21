import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, PlusCircle, List, BarChart3, LogOut, MapPin, FlaskConical,
} from 'lucide-react';
import { ToastProvider } from '../contexts/ToastContext';
import DashboardPage from './DashboardPage';
import MapPage from './MapPage';
import RecordsPage from './RecordsPage';
import AnalyticsPage from './AnalyticsPage';
import AddEditValuationModal from '../components/AddEditValuationModal';
import { db } from '../services/db';
import type { GPSCoordinates } from '../types';

/** Developer-only Demo sandbox shell – accessible at /demo */
function DemoShell() {
  const [addModal, setAddModal] = React.useState<{ open: boolean; initialCoords?: GPSCoordinates }>({ open: false });
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Force demo mode on mount and keep it
  React.useEffect(() => {
    db.setEnvironment('demo');
    return () => {
      // restore live when leaving demo
      db.setEnvironment('live');
    };
  }, []);

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
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
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FlaskConical size={16} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-title" style={{ background: 'linear-gradient(135deg, #fcd34d, #f87171)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Demo Sandbox
              </div>
              <div className="sidebar-logo-sub">Developer Mode</div>
            </div>
          </div>
        </div>

        {/* Demo Warning */}
        <div style={{
          margin: '12px 14px',
          padding: '10px 12px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          fontSize: 11,
          color: '#fcd34d',
          lineHeight: 1.5,
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚗️ DEMO MODE</div>
          <div>Sample data only. No Supabase writes. Developer access.</div>
          <button
            onClick={() => db.resetDemoData()}
            style={{
              marginTop: 8,
              padding: '4px 10px',
              background: 'rgba(245, 158, 11, 0.2)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 6,
              color: '#fcd34d',
              fontSize: 10,
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Reset Demo Data
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Demo Pages</div>
          <NavLink to="/demo/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/demo/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <Map size={16} /> Map View
          </NavLink>
          <NavLink to="/demo/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <List size={16} /> Valuations
          </NavLink>
          <NavLink to="/demo/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
            <BarChart3 size={16} /> Analytics
          </NavLink>

          <div className="nav-section-label" style={{ marginTop: 8 }}>Actions</div>
          <button
            className="nav-item"
            onClick={() => { setAddModal({ open: true }); setSidebarOpen(false); }}
            style={{ color: '#f59e0b', fontWeight: 600 }}
          >
            <PlusCircle size={16} /> Add Demo Record
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              DEV
            </div>
            <div className="user-info">
              <div className="user-name">Developer</div>
              <div className="user-role">Demo Sandbox</div>
            </div>
            <a href="/" title="Back to Live App" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              <LogOut size={15} />
            </a>
          </div>
        </div>
      </aside>

      {/* ── Pages ── */}
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FlaskConical size={16} color="#f59e0b" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fcd34d' }}>Demo Sandbox</span>
          </div>
          <div style={{ width: 36 }} />
        </div>

        {/* Demo banner */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))',
          borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '6px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 11,
          color: '#fcd34d',
          flexShrink: 0,
          zIndex: 100,
          flexWrap: 'wrap',
        }}>
          <span>⚠️</span>
          <strong>DEVELOPER DEMO SANDBOX</strong>
          <span>— Sample data, no database writes. Share this URL only with developers.</span>
          <a href="/" style={{ marginLeft: 'auto', padding: '2px 10px', background: '#10b981', color: '#fff', borderRadius: 6, fontSize: 10, fontWeight: 700, textDecoration: 'none' }}>
            → Live App
          </a>
        </div>

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/demo/dashboard" element={<DashboardPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/demo/map" element={<MapPage onAddNew={(coords) => setAddModal({ open: true, initialCoords: coords })} />} />
            <Route path="/demo/records" element={<RecordsPage onAddNew={() => setAddModal({ open: true })} />} />
            <Route path="/demo/analytics" element={<AnalyticsPage />} />
            <Route path="/demo" element={<Navigate to="/demo/dashboard" replace />} />
          </Routes>
        </div>

        {/* Mobile bottom nav */}
        <nav className="mobile-bottom-nav">
          <NavLink to="/demo/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/demo/map" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <Map size={20} />
            <span>Map</span>
          </NavLink>
          <button className="mobile-nav-item mobile-nav-add" onClick={() => setAddModal({ open: true })}>
            <PlusCircle size={22} />
            <span>Add</span>
          </button>
          <NavLink to="/demo/records" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
            <List size={20} />
            <span>Records</span>
          </NavLink>
          <NavLink to="/demo/analytics" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
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

export default function DemoPage() {
  return (
    <ToastProvider>
      <DemoShell />
    </ToastProvider>
  );
}
