import React, { useMemo } from 'react';
import {
  LayoutDashboard, TrendingUp, MapPin, Building2, Calendar,
  ArrowUpRight, ArrowDownRight, Plus, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { db } from '../services/db';
import { formatLKR, formatDate, monthLabel } from '../utils';
import { LAND_TYPE_LABELS, PRICE_RANGE_COLORS } from '../constants';
import type { LandType } from '../types';

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
  const stats = useMemo(() => db.getDashboardStats(), []);

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
              Dashboard
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
              Overview of your land valuation records
            </p>
          </div>
          <button className="btn btn-primary" onClick={onAddNew}>
            <Plus size={15} /> Add Valuation
          </button>
        </div>

        {/* Demo banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', marginBottom: 24,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 'var(--radius)', color: '#fcd34d', fontSize: 12,
        }}>
          <AlertTriangle size={14} />
          Demo mode — all sample records are fictional and for demonstration purposes only. Your added records are saved locally.
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard
            icon={<LayoutDashboard size={18} />}
            iconBg="rgba(59,130,246,0.15)"
            iconColor="#60a5fa"
            label="Total Valuations"
            value={stats.totalRecords.toString()}
            sub="Active records"
          />
          <StatCard
            icon={<MapPin size={18} />}
            iconBg="rgba(168,85,247,0.15)"
            iconColor="#a855f7"
            label="Districts Covered"
            value={stats.totalDistricts.toString()}
            sub="Across Sri Lanka"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            iconBg="rgba(34,197,94,0.15)"
            iconColor="#22c55e"
            label="Median Price / Perch"
            value={formatLKR(stats.medianPricePerPerch, true)}
            sub="Across all records"
          />
          <StatCard
            icon={<Building2 size={18} />}
            iconBg="rgba(245,158,11,0.15)"
            iconColor="#f59e0b"
            label="Average Price / Perch"
            value={formatLKR(stats.averagePricePerPerch, true)}
            sub="Mean of all records"
          />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Monthly Activity */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Valuation Activity</span>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyActivity.map((m) => ({ ...m, month: monthLabel(m.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Valuations" fill="var(--brand-600)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* By Land Type */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">By Property Type</span>
              <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={220}>
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
            </div>
          </div>
        </div>

        {/* Districts and Recent */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          {/* Top Districts */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <span className="card-title">Highest Median Prices</span>
              <ArrowUpRight size={14} style={{ color: '#22c55e' }} />
            </div>
            <div className="card-body" style={{ paddingTop: 4 }}>
              {stats.topDistricts.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 13 }}>No data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.topDistricts.map((d, i) => (
                    <DistrictRow key={d.district} rank={i + 1} district={d.district} median={d.median} count={d.count} variant="top" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Records */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: 12 }}>
              <span className="card-title">Recently Added</span>
              <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
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
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="truncate">{r.title}</span>
                          {r.isDemoData && <span className="badge badge-demo" style={{ fontSize: 9 }}>DEMO</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.district} · {formatDate(r.valuationDate)}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-400)', flexShrink: 0, marginLeft: 12 }}>
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
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <span className="card-title">Price Distribution (per perch)</span>
          </div>
          <div className="card-body">
            <PriceDistributionBars records={db.getAll()} />
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

function DistrictRow({ rank, district, median, count, variant }: {
  rank: number; district: string; median: number; count: number; variant: 'top' | 'bottom';
}) {
  const color = variant === 'top' ? '#22c55e' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: `${color}20`, color, fontSize: 11, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{district}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{count} record{count !== 1 ? 's' : ''}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color, flexShrink: 0 }}>
        {formatLKR(median, true)}/P
      </div>
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
