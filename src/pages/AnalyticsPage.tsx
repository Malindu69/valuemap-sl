import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ScatterChart, Scatter, Legend, Cell,
} from 'recharts';
import { db } from '../services/db';
import { formatLKR, monthLabel, median, average } from '../utils';
import { LAND_TYPE_LABELS, PRICE_RANGE_COLORS } from '../constants';
import type { LandType } from '../types';

const CHART_STYLE = {
  contentStyle: {
    background: 'var(--surface-2)',
    border: '1px solid var(--border-default)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--text-secondary)' },
};

const TYPE_COLORS: Record<string, string> = {
  residential: '#3b82f6',
  commercial: '#f59e0b',
  agricultural: '#22c55e',
  'mixed-use': '#a855f7',
  industrial: '#f97316',
};

export default function AnalyticsPage() {
  const all = useMemo(() => db.getAll(), []);
  const stats = useMemo(() => db.getDashboardStats(), []);

  // Land type price
  const typeChart = useMemo(() => {
    const map: Partial<Record<LandType, number[]>> = {};
    for (const r of all) {
      if (!map[r.landType]) map[r.landType] = [];
      map[r.landType]!.push(r.pricePerPerch);
    }
    return Object.entries(map).map(([type, prices]) => ({
      name: LAND_TYPE_LABELS[type] ?? type,
      type,
      median: Math.round(median(prices!)),
      count: prices!.length,
    })).sort((a, b) => b.median - a.median);
  }, [all]);

  // Monthly trend
  const trendChart = useMemo(() => {
    return stats.monthlyActivity.map((m) => ({
      ...m,
      month: monthLabel(m.month),
    }));
  }, [stats.monthlyActivity]);

  // Province price breakdown data
  const provinceChart = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const r of all) {
      if (!map[r.province]) map[r.province] = [];
      map[r.province].push(r.pricePerPerch);
    }
    return Object.entries(map)
      .map(([province, prices]) => ({
        province,
        median: Math.round(median(prices)),
        count: prices.length,
      }))
      .sort((a, b) => b.median - a.median);
  }, [all]);

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <style>{`
        @media (max-width: 640px) {
          .analytics-header h1 { font-size: 18px !important; }
          .analytics-header p { font-size: 12px !important; }
          .analytics-wrap { padding: 14px !important; }
          .analytics-chart-grid { grid-template-columns: 1fr !important; }
          .analytics-province-wrap th, .analytics-province-wrap td { font-size: 11px !important; padding: 8px 10px !important; }
          .analytics-province-bar { width: 80px !important; }
          .analytics-price-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <div className="analytics-wrap" style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div className="analytics-header" style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800 }}>Analytics</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            Trends, comparisons, and price distributions
          </p>
        </div>

        {/* Row: Responsive grid - 2 cols on desktop, 1 col on mobile */}
        <div className="analytics-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Land type price */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Price by Property Type</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip {...CHART_STYLE} formatter={(v: any) => [formatLKR(Number(v) || 0), 'Median']} />
                  <Bar dataKey="median" name="Median/Perch" radius={[4, 4, 0, 0]}>
                    {typeChart.map((t, i) => (
                      <Cell key={i} fill={TYPE_COLORS[t.type] ?? '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                {typeChart.map((t) => (
                  <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: TYPE_COLORS[t.type] ?? '#64748b' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{t.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>({t.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly trend */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Valuation Activity Trend</span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={trendChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...CHART_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Valuations"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Province summary table */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <span className="card-title">Province Summary</span>
          </div>
          <div className="analytics-province-wrap data-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="data-table" style={{ minWidth: 420 }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>Province</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Records</th>
                  <th style={{ whiteSpace: 'nowrap' }}>Median / Perch</th>
                  <th style={{ whiteSpace: 'nowrap', minWidth: 120 }}>Level</th>
                </tr>
              </thead>
              <tbody>
                {provinceChart.map((p, i) => {
                  const maxMedian = provinceChart[0]?.median ?? 1;
                  const pct = (p.median / maxMedian) * 100;
                  return (
                    <tr key={p.province}>
                      <td style={{ fontWeight: 500 }}>{p.province}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.count}</td>
                      <td style={{ fontWeight: 700, color: '#34d399' }}>{formatLKR(p.median)}</td>
                      <td className="analytics-province-bar" style={{ width: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 5, background: 'var(--surface-2)', borderRadius: 3, overflow: 'hidden', minWidth: 40 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#10b981)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price range distribution */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Price Range Distribution</span>
          </div>
          <div className="card-body">
            <div className="analytics-price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
              {PRICE_RANGE_COLORS.map((range) => {
                const count = all.filter((r) => {
                  const idx = PRICE_RANGE_COLORS.indexOf(range);
                  const prevMax = idx > 0 ? PRICE_RANGE_COLORS[idx - 1].max : 0;
                  return r.pricePerPerch > prevMax && r.pricePerPerch <= range.max;
                }).length;
                const pct = all.length > 0 ? ((count / all.length) * 100).toFixed(0) : '0';
                return (
                  <div key={range.label} style={{
                    background: `${range.color}10`,
                    border: `1px solid ${range.color}30`,
                    borderRadius: 'var(--radius-lg)', padding: 14,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: range.color }}>{count}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0' }}>records</div>
                    <div style={{ fontSize: 11, color: range.color, fontWeight: 600 }}>{range.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{pct}% of total</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
