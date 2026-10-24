import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap, Circle,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers, Plus, X, Search, Filter, AlertTriangle, MapPin,
  ExternalLink, Compass, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { db } from '../services/db';
import {
  formatLKR, formatDate, formatExtent, colorForPrice,
} from '../utils';
import {
  SL_CENTER, SEARCH_RADII, LAND_TYPE_LABELS, PRICE_RANGE_COLORS,
  DISTRICTS_BY_PROVINCE,
} from '../constants';
import type {
  ValuationRecord, MapMode, SearchRadius, GPSCoordinates, ValuationFilters,
} from '../types';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createPinIcon(color: string, size = 30): L.DivIcon {
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
        box-shadow: 0 4px 12px rgba(0,0,0,0.45);
        cursor: pointer;
        transition: transform 0.15s ease;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

function createClickTargetIcon(): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div class="click-target-pin"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function createHeatSpotIcon(color: string, size = 26): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: radial-gradient(circle, ${color} 0%, ${color} 45%, transparent 100%);
        box-shadow: 0 0 14px ${color}, 0 0 24px ${color};
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const HEAT_LEVELS = [
  { min: 5000000, color: '#ef4444', label: '> 5M / perch (Highest)', radius: 1800 },
  { min: 2500000, color: '#f97316', label: '2.5M - 5M / perch (High)', radius: 1400 },
  { min: 1500000, color: '#eab308', label: '1.5M - 2.5M / perch (Moderate)', radius: 1100 },
  { min: 800000, color: '#10b981', label: '800K - 1.5M / perch (Mid)', radius: 900 },
  { min: 0, color: '#06b6d4', label: '< 800K / perch (Affordable)', radius: 800 },
];

function getHeatLevel(price: number) {
  for (const level of HEAT_LEVELS) {
    if (price >= level.min) return level;
  }
  return HEAT_LEVELS[HEAT_LEVELS.length - 1];
}

// ─── Map Click Handler ────────────────────────────────────────────────────

function MapClickHandler({
  onMapClick,
}: { onMapClick: (latlng: GPSCoordinates) => void }) {
  useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ─── Fly-to controller ────────────────────────────────────────────────────

function FlyTo({ center, zoom }: { center: GPSCoordinates | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom ?? map.getZoom(), { duration: 1.1 });
    }
  }, [center, zoom, map]);
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
  onAddNew: (coords?: GPSCoordinates) => void;
}

export default function MapPage({ onAddNew }: Props) {
  const [records, setRecords] = useState<ValuationRecord[]>(() => db.getAll());
  const [mode, setMode] = useState<MapMode>('markers');
  const [mapStyle, setMapStyle] = useState<GoogleMapStyle>('m');
  const [selectedRecord, setSelectedRecord] = useState<ValuationRecord | null>(null);
  const [clickedLocation, setClickedLocation] = useState<GPSCoordinates | null>(null);
  const [searchRadius, setSearchRadius] = useState<SearchRadius>(1);
  const [flyTarget, setFlyTarget] = useState<{ center: GPSCoordinates; zoom?: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ValuationFilters>({});
  const [searchText, setSearchText] = useState('');

  // Subscribe to reactive database changes so new records show up immediately
  useEffect(() => {
    return db.subscribe(() => {
      setRecords(db.getAll());
    });
  }, []);

  // Filter records
  const filtered = useMemo(() => {
    let result = records;
    if (filters.district) result = result.filter((r) => r.district === filters.district);
    if (filters.landType) result = result.filter((r) => r.landType === filters.landType);
    if (filters.priceMin) result = result.filter((r) => r.pricePerPerch >= filters.priceMin!);
    if (filters.priceMax) result = result.filter((r) => r.pricePerPerch <= filters.priceMax!);
    if (filters.dateFrom) result = result.filter((r) => r.valuationDate >= filters.dateFrom!);
    if (filters.dateTo) result = result.filter((r) => r.valuationDate <= filters.dateTo!);
    return result;
  }, [records, filters]);

  // Area stats for clicked location
  const areaStats = useMemo(() => {
    if (!clickedLocation) return null;
    return db.getAreaStatistics(clickedLocation, searchRadius);
  }, [clickedLocation, searchRadius]);

  // Handle search by town/district/address
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchText.toLowerCase().trim();
    if (!q) return;
    const found = records.find(
      (r) =>
        r.town.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q),
    );
    if (found) {
      setFlyTarget({ center: found.coordinates, zoom: 15 });
      setSelectedRecord(found);
      setClickedLocation(null);
    }
  }

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Bar ── */}
      <div className="map-page-topbar" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 14px',
        background: 'var(--surface-1)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0, zIndex: 10, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, flex: 1, minWidth: 150 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            <Search size={14} className="search-icon" />
            <input
              className="search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search Colombo, Kandy, Gampaha, address or ref..."
            />
          </div>
          <button type="submit" className="btn btn-ghost btn-sm">Find</button>
        </form>

        {/* Google Map Layer Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Map:</span>
          <select
            className="form-select"
            style={{ width: 'auto', fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value as GoogleMapStyle)}
          >
            {GOOGLE_MAP_STYLES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* View Mode Toggle */}
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 3 }}>
          {([['markers', 'Pins'], ['price-range', 'Price Range'], ['heatmap', 'Heatmap 🔥']] as [MapMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`btn btn-sm ${mode === m ? 'btn-primary' : ''}`}
              style={{
                padding: '4px 10px', border: 'none',
                background: mode === m ? 'var(--brand-600)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-secondary)',
                fontWeight: mode === m ? 600 : 500,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Radius selector */}
        <select
          className="form-select"
          style={{ width: 'auto', fontSize: 12, padding: '5px 28px 5px 8px' }}
          value={searchRadius}
          onChange={(e) => setSearchRadius(Number(e.target.value) as SearchRadius)}
          title="Area Intelligence Search Radius"
        >
          {SEARCH_RADII.map((r) => (
            <option key={r.value} value={r.value}>Radius: {r.label}</option>
          ))}
        </select>

        {/* Filter Toggle */}
        <button
          className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={13} /> Filters
        </button>

        {/* Add Valuation Button */}
        <button
          className="btn btn-success btn-sm"
          onClick={() => onAddNew(clickedLocation ?? undefined)}
          title={clickedLocation ? 'Add valuation at selected coordinates' : 'Add new valuation report'}
        >
          <Plus size={14} /> Add Valuation
        </button>
      </div>

      {/* ── Filter Bar ── */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 10, padding: '10px 16px', alignItems: 'center', flexWrap: 'wrap',
          background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <select
            className="form-select" style={{ width: 140, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.district ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined }))}
          >
            <option value="">All Districts</option>
            {Object.values(DISTRICTS_BY_PROVINCE).flat().sort().map((d) => <option key={d}>{d}</option>)}
          </select>
          <select
            className="form-select" style={{ width: 130, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.landType ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, landType: (e.target.value as ValuationFilters['landType']) || undefined }))}
          >
            <option value="">All Land Types</option>
            {Object.entries(LAND_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input
            type="date" className="form-input" style={{ width: 140, fontSize: 12 }} placeholder="From date"
            value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))}
          />
          <input
            type="date" className="form-input" style={{ width: 140, fontSize: 12 }} placeholder="To date"
            value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}>Reset</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} / {records.length} records visible
          </span>
        </div>
      )}

      {/* ── Clicked Location Top Banner (Clear & Informative) ── */}
      {clickedLocation && !selectedRecord && (
        <div style={{
          position: 'absolute',
          top: showFilters ? 104 : 54,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 990,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          borderRadius: 30,
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: 12,
          color: '#f8fafc',
          maxWidth: '90%',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
            <span>
              Analyzing location: <strong>{clickedLocation.lat.toFixed(4)}°N, {clickedLocation.lng.toFixed(4)}°E</strong>
              {' '}(Radius: {searchRadius < 1 ? `${searchRadius * 1000}m` : `${searchRadius}km`})
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => onAddNew(clickedLocation)}
              style={{
                background: '#10b981', color: '#fff', border: 'none',
                borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <Plus size={12} /> Add Here
            </button>
            <button
              onClick={() => setClickedLocation(null)}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#cbd5e1', border: 'none',
                borderRadius: '50%', width: 22, height: 22, display: 'flex',
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
              title="Clear selection"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* ── Main Map Container ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapContainer
          center={[SL_CENTER.lat, SL_CENTER.lng]}
          zoom={8}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          {/* Exact Google Maps Tile Layer */}
          <TileLayer
            key={mapStyle}
            url={`https://{s}.google.com/vt/lyrs=${mapStyle}&x={x}&y={y}&z={z}`}
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            maxZoom={20}
            attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          />

          {/* Map click listener to inspect nearby area prices */}
          <MapClickHandler onMapClick={(latlng) => {
            setClickedLocation(latlng);
            setSelectedRecord(null);
          }} />

          {flyTarget && <FlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}

          {/* Heatmap Mode: Glowing heat circles and heat spot points (No Pins!) */}
          {mode === 'heatmap' && filtered.map((r) => {
            const heat = getHeatLevel(r.pricePerPerch);
            return (
              <React.Fragment key={`heat_${r.id}`}>
                {/* Outer heat gradient diffusion circle */}
                <Circle
                  center={[r.coordinates.lat, r.coordinates.lng]}
                  radius={heat.radius}
                  pathOptions={{
                    fillColor: heat.color,
                    fillOpacity: 0.22,
                    stroke: false,
                  }}
                />
                {/* Core intensity circle */}
                <Circle
                  center={[r.coordinates.lat, r.coordinates.lng]}
                  radius={heat.radius * 0.42}
                  pathOptions={{
                    fillColor: heat.color,
                    fillOpacity: 0.48,
                    color: '#ffffff',
                    weight: 1.5,
                    stroke: true,
                  }}
                />
                {/* Interactive heat spot */}
                <Marker
                  position={[r.coordinates.lat, r.coordinates.lng]}
                  icon={createHeatSpotIcon(heat.color)}
                  eventHandlers={{
                    click: () => {
                      setSelectedRecord(r);
                      setClickedLocation(null);
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -16]} opacity={1} className="val-tooltip">
                    <div style={{ minWidth: 170, textAlign: 'left', lineHeight: 1.35 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: heat.color, letterSpacing: '-0.01em' }}>
                        {formatLKR(r.pricePerPerch, true)} <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>/ perch</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginTop: 3 }}>
                        {r.title}
                      </div>
                      <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                        {r.town}, {r.district} · {formatExtent(r.landExtent)}
                      </div>
                      <div style={{ fontSize: 9, color: '#60a5fa', marginTop: 4, fontWeight: 500 }}>
                        👉 Click to view valuation details
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Regular Pin Markers (Pins and Price Range modes) */}
          {mode !== 'heatmap' && filtered.map((r) => {
            const color = mode === 'price-range' ? colorForPrice(r.pricePerPerch) : '#2563eb';
            const icon = createPinIcon(color);
            return (
              <Marker
                key={r.id}
                position={[r.coordinates.lat, r.coordinates.lng]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    setSelectedRecord(r);
                    setClickedLocation(null);
                  },
                }}
              >
                {/* Instant Hover Tooltip with Price Per Perch Detail */}
                <Tooltip
                  direction="top"
                  offset={[0, -28]}
                  opacity={1}
                  className="val-tooltip"
                >
                  <div style={{ minWidth: 170, textAlign: 'left', lineHeight: 1.35 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#34d399', letterSpacing: '-0.01em' }}>
                      {formatLKR(r.pricePerPerch, true)} <span style={{ fontSize: 10, fontWeight: 500, color: '#94a3b8' }}>/ perch</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#f8fafc', marginTop: 3, maxWidth: 220 }} className="truncate">
                      {r.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>
                      {r.town}, {r.district} · {formatExtent(r.landExtent)}
                    </div>
                    <div style={{ fontSize: 9, color: '#60a5fa', marginTop: 4, fontWeight: 500 }}>
                      👉 Click pin to view full valuation report
                    </div>
                  </div>
                </Tooltip>

                {/* Click Popup with quick stats */}
                <Popup>
                  <div style={{ minWidth: 230, fontFamily: 'Inter, sans-serif' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{r.address}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <PopupStat label="Price / Perch" value={formatLKR(r.pricePerPerch, true)} color="#10b981" />
                      <PopupStat label="Total Land Value" value={formatLKR(r.totalLandValue, true)} />
                      <PopupStat label="Land Extent" value={formatExtent(r.landExtent)} />
                      <PopupStat label="Valuation Date" value={formatDate(r.valuationDate)} />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', marginTop: 10, fontSize: 11, padding: '5px 8px' }}
                      onClick={() => {
                        setSelectedRecord(r);
                        setClickedLocation(null);
                      }}
                    >
                      View Complete Record
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Click location visual target and search circle */}
          {clickedLocation && (
            <>
              <Marker
                position={[clickedLocation.lat, clickedLocation.lng]}
                icon={createClickTargetIcon()}
              />
              <Circle
                center={[clickedLocation.lat, clickedLocation.lng]}
                radius={searchRadius * 1000}
                pathOptions={{
                  color: '#2563eb',
                  fillColor: '#3b82f6',
                  fillOpacity: 0.12,
                  weight: 2,
                  dashArray: '6,6',
                }}
              />
            </>
          )}
        </MapContainer>

        {/* Legend (Heatmap mode) */}
        {mode === 'heatmap' && (
          <div style={{
            position: 'absolute', bottom: 24, left: 16, zIndex: 990,
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f87171', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🔥 Price Heatmap Intensity
            </div>
            {HEAT_LEVELS.map((lvl) => (
              <div key={lvl.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: lvl.color, boxShadow: `0 0 6px ${lvl.color}`, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lvl.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Legend (Price-range mode) */}
        {mode === 'price-range' && (
          <div style={{
            position: 'absolute', bottom: 24, left: 16, zIndex: 990,
            background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Price per Perch (LKR)
            </div>
            {PRICE_RANGE_COLORS.map((r) => (
              <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{r.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Floating Record Count Badge (positioned top-left to never conflict) */}
        <div style={{
          position: 'absolute', top: 12, left: 60,
          zIndex: 990, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(6px)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)',
          boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <MapPin size={13} color="#3b82f6" />
          <span><strong>{filtered.length}</strong> valuations mapped</span>
        </div>

        {/* Property Detail Slide-out Panel */}
        {selectedRecord && (
          <PropertyPanel
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
          />
        )}

        {/* Area Stats Intelligence Slide-out Panel */}
        {clickedLocation && !selectedRecord && areaStats && (
          <AreaStatsPanel
            stats={areaStats}
            radius={searchRadius}
            location={clickedLocation}
            onRadiusChange={(r) => setSearchRadius(r)}
            onAddNewAtLocation={() => onAddNew(clickedLocation)}
            onClose={() => setClickedLocation(null)}
            onSelectRecord={(r) => {
              setSelectedRecord(r);
              setFlyTarget({ center: r.coordinates, zoom: 16 });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Popup Stat ────────────────────────────────────────────────────────────

function PopupStat({ label, value, color = 'var(--text-primary)' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ─── Property Detail Panel ─────────────────────────────────────────────────

function PropertyPanel({ record: r, onClose }: {
  record: ValuationRecord;
  onClose: () => void;
}) {
  return (
    <div className="slide-panel">
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        background: 'var(--surface-2)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ref: {r.referenceNumber}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {r.isDemoData && <span className="badge badge-demo">DEMO</span>}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Price Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(16,185,129,0.15))',
          border: '1px solid rgba(37,99,235,0.3)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Valued Price per Perch
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: '#34d399' }}>
            {formatLKR(r.pricePerPerch)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Total Value: {formatLKR(r.totalLandValue)} · Extent: {formatExtent(r.landExtent)}
          </div>
        </div>

        {/* Details Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DetailItem label="District" value={r.district} />
          <DetailItem label="Province" value={r.province} />
          <DetailItem label="Town" value={r.town} />
          <DetailItem label="Land Type" value={LAND_TYPE_LABELS[r.landType]} />
          <DetailItem label="Road Access" value={r.roadAccess.replace(/-/g, ' ')} />
          <DetailItem label="Valuation Date" value={formatDate(r.valuationDate)} />
          <DetailItem label="Valuer" value={r.valuerName ?? '—'} />
          <DetailItem label="Purpose" value={r.valuationPurpose?.replace(/-/g, ' ') ?? '—'} />
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Address</div>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.address}</div>
        </div>

        {r.propertyCharacteristics && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Characteristics</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.propertyCharacteristics}</div>
          </div>
        )}

        {r.notes && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Valuation Notes</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.notes}</div>
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          <div>GPS: {r.coordinates.lat.toFixed(6)}, {r.coordinates.lng.toFixed(6)}</div>
          {r.reportReference && <div>Report Ref: {r.reportReference}</div>}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

// ─── Area Stats Panel ──────────────────────────────────────────────────────

function AreaStatsPanel({
  stats,
  radius,
  location,
  onRadiusChange,
  onAddNewAtLocation,
  onClose,
  onSelectRecord,
}: {
  stats: ReturnType<typeof db.getAreaStatistics>;
  radius: SearchRadius;
  location: GPSCoordinates;
  onRadiusChange: (r: SearchRadius) => void;
  onAddNewAtLocation: () => void;
  onClose: () => void;
  onSelectRecord: (r: ValuationRecord) => void;
}) {
  return (
    <div className="slide-panel">
      {/* Panel Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--surface-2)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={16} color="#3b82f6" />
            Area Price Intelligence
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Location: {location.lat.toFixed(4)}°N, {location.lng.toFixed(4)}°E
          </div>
        </div>
        <button
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          onClick={onClose}
          title="Close panel"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Radius Filter Pills */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Analysis Radius
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SEARCH_RADII.map((r) => (
              <button
                key={r.value}
                onClick={() => onRadiusChange(r.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: radius === r.value ? 700 : 500,
                  background: radius === r.value ? 'var(--brand-600)' : 'var(--surface-2)',
                  color: radius === r.value ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${radius === r.value ? 'var(--brand-500)' : 'var(--border-default)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {stats.count === 0 ? (
          <div className="empty-state" style={{ padding: '30px 16px' }}>
            <MapPin size={36} className="empty-state-icon" style={{ color: '#64748b' }} />
            <div className="empty-state-title" style={{ marginTop: 8 }}>No Records Within {radius < 1 ? `${radius * 1000}m` : `${radius}km`}</div>
            <div className="empty-state-desc" style={{ marginBottom: 16 }}>
              There are currently no recorded land valuations within this radius. Try widening your search radius or add the first valuation for this area.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              {radius < 5 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onRadiusChange(5 as SearchRadius)}
                >
                  Expand Search Radius to 5 km
                </button>
              )}
              {radius < 10 && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => onRadiusChange(10 as SearchRadius)}
                >
                  Expand Search Radius to 10 km
                </button>
              )}
              <button
                className="btn btn-success btn-sm"
                onClick={onAddNewAtLocation}
                style={{ marginTop: 4 }}
              >
                <Plus size={14} /> Record Valuation at This Location
              </button>
            </div>
          </div>
        ) : (
          <>
            {!stats.hasEnoughData && (
              <div style={{
                display: 'flex', gap: 8, padding: '10px 12px',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius)', fontSize: 12, color: '#fcd34d',
              }}>
                <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Limited sample ({stats.count} record{stats.count !== 1 ? 's' : ''}). Consider expanding radius for more statistical certainty.
                </span>
              </div>
            )}

            {/* Price Hero Card */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.18), rgba(16,185,129,0.15))',
              border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Estimated Median Price / Perch
              </div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 800, color: '#34d399' }}>
                {formatLKR(stats.medianPricePerPerch)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Based on {stats.count} nearby valuation{stats.count !== 1 ? 's' : ''} within {radius < 1 ? `${radius * 1000}m` : `${radius}km`}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatBox label="Average / Perch" value={formatLKR(stats.averagePricePerPerch, true)} color="#38bdf8" />
              <StatBox label="Sample Count" value={`${stats.count} reports`} color="#818cf8" />
              <StatBox label="Lowest Price" value={formatLKR(stats.minPricePerPerch, true)} color="#34d399" />
              <StatBox label="Highest Price" value={formatLKR(stats.maxPricePerPerch, true)} color="#f87171" />
            </div>

            {/* Breakdown by Property Type */}
            {Object.entries(stats.byLandType).length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  By Land Type in Area
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(stats.byLandType).map(([type, s]) => (
                    <div
                      key={type}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        fontSize: 12, padding: '8px 12px', background: 'var(--surface-2)',
                        borderRadius: 'var(--radius)',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {LAND_TYPE_LABELS[type] ?? type}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>{s?.count} records</span>
                      <span style={{ fontWeight: 700, color: '#34d399' }}>
                        {formatLKR(s?.median ?? 0, true)}/P
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Nearby Records List */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Nearby Valuations ({stats.records.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.records.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    style={{
                      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius)', padding: '10px 12px',
                      textAlign: 'left', cursor: 'pointer', width: '100%',
                      transition: 'border-color var(--t-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }} className="truncate">
                          {r.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {formatDate(r.valuationDate)} · {r.town}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#34d399', flexShrink: 0, marginLeft: 10 }}>
                        {formatLKR(r.pricePerPerch, true)}/P
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Add Record button */}
            <button
              className="btn btn-outline btn-sm"
              onClick={onAddNewAtLocation}
              style={{ width: '100%', marginTop: 4 }}
            >
              <Plus size={13} /> Add New Valuation at this Location
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: 'var(--surface-2)', borderRadius: 'var(--radius)',
      padding: '10px 12px', border: `1px solid ${color}25`,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
