import React, { useState } from 'react';
import { X, UserPlus, Trash2, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

interface Props {
  onClose: () => void;
}

export default function UserManagementModal({ onClose }: Props) {
  const { users, createUser, deleteUser } = useAuth();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'valuer'>('valuer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await createUser({
        username,
        name,
        email: email || undefined,
        role,
        password,
      });

      if (res.success) {
        toast.success(`User "${username}" created successfully!`);
        setUsername('');
        setName('');
        setEmail('');
        setPassword('');
        setRole('valuer');
      } else {
        setError(res.error || 'Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, uname: string) {
    if (!window.confirm(`Delete user "${uname}"? They will no longer be able to log in.`)) return;
    const res = await deleteUser(id);
    if (res.success) {
      toast.info(`User "${uname}" deleted`);
    } else {
      toast.error(res.error || 'Could not delete user');
    }
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 640, width: '100%' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#60a5fa',
            }}>
              <Shield size={18} />
            </div>
            <div>
              <h2 className="modal-title">User Management</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Create and manage staff accounts (Admin & Valuers)
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '16px 20px' }}>
          {/* Add User Form */}
          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius)',
            padding: '16px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserPlus size={16} color="#34d399" /> Create New Staff User
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                color: '#fca5a5', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleAddUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Username *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                  placeholder="e.g. Kamal"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                  placeholder="e.g. Kamal Perera"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Role</label>
                <select
                  className="form-select"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                  value={role}
                  onChange={e => setRole(e.target.value as 'admin' | 'valuer')}
                >
                  <option value="valuer">Valuer (Add / Edit valuations)</option>
                  <option value="admin">Admin (Full administrative access)</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 11 }}>Password *</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ fontSize: 13, padding: '6px 10px' }}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <UserPlus size={14} /> {loading ? 'Creating…' : 'Add User'}
                </button>
              </div>
            </form>
          </div>

          {/* Existing Users List */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Existing Staff Accounts ({users.length})
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
              {users.map(u => (
                <div
                  key={u.id}
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                      color: u.role === 'admin' ? '#60a5fa' : '#34d399',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.name}
                        <span style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 600,
                          background: u.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                          color: u.role === 'admin' ? '#60a5fa' : '#34d399',
                          textTransform: 'capitalize',
                        }}>
                          {u.role}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Username: <strong>{u.username}</strong>
                      </div>
                    </div>
                  </div>

                  {u.username.toLowerCase() !== 'admin' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444', padding: 6 }}
                      onClick={() => handleDelete(u.id, u.username)}
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
