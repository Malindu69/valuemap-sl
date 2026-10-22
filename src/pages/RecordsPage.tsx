import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Plus, Download, Upload, Edit3, Archive,
  Trash2, Eye, RotateCcw, ChevronUp, ChevronDown, FileText,
  CheckCircle, AlertTriangle, X, Shield, Sparkles,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../services/db';
import {
  formatLKR, formatDate, formatExtent,
} from '../utils';
import {
  LAND_TYPE_LABELS, DISTRICTS_BY_PROVINCE, PROVINCES,
} from '../constants';
import type {
  ValuationRecord, ValuationFilters, SortConfig, SortField, Province, LandType,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AddEditValuationModal from '../components/AddEditValuationModal';
import ValuationDetailModal from '../components/ValuationDetailModal';
import ImportModal from '../components/ImportModal';
import BackupRecoveryModal from '../components/BackupRecoveryModal';

interface Props { onAddNew: () => void; }

export default function RecordsPage({ onAddNew }: Props) {
  const { canEdit, canAdmin } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<ValuationRecord[]>(() => db.getAll(true));
  const [trashRecords, setTrashRecords] = useState<ValuationRecord[]>(() => db.getTrash());
  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [filters, setFilters] = useState<ValuationFilters>({});
  const [sort, setSort] = useState<SortConfig>({ field: 'valuationDate', direction: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [editRecord, setEditRecord] = useState<ValuationRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<ValuationRecord | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ValuationRecord | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [showEmptyTrashConfirm, setShowEmptyTrashConfirm] = useState(false);

  const refresh = useCallback(() => {
    setRecords(db.getAll(true));
    setTrashRecords(db.getTrash());
  }, []);

  React.useEffect(() => {
    return db.subscribe(refresh);
  }, [refresh]);

  // Active records: only non-archived
  const activeRecords = useMemo(() => records.filter((r) => !r.isArchived), [records]);

  // List to display according to active tab
  const displayList = useMemo(() => {
    if (tab === 'trash') {
      let res = [...trashRecords];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        res = res.filter((r) =>
          r.title.toLowerCase().includes(q) ||
          r.referenceNumber.toLowerCase().includes(q) ||
          r.district.toLowerCase().includes(q) ||
          r.town.toLowerCase().includes(q)
        );
      }
      return res;
    }
    return db.filter(filters, sort);
  }, [tab, trashRecords, filters, sort, records]);

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
    const rows = displayList.map((r) => ({
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

  // Soft-Delete (Move to Recycle Bin)
  function handleMoveToTrash(r: ValuationRecord) {
    db.delete(r.id);
    refresh();
    toast.info(`Moved to Recycle Bin: ${r.referenceNumber}`);
  }

  // Recover record
  function handleRecover(r: ValuationRecord) {
    db.restore(r.id);
    refresh();
    toast.success(`Recovered record: ${r.referenceNumber}`);
  }

  // Recover All
  function handleRecoverAll() {
    trashRecords.forEach((r) => db.restore(r.id));
    refresh();
    toast.success(`All ${trashRecords.length} records recovered!`);
  }

  // Permanently delete
  function handlePermanentDelete() {
    if (!confirmDelete) return;
    db.restore(confirmDelete.id); // temporarily bring to delete completely
    db.delete(confirmDelete.id);
    setConfirmDelete(null);
    refresh();
  }

  const districts = useMemo(() => {
    const prov = filters.province;
    return prov ? DISTRICTS_BY_PROVINCE[prov] : Object.values(DISTRICTS_BY_PROVINCE).flat().sort();
  }, [filters.province]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--surface-1)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        {/* Tab switch */}
        <div style={{
          display: 'flex', background: 'var(--surface-2)', borderRadius: 8, padding: 3, gap: 3,
        }}>
          <button
            onClick={() => setTab('active')}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: tab === 'active' ? 'var(--brand-600)' : 'transparent',
              color: tab === 'active' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span>Active</span>
            <span style={{
              background: tab === 'active' ? 'rgba(255,255,255,0.2)' : 'var(--surface-3)',
              borderRadius: 12, padding: '1px 6px', fontSize: 11,
            }}>
              {activeRecords.length}
            </span>
          </button>
          <button
            onClick={() => setTab('trash')}
            style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: tab === 'trash' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: tab === 'trash' ? '#f87171' : 'var(--text-muted)',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <Trash2 size={13} />
            <span>Recycle Bin</span>
            {trashRecords.length > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff',
                borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 700,
              }}>
                {trashRecords.length}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="search-wrap" style={{ flex: 1, minWidth: 180, maxWidth: 300 }}>
          <Search size={14} className="search-icon" />
          <input
            className="search-input"
            placeholder={tab === 'trash' ? 'Search recycle bin…' : 'Search records…'}
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          />
        </div>

        {tab === 'active' && (
          <button className={`btn btn-ghost btn-sm ${showFilters ? 'btn-primary' : ''}`} onClick={() => setShowFilters((v) => !v)}>
            <Filter size={13} /> Filters
          </button>
        )}

        {/* Backups & Recovery button */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowBackups(true)}
          title="View backup snapshots, restore wiped database, or upload JSON backup"
        >
          <Shield size={13} color="#60a5fa" /> Recovery
        </button>

        {canEdit && tab === 'active' && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Import
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Download size={13} /> Export
            </button>
            {canAdmin && db.getEnvironment() === 'live' && activeRecords.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: '#ef4444' }}
                onClick={() => setShowCleanConfirm(true)}
                title="Wipe database with automatic recovery snapshot"
              >
                <Trash2 size={13} /> Clean Live DB
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={onAddNew}>
              <Plus size={13} /> Add
            </button>
          </>
        )}

        {tab === 'trash' && trashRecords.length > 0 && (
          <>
            <button className="btn btn-success btn-sm" onClick={handleRecoverAll}>
              <RotateCcw size={13} /> Recover All ({trashRecords.length})
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#ef4444' }}
              onClick={() => setShowEmptyTrashConfirm(true)}
            >
              Empty Bin
            </button>
          </>
        )}
      </div>

      {/* Recycle Bin Notice Banner */}
      {tab === 'trash' && (
        <div style={{
          padding: '8px 16px', background: 'rgba(239, 68, 68, 0.08)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, color: '#fca5a5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={14} />
            <span>
              <strong>Recycle Bin:</strong> Removed valuations stay here safely. Click <strong>"Recover"</strong> to bring any record back to live.
            </span>
          </div>
          <button
            onClick={() => setTab('active')}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 11, padding: '2px 8px', height: 'auto', color: '#93c5fd' }}
          >
            ← Back to Active
          </button>
        </div>
      )}

      {/* Filter bar */}
      {showFilters && tab === 'active' && (
        <div style={{
          padding: '10px 16px', background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
        }}>
          <select className="form-select" style={{ width: 130, fontSize: 12, padding: '5px 28px 5px 8px' }}
            value={filters.province ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, province: (e.target.value as Province) || undefined, district: undefined }))}>
            <option value="">All Provinces</option>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select className="form-select" style={{ width: 130, fontSize: 12, padding: '5px 28px 5px 8px' }}
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
          <input type="date" className="form-input" style={{ width: 135, fontSize: 12 }}
            value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))} />
          <input type="date" className="form-input" style={{ width: 135, fontSize: 12 }}
            value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))} />
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({})}>Clear All</button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
            {displayList.length} record{displayList.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {displayList.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 80 }}>
            {tab === 'trash' ? (
              <>
                <CheckCircle size={44} style={{ color: '#10b981', marginBottom: 12 }} />
                <div className="empty-state-title">Recycle Bin is Empty</div>
                <div className="empty-state-desc">No deleted records in the bin.</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('active')} style={{ marginTop: 12 }}>
                  View Active Records
                </button>
              </>
            ) : (
              <>
                <FileText size={44} className="empty-state-icon" />
                <div className="empty-state-title">No Valuations Found</div>
                <div className="empty-state-desc">Try adjusting your filters, restore a backup snapshot, or add a new record.</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowBackups(true)}>
                    <RotateCcw size={13} /> Check Backups
                  </button>
                  {canEdit && (
                    <button className="btn btn-primary btn-sm" onClick={onAddNew}>
                      <Plus size={13} /> Add Valuation
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* 1. Desktop Table */}
            <div className="desktop-table-only" style={{ flex: 1, overflow: 'auto' }}>
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
                  {displayList.map((r) => (
                    <tr key={r.id}>
                      <td>
                        {tab === 'trash' ? (
                          <span className="badge badge-gray" style={{ color: '#f87171' }}>In Bin</span>
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
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <ActionBtn icon={<Eye size={14} />} title="View Full Details" onClick={() => setViewRecord(r)} />
                          {tab === 'trash' ? (
                            <button
                              className="btn btn-success btn-sm"
                              style={{ padding: '3px 8px', fontSize: 11, height: 'auto', gap: 4 }}
                              onClick={() => handleRecover(r)}
                              title="Recover back to active records"
                            >
                              <RotateCcw size={12} /> Recover
                            </button>
                          ) : (
                            <>
                              {canEdit && (
                                <ActionBtn icon={<Edit3 size={14} />} title="Edit" onClick={() => setEditRecord(r)} />
                              )}
                              {canEdit && (
                                <ActionBtn
                                  icon={<Trash2 size={14} />}
                                  title="Move to Recycle Bin"
                                  onClick={() => handleMoveToTrash(r)}
                                  color="#f87171"
                                />
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Responsive Card List */}
            <div className="mobile-cards-only" style={{ padding: '12px 14px', flex: 1, overflowY: 'auto' }}>
              {displayList.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                >
                  {/* Top row: badge & reference */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <LandTypeBadge type={r.landType} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.district}</span>
                    </div>
                    <span style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--brand-400)', fontWeight: 600 }}>
                      {r.referenceNumber}
                    </span>
                  </div>

                  {/* Title & Town */}
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                      {r.title}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {r.town}{r.address ? ` · ${r.address}` : ''}
                    </div>
                  </div>

                  {/* Price Banner */}
                  <div style={{
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                        Price per Perch
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#34d399', fontFamily: "'Outfit', sans-serif" }}>
                        {formatLKR(r.pricePerPerch)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        Extent · Total
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatExtent(r.landExtent)} · {formatLKR(r.totalLandValue, true)}
                      </div>
                    </div>
                  </div>

                  {/* Date & Actions row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Date: {formatDate(r.valuationDate)}
                    </span>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => setViewRecord(r)}
                      >
                        <Eye size={13} /> View
                      </button>

                      {tab === 'trash' ? (
                        <button
                          className="btn btn-success btn-sm"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleRecover(r)}
                        >
                          <RotateCcw size={13} /> Recover
                        </button>
                      ) : (
                        <>
                          {canEdit && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                              onClick={() => setEditRecord(r)}
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '6px 8px', color: '#f87171' }}
                              onClick={() => handleMoveToTrash(r)}
                              title="Move to Recycle Bin"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
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
      {showBackups && (
        <BackupRecoveryModal
          onClose={() => setShowBackups(false)}
          onRestored={refresh}
        />
      )}

      {/* Wipe Live DB confirm */}
      {showCleanConfirm && (
        <ConfirmDialog
          title="Wipe Live Database"
          message="Are you sure you want to clean your live records? Don't worry: ValueMap will automatically save a backup snapshot (and download a JSON backup file to your device) so you can recover all records at any time!"
          confirmLabel="Backup & Wipe DB"
          variant="danger"
          onConfirm={async () => {
            const res = await db.cleanLiveDatabase(true);
            refresh();
            toast.success(`Database cleaned. Automatic backup saved (${res.count} records)!`);
            setShowCleanConfirm(false);
          }}
          onCancel={() => setShowCleanConfirm(false)}
        />
      )}

      {/* Empty Trash confirm */}
      {showEmptyTrashConfirm && (
        <ConfirmDialog
          title="Empty Recycle Bin?"
          message={`Are you sure you want to permanently empty all ${trashRecords.length} records in the Recycle Bin? Once emptied, they cannot be recovered from the bin.`}
          confirmLabel="Empty Permanently"
          variant="danger"
          onConfirm={() => {
            db.emptyTrash();
            refresh();
            toast.warning('Recycle Bin emptied');
            setShowEmptyTrashConfirm(false);
          }}
          onCancel={() => setShowEmptyTrashConfirm(false)}
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
        padding: '6px', borderRadius: 4, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
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
        borderRadius: 'var(--radius-xl)', padding: 24, width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn"
            style={{ background: color, color: '#fff', border: `1px solid ${color}`, fontWeight: 600 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
