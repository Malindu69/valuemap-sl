import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Building2, Plus, Map, ArrowRight, Compass,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { db } from '../services/db';
import { formatLKR, formatDate } from '../utils';
import { LAND_TYPE_LABELS, PRICE_RANGE_COLORS } from '../constants';

const TYPE_COLORS: Record<string, string> = {
  residential: '#3b82f6',
  commercial: '#f59e0b',
  agricultural: '#22c55e',
  'mixed-use': '#a855f7',
  industrial: '#f97316',
};

const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-secondary)' },
};

interface Props { onAddNew: () => void; }

export default function DashboardPage({ onAddNew }: Props) {
  const navigate = useNavigate();
  const stats = useMemo(() => db.getDashboardStats(), []);
  const allRecords = useMemo(() => db.getAll(), []);

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ padding: '20px 20px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Overview of your land valuation intelligence platform
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/map')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.3)',
                color: '#60a5fa', fontWeight: 600,
              }}
            >
              <Map size={15} /> View on Map
            </button>
            <button className="btn btn-primary" onClick={onAddNew} style={{ whiteSpace: 'nowrap' }}>
              <Plus size={15} /> Add Valuation
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <StatCard
            icon={<LayoutDashboard size={20} />}
            iconBg="rgba(59,130,246,0.15)"
            iconColor="#60a5fa"
            label="Total Valuations"
            value={stats.totalRecords.toString()}
            sub="Active records in database"
          />
          <StatCard
            icon={<MapPin size={20} />}
            iconBg="rgba(168,85,247,0.15)"
            iconColor="#a855f7"
            label="Districts Covered"
            value={stats.totalDistricts.toString()}
            sub="Districts across Sri Lanka"
          />
          {/* Quick Map Action Card */}
          <div
            onClick={() => navigate('/map')}
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.1))',
              border: '1px solid rgba(37,99,235,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,0.5)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(37,99,235,0.25)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Map Explorer
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                Explore Sri Lanka Map
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Visualize pins & price ranges on interactive maps
              </div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'var(--brand-600)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ArrowRight size={18} />
            </div>
          </div>

          {/* Quick Market Explore Action Card */}
          <div
            onClick={() => navigate('/explore')}
            style={{
              background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(168,85,247,0.1))',
              border: '1px solid rgba(56,189,248,0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,189,248,0.5)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,189,248,0.25)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Market Intelligence
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                Market Explorer
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                CBSL 256.4 (+11.4%) & 40+ town benchmarks
              </div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#0284c7', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Compass size={18} />
            </div>
          </div>
        </div>

        {/* Charts & Recent Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* By Land Type */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">By Property Type</span>
              <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="card-body">
              {stats.byLandType.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No property records yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={stats.byLandType.map((t) => ({
                        name: LAND_TYPE_LABELS[t.type] ?? t.type,
                        value: t.count,
                        color: TYPE_COLORS[t.type] ?? '#64748b',
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      labelLine={false}
                    >
                      {stats.byLandType.map((t, i) => (
                        <Cell key={i} fill={TYPE_COLORS[t.type] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v: any) => [v, 'Records']} />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Records */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <span className="card-title">Recently Added</span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/records')}
                style={{ fontSize: 11, padding: '2px 8px', height: 'auto', color: '#60a5fa' }}
              >
                View all ({stats.totalRecords}) →
              </button>
            </div>
            <div className="card-body" style={{ paddingTop: 4 }}>
              {stats.recentRecords.length === 0 ? (
                <div className="empty-state">
                  <p>No records yet.</p>
                  <button className="btn btn-primary btn-sm" onClick={onAddNew}><Plus size={13} /> Add First Valuation</button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {stats.recentRecords.map((r) => (
                    <div key={r.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.town}, {r.district} · {formatDate(r.valuationDate)}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399', flexShrink: 0, marginLeft: 12 }}>
                        {formatLKR(r.pricePerPerch, true)}/P
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Distribution Bar */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Price Distribution (per perch)</span>
          </div>
          <div className="card-body">
            <PriceDistributionBars records={allRecords} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, iconBg, iconColor, label, value, sub }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  label: string; value: string; sub: string;
}) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-sub">{sub}</div>
    </div>
  );
}

function PriceDistributionBars({ records }: { records: { pricePerPerch: number }[] }) {
  const buckets = PRICE_RANGE_COLORS.map((r) => ({
    ...r,
    count: records.filter((rec) => {
      const prev = PRICE_RANGE_COLORS[PRICE_RANGE_COLORS.indexOf(r) - 1];
      const minVal = prev ? prev.max : 0;
      return rec.pricePerPerch > minVal && rec.pricePerPerch <= r.max;
    }).length,
  }));

  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {buckets.map((b) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 80, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right' }}>{b.label}</div>
          <div style={{ flex: 1, height: 20, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${(b.count / max) * 100}%`,
              height: '100%',
              background: b.color,
              borderRadius: 4,
              minWidth: b.count > 0 ? 4 : 0,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ width: 24, fontSize: 12, fontWeight: 600, color: b.color, textAlign: 'right', flexShrink: 0 }}>
            {b.count}
          </div>
        </div>
      ))}
    </div>
  );
}
