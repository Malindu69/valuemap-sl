import React, { useState, useMemo } from 'react';
import {
  Compass, Search, TrendingUp, Filter, MapPin, Calculator,
  ArrowUpRight, Building2, Sparkles, Plus, ExternalLink,
  Layers, Check, Scale, ShieldCheck, Info,
} from 'lucide-react';
import {
  MARKET_BENCHMARKS, CBSL_LVI_DATA, type MarketBenchmark,
} from '../data/marketBenchmarks';
import { formatLKR } from '../utils';
import { PROVINCES } from '../constants';
import type { Province, GPSCoordinates } from '../types';

interface Props {
  onUseAsValuation?: (benchmark: MarketBenchmark) => void;
}

export default function ExplorePage({ onUseAsValuation }: Props) {
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [calcPerches, setCalcPerches] = useState<number>(10);
  const [calcSelectedId, setCalcSelectedId] = useState<string>('sub-rajagiriya');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Filter benchmarks
  const filtered = useMemo(() => {
    return MARKET_BENCHMARKS.filter((b) => {
      if (selectedProvince !== 'all' && b.province !== selectedProvince) return false;
      if (selectedCategory !== 'all' && b.category !== selectedCategory) return false;

      if (selectedPriceTier === 'under-1m' && b.avgPricePerPerch >= 1000000) return false;
      if (selectedPriceTier === '1m-3m' && (b.avgPricePerPerch < 1000000 || b.avgPricePerPerch > 3000000)) return false;
      if (selectedPriceTier === '3m-10m' && (b.avgPricePerPerch < 3000000 || b.avgPricePerPerch > 10000000)) return false;
      if (selectedPriceTier === 'above-10m' && b.avgPricePerPerch <= 10000000) return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = b.name.toLowerCase().includes(query);
        const matchesDistrict = b.district.toLowerCase().includes(query);
        const matchesDrivers = b.keyDrivers.some((d) => d.toLowerCase().includes(query));
        if (!matchesName && !matchesDistrict && !matchesDrivers) return false;
      }
      return true;
    });
  }, [search, selectedProvince, selectedCategory, selectedPriceTier]);

  // Selected benchmark for the quick calculator
  const calcTarget = useMemo(() => {
    return MARKET_BENCHMARKS.find((b) => b.id === calcSelectedId) || MARKET_BENCHMARKS[0];
  }, [calcSelectedId]);

  const estimatedCalcTotal = useMemo(() => {
    if (!calcTarget || calcPerches <= 0) return 0;
    return calcTarget.avgPricePerPerch * calcPerches;
  }, [calcTarget, calcPerches]);

  function toggleCompare(id: string) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) return [prev[1], prev[2], id];
      return [...prev, id];
    });
  }

  const comparedItems = useMemo(() => {
    return MARKET_BENCHMARKS.filter((b) => compareIds.includes(b.id));
  }, [compareIds]);

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--surface-0)' }}>
      {/* ── Header ── */}
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: 16, marginBottom: 24,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Compass size={16} /> Market Intelligence & Benchmarks
            </div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800,
              color: 'var(--text-primary)', marginTop: 4, letterSpacing: '-0.02em',
            }}>
              Sri Lanka Land Price Explorer
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4, maxWidth: 640 }}>
              Curated regional market prices per perch, annual appreciation trends, and official Central Bank of Sri Lanka (CBSL) & LankaPropertyWeb indicators.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#38bdf8', fontWeight: 600,
            }}>
              <ShieldCheck size={14} /> 40+ Verified Local Markets
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#34d399', fontWeight: 600,
            }}>
              <TrendingUp size={14} /> 2024 / 2025 Market Cycle
            </span>
          </div>
        </div>

        {/* ── Macro Indicators & CBSL Widget ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(30,41,59,0.8))',
            border: '1px solid rgba(59,130,246,0.3)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase' }}>
              CBSL Land Valuation Indicator
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{CBSL_LVI_DATA.lviIndex}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>+{CBSL_LVI_DATA.yoyOverallPct}% YoY</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Colombo District Base (2017 H1 = 100) • Semi-annual: +{CBSL_LVI_DATA.semiAnnualPct}%
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(30,41,59,0.8))',
            border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase' }}>
              Residential Sector Growth
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#34d399' }}>+{CBSL_LVI_DATA.residentialGrowthPct}%</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Highest surging asset</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Commercial: +{CBSL_LVI_DATA.commercialGrowthPct}% • Industrial: +{CBSL_LVI_DATA.industrialGrowthPct}%
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(30,41,59,0.8))',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fcd34d', textTransform: 'uppercase' }}>
              Top Suburban Outperformers
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginTop: 8 }}>
              Negombo (+35%) • Homagama (+31%)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Yakkala (+34%) • Weligama (+28%) • Piliyandala (+28%)
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(30,41,59,0.8))',
            border: '1px solid rgba(168,85,247,0.3)', borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#d8b4fe', textTransform: 'uppercase' }}>
              Colombo 1-15 Benchmark
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 6 }}>
              11.6M – 21.8M <span style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8' }}>/ perch</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Colombo 03: 21.8M • Colombo 07: 21.7M
            </div>
          </div>
        </div>

        {/* ── Interactive Instant Valuation Estimator ── */}
        <div style={{
          background: 'var(--surface-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', padding: '20px 24px', marginBottom: 28,
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Calculator size={18} color="#38bdf8" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Quick Comp & Land Value Estimator
            </h2>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Based on official 2024/2025 market benchmark averages
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Choose Location Benchmark:
              </label>
              <select
                className="form-select"
                style={{ width: '100%', fontSize: 13 }}
                value={calcSelectedId}
                onChange={(e) => setCalcSelectedId(e.target.value)}
              >
                {MARKET_BENCHMARKS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.district}) — {formatLKR(b.avgPricePerPerch, true)}/perch
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Land Extent (Perches):
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  style={{ width: '100%', fontSize: 13 }}
                  value={calcPerches}
                  onChange={(e) => setCalcPerches(Math.max(0, parseFloat(e.target.value) || 0))}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCalcPerches(10)}
                  style={{ fontSize: 11 }}
                >
                  10 P
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setCalcPerches(15)}
                  style={{ fontSize: 11 }}
                >
                  15 P
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
              borderRadius: 'var(--radius)', padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#38bdf8' }}>
                Estimated Land Market Value:
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 2 }}>
                {formatLKR(estimatedCalcTotal)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {calcPerches} Perches @ {formatLKR(calcTarget.avgPricePerPerch, true)} / perch
              </div>
            </div>

            {onUseAsValuation && (
              <div>
                <button
                  className="btn btn-primary"
                  style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  onClick={() => onUseAsValuation(calcTarget)}
                >
                  <Plus size={16} /> Pre-fill Valuation
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 20,
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 36, width: '100%', fontSize: 13 }}
              placeholder="Search by city, town (e.g. Rajagiriya, Negombo, Galle)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Province select */}
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 12 }}
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value as Province | 'all')}
            >
              <option value="all">All Provinces</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p} Province</option>
              ))}
            </select>

            {/* Category select */}
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 12 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Market Categories</option>
              <option value="super-prime">Super Prime (Colombo Core & Galle Fort)</option>
              <option value="prime-suburb">Prime Residential Suburbs</option>
              <option value="growth-corridor">High-Growth Expressway Corridors</option>
              <option value="tourism-coastal">Tourism & Coastal Hotspots</option>
              <option value="provincial-hub">Major Provincial Capitals</option>
            </select>

            {/* Price Tier */}
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 12 }}
              value={selectedPriceTier}
              onChange={(e) => setSelectedPriceTier(e.target.value)}
            >
              <option value="all">All Price Tiers</option>
              <option value="under-1m">Under LKR 1M / perch</option>
              <option value="1m-3m">LKR 1M – 3M / perch</option>
              <option value="3m-10m">LKR 3M – 10M / perch</option>
              <option value="above-10m">Above LKR 10M / perch</option>
            </select>

            {/* View Mode */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 3 }}>
              <button
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', border: 'none', background: viewMode === 'cards' ? 'var(--brand-600)' : 'transparent', color: viewMode === 'cards' ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => setViewMode('cards')}
              >
                Cards
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', border: 'none', background: viewMode === 'table' ? 'var(--brand-600)' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)' }}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* ── Active Compare Drawer if items selected ── */}
        {comparedItems.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30,58,138,0.35), rgba(15,23,42,0.95))',
            border: '1px solid rgba(59,130,246,0.4)', borderRadius: 'var(--radius-lg)',
            padding: '16px 20px', marginBottom: 24, boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
                <Scale size={16} /> Market Comparison ({comparedItems.length}/3 selected)
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCompareIds([])}
                style={{ fontSize: 11, color: '#94a3b8' }}
              >
                Clear comparison
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${comparedItems.length}, 1fr)`, gap: 16 }}>
              {comparedItems.map((c) => (
                <div key={c.id} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border-default)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{c.district} District • {c.province}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>{formatLKR(c.avgPricePerPerch, true)} <span style={{ fontSize: 10, color: '#94a3b8' }}>/ P</span></div>
                  <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginTop: 2 }}>+{c.yoyGrowthPct}% YoY Growth</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                    <strong>10 Perch Value:</strong> {formatLKR(c.avgPricePerPerch * 10)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Results Count ── */}
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
          Showing <strong>{filtered.length}</strong> real estate benchmarks across Sri Lanka
        </div>

        {/* ── Benchmarks Cards View ── */}
        {viewMode === 'cards' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
          }}>
            {filtered.map((b) => {
              const isComparing = compareIds.includes(b.id);
              return (
                <div
                  key={b.id}
                  style={{
                    background: 'var(--surface-card)',
                    border: isComparing ? '1px solid #38bdf8' : '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.18s ease',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                          padding: '2px 8px', borderRadius: 10,
                          background: b.category === 'super-prime' ? 'rgba(239,68,68,0.15)' :
                                      b.category === 'tourism-coastal' ? 'rgba(168,85,247,0.15)' :
                                      b.category === 'growth-corridor' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                          color: b.category === 'super-prime' ? '#f87171' :
                                 b.category === 'tourism-coastal' ? '#c084fc' :
                                 b.category === 'growth-corridor' ? '#34d399' : '#60a5fa',
                        }}>
                          {b.category.replace('-', ' ')}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {b.district} • {b.province}
                        </span>
                      </div>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, lineHeight: 1.3 }}>
                        {b.name}
                      </h3>
                    </div>

                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#34d399',
                      background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 6,
                      display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
                    }}>
                      <ArrowUpRight size={13} /> +{b.yoyGrowthPct}%
                    </span>
                  </div>

                  {/* Benchmark price badge */}
                  <div style={{
                    marginTop: 14, padding: '12px 14px', borderRadius: 'var(--radius)',
                    background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Market Benchmark Rate
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                      <span style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
                        {formatLKR(b.avgPricePerPerch, true)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        / perch
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Typical Range: {formatLKR(b.priceRange.min, true)} – {formatLKR(b.priceRange.max, true)}
                    </div>
                  </div>

                  {/* Key Drivers */}
                  <div style={{ marginTop: 14, flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      Key Market Value Drivers:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {b.keyDrivers.map((d, i) => (
                        <span key={i} style={{
                          fontSize: 10, background: 'rgba(148, 163, 184, 0.08)',
                          color: 'var(--text-secondary)', padding: '2px 7px', borderRadius: 4,
                          lineHeight: 1.4,
                        }}>
                          • {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div style={{
                    marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '4px 8px', color: isComparing ? '#38bdf8' : 'var(--text-muted)' }}
                      onClick={() => toggleCompare(b.id)}
                    >
                      <Scale size={13} /> {isComparing ? 'Comparing' : 'Compare'}
                    </button>

                    {onUseAsValuation && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => onUseAsValuation(b)}
                        title="Use as comp in new valuation"
                      >
                        <Plus size={13} /> Use as Comp
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Benchmarks Table View ── */}
        {viewMode === 'table' && (
          <div style={{
            background: 'var(--surface-card)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)',
          }}>
            <table className="table" style={{ width: '100%', minWidth: 700, margin: 0 }}>
              <thead>
                <tr>
                  <th>Location / Area</th>
                  <th>District / Province</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Benchmark Rate</th>
                  <th style={{ textAlign: 'right' }}>Price Range</th>
                  <th style={{ textAlign: 'center' }}>YoY Growth</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.district}, {b.province}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                        {b.category.replace('-', ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: '#38bdf8' }}>
                      {formatLKR(b.avgPricePerPerch, true)} <span style={{ fontSize: 10, fontWeight: 400, color: '#94a3b8' }}>/ P</span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatLKR(b.priceRange.min, true)} – {formatLKR(b.priceRange.max, true)}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#34d399', fontSize: 12 }}>
                      +{b.yoyGrowthPct}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => toggleCompare(b.id)}
                        >
                          {compareIds.includes(b.id) ? 'Comparing' : 'Compare'}
                        </button>
                        {onUseAsValuation && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => onUseAsValuation(b)}
                          >
                            Use Comp
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Citations & Methodology Footer ── */}
        <div style={{
          marginTop: 32, padding: '16px 20px', borderRadius: 'var(--radius)',
          background: 'rgba(15,23,42,0.6)', border: '1px solid var(--border-subtle)',
          fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6,
        }}>
          <strong>Data Sources & Methodology:</strong> Data compiled from the <em>Central Bank of Sri Lanka (CBSL) Land Valuation Indicator (LVI)</em> (tracking 13 Divisional Secretariats of Colombo district), <em>LankaPropertyWeb Land Price Index (LPI)</em>, and registered valuer market surveys across Western, Southern, Central, and North Western provinces. Figures represent prevailing advertised and transacted bare land values per perch for the 2024–2025/2026 economic cycle. Individual property values may vary according to direct frontage, shape, road width, and clear title deed status.
        </div>
      </div>
    </div>
  );
}
