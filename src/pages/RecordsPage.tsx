import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Plus, Download, Upload, Edit3, Archive,
  Trash2, Eye, RotateCcw, ChevronUp, ChevronDown, FileText,
  CheckCircle, AlertTriangle, X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import {
  formatLKR, formatDate, formatExtent, formatDateTime,
} from '../utils';
import {
  LAND_TYPE_LABELS, ROAD_ACCESS_LABELS, DISTRICTS_BY_PROVINCE, PROVINCES,
} from '../constants';
import type {
  ValuationRecord, ValuationFilters, SortConfig, SortField, Province, LandType,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AddEditValuationModal from '../components/AddEditValuationModal';
import ValuationDetailModal from '../components/ValuationDetailModal';
import ImportModal from '../components/ImportModal';

interface Props { onAddNew: () => void; }

export default function RecordsPage({ onAddNew }: Props) {
  const { canEdit, canAdmin } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<ValuationRecord[]>(() => db.getAll(true));
  const [filters, setFilters] = useState<ValuationFilters>({});
  const [sort, setSort] = useState<SortConfig>({ field: 'valuationDate', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [editRecord, setEditRecord] = useState<ValuationRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<ValuationRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState<ValuationRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ValuationRecord | null>(null);

  const refresh = useCallback(() => setRecords(db.getAll(true)), []);

  const filtered = useMemo(() => db.filter(filters, sort), [filters, sort, records]);

  function handleSort(field: SortField) {
    setSort((s) => ({
      field,
      direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sort.field !== field) return null;
    return sort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  }

  // Export
  function handleExport() {
    const rows = filtered.map((r) => ({
      'Reference No.': r.referenceNumber,
      'Report Ref.': r.reportReference ?? '',
      Title: r.title,
      Address: r.address,
      Province: r.province,
      District: r.district,
      'Divisional Secretariat': r.divisionalSecretariat ?? '',
      Town: r.town,
      Latitude: r.coordinates.lat,
      Longitude: r.coordinates.lng,
      'Extent (Perches)': r.landExtent.perches,
      'Land Type': r.landType,
      'Road Access': r.roadAccess,
      'Valuation Date': r.valuationDate,
      'Total Value (LKR)': r.totalLandValue,
      'Price per Perch (LKR)': r.pricePerPerch,
      Valuer: r.valuerName ?? '',
      Purpose: r.valuationPurpose ?? '',
      Notes: r.notes ?? '',
      'Created At': r.createdAt,
      'Is Demo': r.isDemoData ? 'Yes' : 'No',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Valuations');
    XLSX.writeFile(wb, `valuemap-sl-export-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${rows.length} records to Excel`);
  }

  function handleArchive() {
    if (!confirmArchive) return;
    db.archive(confirmArchive.id);
    refresh();
    toast.info(`Record archived: ${confirmArchive.referenceNumber}`);
    setConfirmArchive(null);
  }

  function handleRestore(r: ValuationRecord) {
    db.restore(r.id);
    refresh();
    toast.success(`Record restored: ${r.referenceNumber}`);
  }

  function handleDelete() {
    if (!confirmDelete) return;
    db.delete(confirmDelete.id);
    refresh();
    toast.warning(`Record permanently deleted: ${confirmDelete.referenceNumber}`);
    setConfirmDelete(null);
  }

  const districts = useMemo(() => {
    const prov = filters.province;
    return prov ? DISTRICTS_BY_PROVINCE[prov] : Object.values(DISTRICTS_BY_PROVINCE).flat().sort();
  }, [filters.province]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-1)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, flex: 1 }}>
          Valuation Records
        </h1>
        <div className="search-wrap" style={{ width: 260 }}>
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search records…"
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          />
        </div>
        <button className={`btn btn-ghost btn-sm ${showFilters ? 'btn-primary' : ''}`} onClick={() => setShowFilters((v) => !v)}>
          <Filter size={13} /> Filters
        </button>
        {canEdit && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Import
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download size={13} /> Export
            </button>
            <button className="btn btn-primary btn-sm" onClick={onAddNew}>
              <Plus size={13} /> Add
            </button>
          </>
        )}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div style={{
          padding: '10px 20px', background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <select className="form-select" style={{ width: 140, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.province ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, province: (e.target.value as Province) || undefined, district: undefined }))}>
            <option value="">All Provinces</option>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="form-select" style={{ width: 140, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.district ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, district: e.target.value || undefined }))}>
            <option value="">All Districts</option>
            {districts.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="form-select" style={{ width: 130, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.landType ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, landType: (e.target.value as LandType) || undefined }))}>
            <option value="">All Types</option>
            {Object.entries(LAND_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="date" className="form-input" style={{ width: 140, fontSize: 12 }}
            value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))} />
          <input type="date" className="form-input" style={{ width: 140, fontSize: 12 }}
            value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!filters.showArchived}
              onChange={(e) => setFilters((f) => ({ ...f, showArchived: e.target.checked }))} />
            Show Archived
          </label>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}>Clear All</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="data-table-wrap" style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            <FileText size={40} className="empty-state-icon" />
            <div className="empty-state-title">No Records Found</div>
            <div className="empty-state-desc">Try adjusting your filters or add a new valuation.</div>
            {canEdit && <button className="btn btn-primary btn-sm" onClick={onAddNew}><Plus size={13} /> Add Valuation</button>}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th onClick={() => handleSort('valuationDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Date <SortIcon field="valuationDate" />
                </th>
                <th>Reference</th>
                <th>Title / Location</th>
                <th>District</th>
                <th>Type</th>
                <th onClick={() => handleSort('landExtent')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Extent <SortIcon field="landExtent" />
                </th>
                <th onClick={() => handleSort('pricePerPerch')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Price / Perch <SortIcon field="pricePerPerch" />
                </th>
                <th>Total Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ opacity: r.isArchived ? 0.5 : 1 }}>
                  <td>
                    {r.isArchived ? (
                      <span className="badge badge-gray">Archived</span>
                    ) : r.isDemoData ? (
                      <span className="badge badge-demo">Demo</span>
                    ) : (
                      <span className="badge badge-green">Active</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {formatDate(r.valuationDate)}
                  </td>
                  <td style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--brand-400)' }}>
                    {r.referenceNumber}
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.town}</div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.district}</td>
                  <td>
                    <LandTypeBadge type={r.landType} />
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatExtent(r.landExtent)}
                  </td>
                  <td>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
                      {formatLKR(r.pricePerPerch, true)}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatLKR(r.totalLandValue, true)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <ActionBtn icon={<Eye size={13} />} title="View" onClick={() => setViewRecord(r)} />
                      {canEdit && !r.isArchived && (
                        <ActionBtn icon={<Edit3 size={13} />} title="Edit" onClick={() => setEditRecord(r)} />
                      )}
                      {canEdit && !r.isArchived && (
                        <ActionBtn icon={<Archive size={13} />} title="Archive" onClick={() => setConfirmArchive(r)} color="var(--warning)" />
                      )}
                      {canEdit && r.isArchived && (
                        <ActionBtn icon={<RotateCcw size={13} />} title="Restore" onClick={() => handleRestore(r)} color="var(--accent-400)" />
                      )}
                      {canAdmin && r.isArchived && (
                        <ActionBtn icon={<Trash2 size={13} />} title="Delete" onClick={() => setConfirmDelete(r)} color="var(--error)" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {editRecord && (
        <AddEditValuationModal
          record={editRecord}
          onClose={() => { setEditRecord(null); refresh(); }}
        />
      )}
      {viewRecord && (
        <ValuationDetailModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onEdit={canEdit ? () => { setEditRecord(viewRecord); setViewRecord(null); } : undefined}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => { setShowImport(false); refresh(); }}
        />
      )}

      {/* Archive confirm */}
      {confirmArchive && (
        <ConfirmDialog
          title="Archive Record?"
          message={`Archive "${confirmArchive.title}"? It will be hidden from active views but can be restored.`}
          confirmLabel="Archive"
          onConfirm={handleArchive}
          onCancel={() => setConfirmArchive(null)}
          variant="warning"
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <ConfirmDialog
          title="Permanently Delete?"
          message={`Delete "${confirmDelete.title}"? This action cannot be undone.`}
          confirmLabel="Delete Permanently"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// ─── Small Components ──────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  residential: 'badge-blue',
  commercial: 'badge-yellow',
  agricultural: 'badge-green',
  'mixed-use': 'badge-purple',
  industrial: 'badge-orange',
};

function LandTypeBadge({ type }: { type: string }) {
  return (
    <span className={`badge ${TYPE_COLORS[type] ?? 'badge-gray'}`} style={{ fontSize: 10 }}>
      {LAND_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function ActionBtn({ icon, title, onClick, color = 'var(--text-muted)' }: {
  icon: React.ReactNode; title: string; onClick: () => void; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: 'none', color,
        padding: '4px', borderRadius: 4, cursor: 'pointer',
        transition: 'opacity var(--t-fast)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      {icon}
    </button>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, variant }: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
  variant: 'warning' | 'danger';
}) {
  const color = variant === 'danger' ? 'var(--error)' : 'var(--warning)';
  return (
    <div className="overlay">
      <div style={{
        background: 'var(--surface-1)', border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-xl)', padding: 28, width: 380,
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: color, color: '#fff', border: `1px solid ${color}` }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
