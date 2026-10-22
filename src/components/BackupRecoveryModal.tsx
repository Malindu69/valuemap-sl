import React, { useState } from 'react';
import { X, RotateCcw, Download, Upload, Shield, Check, AlertCircle, HardDrive } from 'lucide-react';
import { db, type DatabaseBackup } from '../services/db';
import { formatDateTime } from '../utils';
import { useToast } from '../contexts/ToastContext';
import type { ValuationRecord } from '../types';

interface Props {
  onClose: () => void;
  onRestored: () => void;
}

export default function BackupRecoveryModal({ onClose, onRestored }: Props) {
  const toast = useToast();
  const [backups, setBackups] = useState<DatabaseBackup[]>(() => db.getBackups());
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  function handleCreateBackup() {
    const b = db.createBackup(`Manual snapshot (${db.getAll(true).length} records)`);
    setBackups(db.getBackups());
    toast.success(`Backup snapshot created with ${b.count} records`);
  }

  async function handleRestore(backup: DatabaseBackup) {
    if (!window.confirm(`Restore ${backup.count} records from "${backup.note}" (${formatDateTime(backup.timestamp)})? This will restore these valuations into your database and Supabase.`)) {
      return;
    }
    setRestoringId(backup.id);
    try {
      const res = await db.restoreBackup(backup.id);
      if (res.success) {
        toast.success(`Successfully restored ${res.count} records!`);
        onRestored();
        onClose();
      } else {
        toast.error(`Restore failed: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setRestoringId(null);
    }
  }

  function handleDownloadBackup(backup: DatabaseBackup) {
    try {
      const blob = new Blob([JSON.stringify(backup.records, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `valuemap_backup_${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.info('Backup JSON file downloaded');
    } catch {
      toast.error('Could not download file');
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const list: ValuationRecord[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.records)
          ? parsed.records
          : null;

        if (!list || list.length === 0) {
          setFileError('Invalid backup file: no valuation records found.');
          return;
        }

        if (window.confirm(`Restore ${list.length} records from this JSON file?`)) {
          const res = await db.restoreRecords(list);
          if (res.success) {
            toast.success(`Restored ${res.count} records from file!`);
            onRestored();
            onClose();
          } else {
            setFileError(`Failed to restore: ${res.error}`);
          }
        }
      } catch (err) {
        setFileError('Failed to parse JSON file. Please ensure it is a valid ValueMap backup.');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 640, width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#60a5fa',
            }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 className="modal-title">Database Backup & Recovery</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Restore wiped records or restore from automatic snapshots
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '16px 20px' }}>
          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={handleCreateBackup}>
              <HardDrive size={13} /> Take Instant Snapshot
            </button>
            <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
              <Upload size={13} /> Restore from JSON File
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>

          {fileError && (
            <div style={{
              padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, color: '#fca5a5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertCircle size={15} /> {fileError}
            </div>
          )}

          {/* List of Backups */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Saved Snapshots ({backups.length})
            </div>

            {backups.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px', background: 'var(--surface-2)',
                borderRadius: 10, border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: 13,
              }}>
                No backup snapshots yet. When you wipe the database or click "Take Instant Snapshot", a recovery point is automatically saved here.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {backups.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {b.note}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatDateTime(b.timestamp)} · <strong style={{ color: '#60a5fa' }}>{b.count} record{b.count !== 1 ? 's' : ''}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleDownloadBackup(b)}
                        title="Download as JSON file"
                      >
                        <Download size={13} /> Download
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleRestore(b)}
                        disabled={restoringId === b.id}
                      >
                        <RotateCcw size={13} /> {restoringId === b.id ? 'Restoring...' : 'Restore This'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
