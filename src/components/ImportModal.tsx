import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { db } from '../services/db';
import { parseExtentToPerches, calculatePricePerPerch } from '../utils';
import { DISTRICTS_BY_PROVINCE, PROVINCES } from '../constants';
import type { ValuationRecord, ImportResult, Province, LandType, RoadAccess } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface Props {
  onClose: () => void;
}

type ParsedRow = {
  row: number;
  data: Partial<ValuationRecord>;
  errors: string[];
  isDuplicate: boolean;
};

const ALL_DISTRICTS = new Set(Object.values(DISTRICTS_BY_PROVINCE).flat());
const VALID_TYPES = ['residential', 'commercial', 'agricultural', 'mixed-use', 'industrial'];
const VALID_ROAD = ['main-road', 'secondary-road', 'gravel-road', 'no-road', 'lane'];

export default function ImportModal({ onClose }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  function downloadTemplate() {
    const templateRows = [
      {
        referenceNumber: 'VR-2025-XXX',
        title: 'Property Title',
        address: 'Full address',
        province: 'Western',
        district: 'Colombo',
        town: 'Colombo 5',
        lat: 6.9271,
        lng: 79.8612,
        perches: 20,
        landType: 'residential',
        roadAccess: 'main-road',
        valuationDate: '2025-01-01',
        totalLandValue: 10000000,
        valuerName: 'A.K. Perera',
        notes: '',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Template');
    XLSX.writeFile(wb, 'valuemap-import-template.xlsx');
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];

        const parsed: ParsedRow[] = json.map((raw, i) => {
          const errors: string[] = [];
          const row = i + 2;

          const str = (k: string) => String(raw[k] ?? '').trim();
          const num = (k: string) => parseFloat(String(raw[k] ?? '0')) || 0;

          if (!str('referenceNumber')) errors.push('referenceNumber is required');
          if (!str('title')) errors.push('title is required');
          if (!str('address')) errors.push('address is required');
          if (!PROVINCES.includes(str('province') as Province)) errors.push(`Invalid province: ${str('province')}`);
          if (!ALL_DISTRICTS.has(str('district'))) errors.push(`Invalid district: ${str('district')}`);
          if (!str('town')) errors.push('town is required');
          if (!num('lat') || !num('lng')) errors.push('lat/lng are required');
          const perches = num('perches');
          if (perches <= 0) errors.push('perches must be > 0');
          if (!VALID_TYPES.includes(str('landType'))) errors.push(`Invalid landType: ${str('landType')}`);
          if (!VALID_ROAD.includes(str('roadAccess'))) errors.push(`Invalid roadAccess: ${str('roadAccess')}`);
          if (!str('valuationDate')) errors.push('valuationDate is required (YYYY-MM-DD)');
          const totalLandValue = num('totalLandValue');
          if (totalLandValue <= 0) errors.push('totalLandValue must be > 0');

          const now = new Date().toISOString();
          const data: Partial<ValuationRecord> = {
            referenceNumber: str('referenceNumber'),
            title: str('title'),
            address: str('address'),
            province: str('province') as Province,
            district: str('district'),
            town: str('town'),
            coordinates: { lat: num('lat'), lng: num('lng') },
            landExtent: { perches },
            landType: str('landType') as LandType,
            roadAccess: str('roadAccess') as RoadAccess,
            valuationDate: str('valuationDate'),
            totalLandValue,
            pricePerPerch: calculatePricePerPerch(totalLandValue, perches),
            valuerName: str('valuerName') || undefined,
            notes: str('notes') || undefined,
            createdBy: user?.name ?? 'import',
            updatedBy: user?.name ?? 'import',
            isArchived: false,
            isDemoData: false,
          };

          // Duplicate check
          const isDuplicate = errors.length === 0 && db.findDuplicates(data as ValuationRecord).length > 0;

          return { row, data, errors, isDuplicate };
        });

        setRows(parsed);
        setStep('preview');
      } catch {
        toast.error('Failed to parse file. Please use the provided template.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.errors.length === 0 && !r.isDuplicate);
    const duplicates = rows
      .filter((r) => r.isDuplicate)
      .map((r) => ({ row: r.row, existingId: '' }));
    const errors = rows
      .filter((r) => r.errors.length > 0)
      .map((r) => ({ row: r.row, message: r.errors.join('; ') }));

    setImporting(true);
    await new Promise((r) => setTimeout(r, 300));
    const toCreate = valid.map((r) => r.data as Omit<ValuationRecord, 'id' | 'createdAt' | 'updatedAt' | 'pricePerPerch'>);
    db.bulkCreate(toCreate);

    setResult({ success: valid.length, errors, duplicates });
    setStep('done');
    setImporting(false);
  }

  const validCount = rows.filter((r) => r.errors.length === 0 && !r.isDuplicate).length;
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const dupCount = rows.filter((r) => r.isDuplicate).length;

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h2 className="modal-title">Import Valuations from Excel</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '14px', background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.15)', borderRadius: 'var(--radius)',
                fontSize: 13, color: 'var(--text-secondary)',
              }}>
                Upload an Excel (.xlsx) file using the provided template format. Download the template below to get started.
              </div>

              <button className="btn btn-ghost" onClick={downloadTemplate}>
                <Download size={14} /> Download Import Template
              </button>

              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)',
                  padding: '40px', textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color var(--t-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--brand-500)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
              >
                <Upload size={32} style={{ opacity: 0.4, margin: '0 auto 12px', display: 'block' }} />
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Click to upload Excel file</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>.xlsx files only</div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          )}

          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <SummaryBox color="#22c55e" count={validCount} label="Ready to import" />
                <SummaryBox color="#f59e0b" count={dupCount} label="Likely duplicates" />
                <SummaryBox color="#ef4444" count={errorCount} label="Validation errors" />
              </div>

              {/* Table preview */}
              <div style={{ maxHeight: 320, overflow: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border-subtle)' }}>
                <table className="data-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Reference</th>
                      <th>Title</th>
                      <th>District</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.row}>
                        <td style={{ color: 'var(--text-muted)' }}>{r.row}</td>
                        <td style={{ fontFamily: 'monospace' }}>{r.data.referenceNumber ?? '—'}</td>
                        <td>{r.data.title ?? '—'}</td>
                        <td>{r.data.district ?? '—'}</td>
                        <td>
                          {r.errors.length > 0 ? (
                            <span className="badge badge-red" title={r.errors.join(', ')}>Error</span>
                          ) : r.isDuplicate ? (
                            <span className="badge badge-yellow">Duplicate</span>
                          ) : (
                            <span className="badge badge-green">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {validCount === 0 && (
                <div style={{ fontSize: 13, color: 'var(--error)' }}>
                  No valid rows to import. Please fix the errors in your file.
                </div>
              )}
            </div>
          )}

          {step === 'done' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '16px 0' }}>
              <CheckCircle size={48} color="#22c55e" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: 18, fontWeight: 700 }}>Import Complete</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Successfully imported <strong style={{ color: '#22c55e' }}>{result.success}</strong> records.
                {result.errors.length > 0 && <> Skipped {result.errors.length} with errors.</>}
                {result.duplicates.length > 0 && <> Skipped {result.duplicates.length} duplicates.</>}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{step === 'done' ? 'Close' : 'Cancel'}</button>
          {step === 'preview' && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep('upload')}>← Back</button>
              <button className="btn btn-primary" onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? 'Importing…' : `Import ${validCount} Records`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryBox({ color, count, label }: { color: string; count: number; label: string }) {
  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 'var(--radius)', padding: '12px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{count}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}
