import React, { useState, useMemo, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Compass, Search, TrendingUp, Filter, MapPin, Calculator,
  ArrowUpRight, Building2, Sparkles, Plus, ExternalLink,
  Layers, Check, Scale, ShieldCheck, Info, Map as MapIcon,
  LayoutGrid, Table as TableIcon, Eye,
} from 'lucide-react';
import {
  MARKET_BENCHMARKS, CBSL_LVI_DATA, type MarketBenchmark,
} from '../data/marketBenchmarks';
import { formatLKR } from '../utils';
import { PROVINCES, SL_CENTER } from '../constants';
import type { Province, GPSCoordinates } from '../types';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getPinColor(category: MarketBenchmark['category']): string {
  switch (category) {
    case 'super-prime':
      return '#ef4444'; // Red
    case 'prime-suburb':
      return '#3b82f6'; // Blue
    case 'growth-corridor':
      return '#10b981'; // Green / Emerald
    case 'tourism-coastal':
      return '#a855f7'; // Purple
    case 'provincial-hub':
      return '#f59e0b'; // Amber
    default:
      return '#60a5fa';
  }
}

function createBenchmarkPinIcon(color: string, size = 28): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle at 35% 35%, #ffffff 0%, ${color} 45%, ${color} 100%);
        border: 2px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: transform 0.15s ease;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function FlyToBenchmark({ target }: { target: GPSCoordinates | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 13, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

type GoogleMapStyle = 'm' | 's' | 'y' | 'p';

const GOOGLE_MAP_STYLES: { id: GoogleMapStyle; label: string }[] = [
  { id: 'm', label: 'Google Roadmap' },
  { id: 's', label: 'Satellite' },
  { id: 'y', label: 'Hybrid' },
  { id: 'p', label: 'Terrain' },
];

interface Props {
  onUseAsValuation?: (benchmark: MarketBenchmark) => void;
}

export default function ExplorePage({ onUseAsValuation }: Props) {
  const [search, setSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriceTier, setSelectedPriceTier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'map' | 'cards' | 'table'>('map');
  const [mapStyle, setMapStyle] = useState<GoogleMapStyle>('m');
  const [calcPerches, setCalcPerches] = useState<number>(10);
  const [calcSelectedId, setCalcSelectedId] = useState<string>('sub-rajagiriya');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedBenchmark, setSelectedBenchmark] = useState<MarketBenchmark | null>(null);
  const [flyTarget, setFlyTarget] = useState<GPSCoordinates | null>(null);

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

  function focusBenchmarkOnMap(b: MarketBenchmark) {
    setSelectedBenchmark(b);
    setFlyTarget(b.coordinates);
    if (viewMode !== 'map') {
      setViewMode('map');
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--surface-0)' }}>
      {/* ── Top Header & Stats Bar ── */}
      <div style={{
        padding: '16px 24px 12px', background: 'var(--surface-card)',
        borderBottom: '1px solid var(--border-default)', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: 14,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Compass size={15} /> Sri Lanka Market Intelligence & GIS Explorer
            </div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 800,
              color: 'var(--text-primary)', marginTop: 2, letterSpacing: '-0.02em',
            }}>
              Sri Lanka Land Price Explorer
            </h1>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Explore <strong>{MARKET_BENCHMARKS.length} official market benchmarks</strong> across all 9 provinces • CBSL LVI Index: <strong>256.4 (+11.4% YoY)</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 3 }}>
              <button
                className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', border: 'none', background: viewMode === 'map' ? 'var(--brand-600)' : 'transparent', color: viewMode === 'map' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setViewMode('map')}
              >
                <MapIcon size={14} /> Map View
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'cards' ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', border: 'none', background: viewMode === 'cards' ? 'var(--brand-600)' : 'transparent', color: viewMode === 'cards' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid size={14} /> Cards ({filtered.length})
              </button>
              <button
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : ''}`}
                style={{ padding: '6px 12px', border: 'none', background: viewMode === 'table' ? 'var(--brand-600)' : 'transparent', color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setViewMode('table')}
              >
                <TableIcon size={14} /> Table
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ── */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
          marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)',
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: 220, flex: '1 1 220px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 32, width: '100%', fontSize: 12, height: 34 }}
              placeholder="Search 55+ towns, cities (e.g. Rajagiriya, Negombo, Kandy, Galle)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Province select */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: 12, height: 34, padding: '4px 28px 4px 8px' }}
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
            style={{ width: 'auto', fontSize: 12, height: 34, padding: '4px 28px 4px 8px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Market Tiers</option>
            <option value="super-prime">🔴 Super Prime (Colombo & Galle Fort)</option>
            <option value="prime-suburb">🔵 Prime Residential Suburbs</option>
            <option value="growth-corridor">🟢 High-Growth Expressway Corridors</option>
            <option value="tourism-coastal">🟣 Tourism & Coastal Hotspots</option>
            <option value="provincial-hub">🟡 Provincial Hubs & Capitals</option>
          </select>

          {/* Price Tier */}
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: 12, height: 34, padding: '4px 28px 4px 8px' }}
            value={selectedPriceTier}
            onChange={(e) => setSelectedPriceTier(e.target.value)}
          >
            <option value="all">All Price Ranges</option>
            <option value="under-1m">Under LKR 1M / P</option>
            <option value="1m-3m">LKR 1M – 3M / P</option>
            <option value="3m-10m">LKR 3M – 10M / P</option>
            <option value="above-10m">Above LKR 10M / P</option>
          </select>

          {/* Map style selector (only in map view) */}
          {viewMode === 'map' && (
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: 12, height: 34, padding: '4px 28px 4px 8px' }}
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as GoogleMapStyle)}
            >
              {GOOGLE_MAP_STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          )}

          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            Showing <strong>{filtered.length}</strong> locations
          </span>
        </div>
      </div>

      {/* ── Main View Area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
        {/* ════════ MAP VIEW ════════ */}
        {viewMode === 'map' && (
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <MapContainer
              center={[SL_CENTER.lat, SL_CENTER.lng]}
              zoom={8}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url={`https://{s}.google.com/vt/lyrs=${mapStyle}&x={x}&y={y}&z={z}`}
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                maxZoom={20}
                attribution="&copy; Google Maps"
              />

              {flyTarget && <FlyToBenchmark target={flyTarget} />}

              {/* Benchmark Markers */}
              {filtered.map((b) => {
                const color = getPinColor(b.category);
                const icon = createBenchmarkPinIcon(color);
                return (
                  <Marker
                    key={b.id}
                    position={[b.coordinates.lat, b.coordinates.lng]}
                    icon={icon}
                    eventHandlers={{
                      click: () => {
                        setSelectedBenchmark(b);
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -26]} opacity={1} className="val-tooltip">
                      <div style={{ minWidth: 160, lineHeight: 1.3 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#38bdf8' }}>
                          {formatLKR(b.avgPricePerPerch, true)} <span style={{ fontSize: 10, color: '#94a3b8' }}>/ P</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginTop: 2 }}>
                          {b.name}
                        </div>
                        <div style={{ fontSize: 10, color: '#34d399', fontWeight: 600, marginTop: 2 }}>
                          +{b.yoyGrowthPct}% YoY Growth
                        </div>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>

            {/* Map Legend (Bottom-Left) */}
            <div style={{
              position: 'absolute', bottom: 20, left: 16, zIndex: 900,
              background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(10px)',
              border: '1px solid var(--border-default)', borderRadius: 'var(--radius)',
              padding: '10px 14px', boxShadow: 'var(--shadow-lg)', maxWidth: 220,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Market Tiers (Pins)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Super Prime (&gt; 10M/P)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Prime Suburbs</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ color: 'var(--text-primary)' }}>High-Growth Corridors</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Tourism & Coastal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                  <span style={{ color: 'var(--text-primary)' }}>Provincial Hubs</span>
                </div>
              </div>
            </div>

            {/* Selected Pin Details Overlay Card (Top-Right / Bottom on mobile) */}
            {selectedBenchmark && (
              <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 990,
                width: 'calc(100% - 32px)', maxWidth: 360,
                background: 'rgba(15, 23, 42, 0.96)', backdropFilter: 'blur(16px)',
                border: '1px solid rgba(56, 189, 248, 0.4)', borderRadius: 'var(--radius-xl)',
                padding: '18px', boxShadow: 'var(--shadow-xl)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      padding: '2px 8px', borderRadius: 10,
                      background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8',
                    }}>
                      {selectedBenchmark.category.replace('-', ' ')}
                    </span>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 6, lineHeight: 1.25 }}>
                      {selectedBenchmark.name}
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {selectedBenchmark.district} District • {selectedBenchmark.province} Province
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBenchmark(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, padding: 4 }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{
                  marginTop: 12, padding: '10px 12px', borderRadius: 'var(--radius)',
                  background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                    Market Benchmark Rate
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#38bdf8' }}>
                      {formatLKR(selectedBenchmark.avgPricePerPerch, true)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ perch</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                      +{selectedBenchmark.yoyGrowthPct}% YoY
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                    Range: {formatLKR(selectedBenchmark.priceRange.min, true)} – {formatLKR(selectedBenchmark.priceRange.max, true)}
                  </div>
                </div>

                {/* 10 Perch Estimate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>
                  <span>Standard 10P Value:</span>
                  <strong style={{ color: '#fff' }}>{formatLKR(selectedBenchmark.avgPricePerPerch * 10)}</strong>
                </div>

                {/* Drivers */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                    Market Drivers:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {selectedBenchmark.keyDrivers.map((d, i) => (
                      <span key={i} style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-secondary)' }}>
                        • {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  {onUseAsValuation && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => onUseAsValuation(selectedBenchmark)}
                    >
                      <Plus size={14} /> Use as Comp
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => toggleCompare(selectedBenchmark.id)}
                    style={{ fontSize: 11 }}
                  >
                    {compareIds.includes(selectedBenchmark.id) ? 'Comparing' : 'Compare'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ CARDS & TABLE VIEWS (SCROLLABLE) ════════ */}
        {viewMode !== 'map' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
              {/* Active Compare Drawer if items selected */}
              {comparedItems.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.35), rgba(15,23,42,0.95))',
                  border: '1px solid rgba(59,130,246,0.4)', borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px', marginBottom: 20, boxShadow: 'var(--shadow-lg)',
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

                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: 14 }}>
                    {comparedItems.map((c) => (
                      <div key={c.id} style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid var(--border-default)' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{c.district} District • {c.province}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#38bdf8' }}>{formatLKR(c.avgPricePerPerch, true)} <span style={{ fontSize: 10, color: '#94a3b8' }}>/ P</span></div>
                        <div style={{ fontSize: 11, color: '#34d399', fontWeight: 600, marginTop: 2 }}>+{c.yoyGrowthPct}% YoY Growth</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                          <strong>10 Perch Value:</strong> {formatLKR(c.avgPricePerPerch * 10)}
                        </div>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ width: '100%', marginTop: 8, fontSize: 11, color: '#38bdf8' }}
                          onClick={() => focusBenchmarkOnMap(c)}
                        >
                          <MapPin size={12} /> View on Map
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Calculator */}
              <div style={{
                background: 'var(--surface-card)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-xl)', padding: '16px 20px', marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Calculator size={16} color="#38bdf8" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Quick Comp & Land Value Estimator
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, alignItems: 'center' }}>
                  <select
                    className="form-select"
                    style={{ fontSize: 12 }}
                    value={calcSelectedId}
                    onChange={(e) => setCalcSelectedId(e.target.value)}
                  >
                    {MARKET_BENCHMARKS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.district}) — {formatLKR(b.avgPricePerPerch, true)}/P
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      className="form-input"
                      style={{ width: '100%', fontSize: 12 }}
                      value={calcPerches}
                      onChange={(e) => setCalcPerches(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="Perches"
                    />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalcPerches(10)} style={{ fontSize: 11 }}>10P</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCalcPerches(15)} style={{ fontSize: 11 }}>15P</button>
                  </div>

                  <div style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 600 }}>Estimated Value:</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{formatLKR(estimatedCalcTotal)}</div>
                  </div>

                  {onUseAsValuation && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      onClick={() => onUseAsValuation(calcTarget)}
                    >
                      <Plus size={14} /> Pre-fill Valuation
                    </button>
                  )}
                </div>
              </div>

              {/* ════════ CARDS VIEW ════════ */}
              {viewMode === 'cards' && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                  gap: 16,
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
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                padding: '2px 7px', borderRadius: 10,
                                background: 'rgba(56,189,248,0.12)', color: '#38bdf8',
                              }}>
                                {b.category.replace('-', ' ')}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                {b.district} • {b.province}
                              </span>
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6 }}>
                              {b.name}
                            </h3>
                          </div>

                          <span style={{
                            fontSize: 12, fontWeight: 700, color: '#34d399',
                            background: 'rgba(16,185,129,0.1)', padding: '2px 7px', borderRadius: 6,
                            display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0,
                          }}>
                            <ArrowUpRight size={13} /> +{b.yoyGrowthPct}%
                          </span>
                        </div>

                        {/* Benchmark rate badge */}
                        <div style={{
                          marginTop: 12, padding: '10px 12px', borderRadius: 'var(--radius)',
                          background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                            Benchmark Rate
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#38bdf8' }}>
                              {formatLKR(b.avgPricePerPerch, true)}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ perch</span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                            Range: {formatLKR(b.priceRange.min, true)} – {formatLKR(b.priceRange.max, true)}
                          </div>
                        </div>

                        {/* Key Drivers */}
                        <div style={{ marginTop: 12, flex: 1 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {b.keyDrivers.map((d, i) => (
                              <span key={i} style={{
                                fontSize: 10, background: 'rgba(148, 163, 184, 0.08)',
                                color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4,
                              }}>
                                • {d}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Card actions */}
                        <div style={{
                          marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border-subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                        }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '3px 8px', color: '#38bdf8' }}
                            onClick={() => focusBenchmarkOnMap(b)}
                          >
                            <MapPin size={12} /> View Map
                          </button>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: 11, padding: '3px 8px' }}
                              onClick={() => toggleCompare(b.id)}
                            >
                              <Scale size={12} /> {isComparing ? 'Comparing' : 'Compare'}
                            </button>
                            {onUseAsValuation && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                style={{ fontSize: 11, padding: '3px 8px' }}
                                onClick={() => onUseAsValuation(b)}
                              >
                                Use Comp
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ════════ TABLE VIEW ════════ */}
              {viewMode === 'table' && (
                <div style={{
                  background: 'var(--surface-card)', border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-lg)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)',
                }}>
                  <table className="table" style={{ width: '100%', minWidth: 700, margin: 0 }}>
                    <thead>
                      <tr>
                        <th>Location / Town</th>
                        <th>District / Province</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Benchmark Rate</th>
                        <th style={{ textAlign: 'right' }}>Typical Range</th>
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
                                style={{ padding: '3px 8px', fontSize: 11, color: '#38bdf8' }}
                                onClick={() => focusBenchmarkOnMap(b)}
                              >
                                Map
                              </button>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
