import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { X, MapPin, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { db } from '../services/db';
import {
  parseExtentToPerches, calculatePricePerPerch, formatLKR, generateId,
} from '../utils';
import {
  PROVINCES, DISTRICTS_BY_PROVINCE, LAND_TYPE_LABELS, ROAD_ACCESS_LABELS,
  VALUATION_PURPOSE_LABELS, SL_CENTER,
} from '../constants';
import type {
  ValuationRecord, Province, LandType, RoadAccess, ValuationPurpose, GPSCoordinates,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Leaflet icon fix
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function LocationPicker({ value, onChange }: {
  value: GPSCoordinates;
  onChange: (c: GPSCoordinates) => void;
}) {
  function Handler() {
    const map = useMapEvents({
      click(e) { onChange({ lat: e.latlng.lat, lng: e.latlng.lng }); },
    });
    useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
        if (value.lat && value.lng) {
          map.setView([value.lat, value.lng], Math.max(map.getZoom(), 13));
        }
      }, 150);
      return () => clearTimeout(timer);
    }, [map, value.lat, value.lng]);
    return null;
  }

  const hasCoords = Boolean(value.lat && value.lng && value.lat !== 0);

  return (
    <div style={{ height: 250, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border-default)', position: 'relative' }}>
      <MapContainer
        center={[hasCoords ? value.lat : SL_CENTER.lat, hasCoords ? value.lng : SL_CENTER.lng]}
        zoom={hasCoords ? 13 : 7}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          maxZoom={20}
          attribution="&copy; Google Maps"
        />
        <Handler />
        {hasCoords && (
          <Marker position={[value.lat, value.lng]} />
        )}
      </MapContainer>
    </div>
  );
}

interface Props {
  record?: ValuationRecord;
  initialCoordinates?: GPSCoordinates;
  initialData?: Partial<ValuationRecord>;
  onClose: () => void;
}

type FormErrors = Partial<Record<string, string>>;

interface FormState {
  referenceNumber: string;
  reportReference: string;
  title: string;
  address: string;
  province: Province | '';
  district: string;
  divisionalSecretariat: string;
  town: string;
  lat: string;
  lng: string;
  acres: string;
  roods: string;
  perches: string;
  landType: LandType | '';
  roadAccess: RoadAccess | '';
  propertyCharacteristics: string;
  valuationDate: string;
  totalLandValue: string;
  valuerName: string;
  valuationPurpose: ValuationPurpose | '';
  notes: string;
}

const EMPTY_FORM: FormState = {
  referenceNumber: '',
  reportReference: '',
  title: '',
  address: '',
  province: '',
  district: '',
  divisionalSecretariat: '',
  town: '',
  lat: '',
  lng: '',
  acres: '0',
  roods: '0',
  perches: '',
  landType: '',
  roadAccess: '',
  propertyCharacteristics: '',
  valuationDate: new Date().toISOString().slice(0, 10),
  totalLandValue: '',
  valuerName: '',
  valuationPurpose: '',
  notes: '',
};

function recordToForm(r: ValuationRecord): FormState {
  const arp = { acres: 0, roods: 0, perches: r.landExtent.perches };
  return {
    referenceNumber: r.referenceNumber,
    reportReference: r.reportReference ?? '',
    title: r.title,
    address: r.address,
    province: r.province,
    district: r.district,
    divisionalSecretariat: r.divisionalSecretariat ?? '',
    town: r.town,
    lat: r.coordinates.lat.toString(),
    lng: r.coordinates.lng.toString(),
    acres: '0',
    roods: '0',
    perches: r.landExtent.perches.toString(),
    landType: r.landType,
    roadAccess: r.roadAccess,
    propertyCharacteristics: r.propertyCharacteristics ?? '',
    valuationDate: r.valuationDate,
    totalLandValue: r.totalLandValue.toString(),
    valuerName: r.valuerName ?? '',
    valuationPurpose: r.valuationPurpose ?? '',
    notes: r.notes ?? '',
  };
}

export default function AddEditValuationModal({ record, initialCoordinates, initialData, onClose }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const isEdit = !!record;

  const [form, setForm] = useState<FormState>(() => {
    if (record) return recordToForm(record);
    if (initialData) {
      return {
        ...EMPTY_FORM,
        title: initialData.title || '',
        address: initialData.address || '',
        province: initialData.province || '',
        district: initialData.district || '',
        town: initialData.town || '',
        lat: initialData.coordinates ? initialData.coordinates.lat.toFixed(6) : '',
        lng: initialData.coordinates ? initialData.coordinates.lng.toFixed(6) : '',
        perches: initialData.landExtent ? initialData.landExtent.perches.toString() : '10',
        totalLandValue: initialData.totalLandValue ? initialData.totalLandValue.toString() : '',
        notes: initialData.notes || '',
      };
    }
    if (initialCoordinates) {
      return {
        ...EMPTY_FORM,
        lat: initialCoordinates.lat.toFixed(6),
        lng: initialCoordinates.lng.toFixed(6),
      };
    }
    return EMPTY_FORM;
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [duplicates, setDuplicates] = useState<ValuationRecord[]>([]);
  const [showDupWarning, setShowDupWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<'property' | 'valuation' | 'location'>('property');

  const coords: GPSCoordinates = {
    lat: parseFloat(form.lat) || 0,
    lng: parseFloat(form.lng) || 0,
  };

  const totalPerches = parseExtentToPerches(
    parseFloat(form.acres) || 0,
    parseFloat(form.roods) || 0,
    parseFloat(form.perches) || 0,
  );

  const totalValue = parseFloat(form.totalLandValue) || 0;
  const pricePerPerch = calculatePricePerPerch(totalValue, totalPerches);

  const districts = form.province ? DISTRICTS_BY_PROVINCE[form.province as Province] ?? [] : [];

  function setField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.referenceNumber.trim()) errs.referenceNumber = 'Required';
    if (!form.title.trim()) errs.title = 'Required';
    if (!form.address.trim()) errs.address = 'Required';
    if (!form.province) errs.province = 'Required';
    if (!form.district) errs.district = 'Required';
    if (!form.town.trim()) errs.town = 'Required';
    if (!coords.lat || !coords.lng) errs.location = 'Click on the map to set location';
    if (coords.lat && (coords.lat < 5.87 || coords.lat > 9.85)) errs.location = 'Coordinates must be within Sri Lanka';
    if (totalPerches <= 0) errs.perches = 'Enter a valid land extent';
    if (!form.landType) errs.landType = 'Required';
    if (!form.roadAccess) errs.roadAccess = 'Required';
    if (!form.valuationDate) errs.valuationDate = 'Required';
    if (!totalValue || totalValue <= 0) errs.totalLandValue = 'Enter a valid amount';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave(skipDupCheck = false) {
    if (!validate()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    // Check duplicates on new records
    if (!isEdit && !skipDupCheck) {
      const dups = db.findDuplicates({
        referenceNumber: form.referenceNumber,
        reportReference: form.reportReference || undefined,
        coordinates: coords,
        valuationDate: form.valuationDate,
      } as Partial<ValuationRecord>);
      if (dups.length > 0) {
        setDuplicates(dups);
        setShowDupWarning(true);
        return;
      }
    }

    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 200));

    const data = {
      referenceNumber: form.referenceNumber.trim(),
      reportReference: form.reportReference.trim() || undefined,
      title: form.title.trim(),
      address: form.address.trim(),
      province: form.province as Province,
      district: form.district,
      divisionalSecretariat: form.divisionalSecretariat.trim() || undefined,
      town: form.town.trim(),
      coordinates: coords,
      landExtent: { perches: totalPerches },
      landType: form.landType as LandType,
      roadAccess: form.roadAccess as RoadAccess,
      propertyCharacteristics: form.propertyCharacteristics.trim() || undefined,
      valuationDate: form.valuationDate,
      totalLandValue: totalValue,
      valuerName: form.valuerName.trim() || undefined,
      valuationPurpose: (form.valuationPurpose as ValuationPurpose) || undefined,
      notes: form.notes.trim() || undefined,
      createdBy: user?.name ?? 'unknown',
      updatedBy: user?.name ?? 'unknown',
      isArchived: false,
      isDemoData: false,
    };

    if (isEdit && record) {
      db.update(record.id, data);
      toast.success(`Updated: ${data.title}`);
    } else {
      db.create(data);
      toast.success(`Saved: ${data.title}`);
    }

    setIsSaving(false);
    onClose();
  }

  const tabs = [
    { key: 'property', label: 'Property Details' },
    { key: 'location', label: 'Location' },
    { key: 'valuation', label: 'Valuation' },
  ] as const;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Valuation' : 'Add New Valuation'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', borderBottom: '1px solid var(--border-subtle)',
          padding: '0 24px',
        }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 16px', background: 'none', border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                color: activeTab === t.key ? 'var(--brand-400)' : 'var(--text-muted)',
                borderBottom: activeTab === t.key ? '2px solid var(--brand-500)' : '2px solid transparent',
                marginBottom: -1,
                transition: 'color var(--t-fast)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Duplicate warning */}
          {showDupWarning && (
            <div style={{
              marginBottom: 16, padding: '14px 16px',
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 'var(--radius)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fcd34d' }}>Possible Duplicate Detected</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                {duplicates.length} existing record{duplicates.length > 1 ? 's' : ''} with similar details found. Review before saving.
              </p>
              {duplicates.map((d) => (
                <div key={d.id} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0', borderTop: '1px solid var(--border-subtle)' }}>
                  {d.referenceNumber} — {d.title} ({d.valuationDate})
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDupWarning(false)}>Review Form</button>
                <button className="btn btn-sm" style={{ background: '#f59e0b', color: '#000', border: 'none' }} onClick={() => { setShowDupWarning(false); handleSave(true); }}>
                  Save Anyway
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Property Details ── */}
          {activeTab === 'property' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">Reference Number</label>
                  <input className="form-input" value={form.referenceNumber} onChange={(e) => setField('referenceNumber', e.target.value)} placeholder="VR-2025-001" />
                  {errors.referenceNumber && <span className="form-error">{errors.referenceNumber}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Report Reference</label>
                  <input className="form-input" value={form.reportReference} onChange={(e) => setField('reportReference', e.target.value)} placeholder="RPT-2025-001" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Property Title / Description</label>
                <input className="form-input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Residential Land — Colombo 5" />
                {errors.title && <span className="form-error">{errors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Full Address</label>
                <input className="form-input" value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="No. 12, Example Road, Town" />
                {errors.address && <span className="form-error">{errors.address}</span>}
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">Province</label>
                  <select className="form-select" value={form.province}
                    onChange={(e) => { setField('province', e.target.value); setField('district', ''); }}>
                    <option value="">Select province…</option>
                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  {errors.province && <span className="form-error">{errors.province}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">District</label>
                  <select className="form-select" value={form.district}
                    onChange={(e) => setField('district', e.target.value)} disabled={!form.province}>
                    <option value="">Select district…</option>
                    {districts.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  {errors.district && <span className="form-error">{errors.district}</span>}
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Divisional Secretariat</label>
                  <input className="form-input" value={form.divisionalSecretariat} onChange={(e) => setField('divisionalSecretariat', e.target.value)} placeholder="Optional" />
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Town / Locality</label>
                  <input className="form-input" value={form.town} onChange={(e) => setField('town', e.target.value)} placeholder="e.g., Nugegoda" />
                  {errors.town && <span className="form-error">{errors.town}</span>}
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">Land Type</label>
                  <select className="form-select" value={form.landType} onChange={(e) => setField('landType', e.target.value)}>
                    <option value="">Select type…</option>
                    {Object.entries(LAND_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {errors.landType && <span className="form-error">{errors.landType}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label form-label-required">Road Access</label>
                  <select className="form-select" value={form.roadAccess} onChange={(e) => setField('roadAccess', e.target.value)}>
                    <option value="">Select…</option>
                    {Object.entries(ROAD_ACCESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  {errors.roadAccess && <span className="form-error">{errors.roadAccess}</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Property Characteristics</label>
                <textarea className="form-textarea" value={form.propertyCharacteristics} onChange={(e) => setField('propertyCharacteristics', e.target.value)} placeholder="Corner plot, fully fenced, flat terrain…" />
              </div>
            </div>
          )}

          {/* ── Tab: Location ── */}
          {activeTab === 'location' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '10px 14px', background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius)',
                fontSize: 12, color: 'var(--brand-300)', display: 'flex', gap: 8,
              }}>
                <MapPin size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                Click anywhere on the map to set the property location. You can also type the coordinates manually.
              </div>

              <LocationPicker
                value={coords}
                onChange={(c) => {
                  setField('lat', c.lat.toFixed(6));
                  setField('lng', c.lng.toFixed(6));
                }}
              />

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input className="form-input" type="number" step="0.000001" value={form.lat} onChange={(e) => setField('lat', e.target.value)} placeholder="6.9271" />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input className="form-input" type="number" step="0.000001" value={form.lng} onChange={(e) => setField('lng', e.target.value)} placeholder="79.8612" />
                </div>
              </div>
              {errors.location && <span className="form-error">{errors.location}</span>}
            </div>
          )}

          {/* ── Tab: Valuation Details ── */}
          {activeTab === 'valuation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Extent */}
              <div>
                <label className="form-label form-label-required" style={{ marginBottom: 8, display: 'block' }}>Land Extent</label>
                <div className="form-row form-row-3">
                  <div className="form-group">
                    <label className="form-label">Acres</label>
                    <input className="form-input" type="number" min="0" step="1" value={form.acres} onChange={(e) => setField('acres', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roods</label>
                    <input className="form-input" type="number" min="0" max="3" step="1" value={form.roods} onChange={(e) => setField('roods', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Perches</label>
                    <input className="form-input" type="number" min="0" step="0.01" value={form.perches} onChange={(e) => setField('perches', e.target.value)} />
                  </div>
                </div>
                {errors.perches && <span className="form-error" style={{ marginTop: 4, display: 'block' }}>{errors.perches}</span>}
                {totalPerches > 0 && (
                  <p className="form-hint" style={{ marginTop: 6 }}>
                    Total: <strong style={{ color: 'var(--text-primary)' }}>{totalPerches.toFixed(2)} perches</strong>
                    {' '}(1 acre = 160 perches, 1 rood = 40 perches)
                  </p>
                )}
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label form-label-required">Valuation Date</label>
                  <input className="form-input" type="date" value={form.valuationDate} onChange={(e) => setField('valuationDate', e.target.value)} />
                  {errors.valuationDate && <span className="form-error">{errors.valuationDate}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Valuation Purpose</label>
                  <select className="form-select" value={form.valuationPurpose} onChange={(e) => setField('valuationPurpose', e.target.value)}>
                    <option value="">Select…</option>
                    {Object.entries(VALUATION_PURPOSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Total Assessed Land Value (LKR)</label>
                <input
                  className="form-input" type="number" min="0" step="1000"
                  value={form.totalLandValue}
                  onChange={(e) => setField('totalLandValue', e.target.value)}
                  placeholder="e.g., 5000000"
                />
                {errors.totalLandValue && <span className="form-error">{errors.totalLandValue}</span>}
              </div>

              {/* Auto-calculated price per perch */}
              {pricePerPerch > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                  borderRadius: 'var(--radius)',
                }}>
                  <Calculator size={18} color="#10b981" />
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Auto-calculated Price per Perch</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: '#34d399' }}>
                      {formatLKR(pricePerPerch)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatLKR(totalValue)} ÷ {totalPerches.toFixed(2)} perches
                    </div>
                  </div>
                </div>
              )}

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label">Valuer Name / Reference</label>
                  <input className="form-input" value={form.valuerName} onChange={(e) => setField('valuerName', e.target.value)} placeholder="A.K. Perera" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="Any relevant observations or context…" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave()}
            disabled={isSaving}
          >
            {isSaving ? (
              <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
              </svg>
            ) : <CheckCircle size={14} />}
            {isSaving ? 'Saving…' : isEdit ? 'Update Record' : 'Save Valuation'}
          </button>
        </div>
      </div>
    </div>
  );
}
