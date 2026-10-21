import React from 'react';
import { X, Edit3, MapPin, Calendar, User, FileText } from 'lucide-react';
import type { ValuationRecord } from '../types';
import {
  formatLKR, formatDate, formatDateTime, formatExtent,
} from '../utils';
import {
  LAND_TYPE_LABELS, ROAD_ACCESS_LABELS, VALUATION_PURPOSE_LABELS,
} from '../constants';

interface Props {
  record: ValuationRecord;
  onClose: () => void;
  onEdit?: () => void;
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', width: 160, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
        {value || '—'}
      </div>
    </div>
  );
}

export default function ValuationDetailModal({ record: r, onClose, onEdit }: Props) {
  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{r.title}</h2>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {r.referenceNumber}{r.reportReference ? ` · ${r.reportReference}` : ''}
              {r.isDemoData && <span className="badge badge-demo" style={{ marginLeft: 8 }}>DEMO</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {onEdit && (
              <button className="btn btn-ghost btn-sm" onClick={onEdit}>
                <Edit3 size={13} /> Edit
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Value hero */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12, marginBottom: 24,
          }}>
            <PriceBox label="Price per Perch" value={formatLKR(r.pricePerPerch)} color="#34d399" />
            <PriceBox label="Total Value" value={formatLKR(r.totalLandValue, true)} color="#60a5fa" />
            <PriceBox label="Land Extent" value={formatExtent(r.landExtent)} color="#a78bfa" />
          </div>

          <Section title="Property Details" icon={<MapPin size={14} />}>
            <Row label="Address" value={r.address} />
            <Row label="Province" value={r.province} />
            <Row label="District" value={r.district} />
            <Row label="Divisional Secretariat" value={r.divisionalSecretariat ?? ''} />
            <Row label="Town" value={r.town} />
            <Row label="Land Type" value={LAND_TYPE_LABELS[r.landType] ?? r.landType} />
            <Row label="Road Access" value={ROAD_ACCESS_LABELS[r.roadAccess] ?? r.roadAccess} />
            {r.propertyCharacteristics && <Row label="Characteristics" value={r.propertyCharacteristics} />}
          </Section>

          <Section title="Valuation Details" icon={<Calendar size={14} />}>
            <Row label="Valuation Date" value={formatDate(r.valuationDate)} />
            <Row label="Valuation Purpose" value={r.valuationPurpose ? VALUATION_PURPOSE_LABELS[r.valuationPurpose] : ''} />
            <Row label="Valuer" value={r.valuerName ?? ''} />
            <Row label="Report Reference" value={r.reportReference ?? ''} />
            {r.notes && <Row label="Notes" value={r.notes} />}
          </Section>

          <Section title="GPS Location" icon={<MapPin size={14} />}>
            <Row label="Latitude" value={r.coordinates.lat.toFixed(6)} mono />
            <Row label="Longitude" value={r.coordinates.lng.toFixed(6)} mono />
          </Section>

          <Section title="Record History" icon={<FileText size={14} />}>
            <Row label="Created" value={formatDateTime(r.createdAt)} />
            <Row label="Created By" value={r.createdBy} />
            <Row label="Last Updated" value={formatDateTime(r.updatedAt)} />
            <Row label="Updated By" value={r.updatedBy} />
            <Row label="Status" value={r.isArchived ? 'Archived' : 'Active'} />
          </Section>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          {onEdit && <button className="btn btn-primary" onClick={onEdit}><Edit3 size={13} /> Edit Record</button>}
        </div>
      </div>
    </div>
  );
}

function PriceBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 'var(--radius-lg)', padding: '14px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'Outfit', sans-serif" }}>{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid var(--border-subtle)',
      }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
