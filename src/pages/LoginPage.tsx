import React, { useState } from 'react';
import { MapPin, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('admin@valuemap.lk');
  const [password, setPassword] = useState('valuemap2024');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.error) setError(result.error);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 20%, rgba(37,99,235,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(16,185,129,0.1) 0%, transparent 50%), var(--surface-0)',
      padding: '24px',
    }}>
      {/* Background grid pattern */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #2563eb, #10b981)',
            borderRadius: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(37,99,235,0.3)',
          }}>
            <MapPin size={28} color="#fff" />
          </div>
          <h1 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800,
            background: 'linear-gradient(135deg, #60a5fa, #34d399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            ValueMap SL
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Sri Lanka Land Valuation Intelligence
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-xl)',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>Sign In</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 32 }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingLeft: 32, paddingRight: 36 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 'var(--radius)', padding: '10px 12px',
                color: '#fca5a5', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 4, justifyContent: 'center' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : null}
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{
            marginTop: 24, padding: '16px',
            background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)',
            borderRadius: 'var(--radius)',
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#34d399', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Demo Credentials
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Admin', email: 'admin@valuemap.lk', pw: 'valuemap2024' },
                { label: 'Valuer', email: 'valuer@valuemap.lk', pw: 'valuer2024' },
                { label: 'Viewer', email: 'viewer@valuemap.lk', pw: 'viewer2024' },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                    color: 'var(--text-secondary)', fontSize: 12, padding: '2px 0',
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', width: 50, display: 'inline-block' }}>{c.label}:</span>
                  {c.email} / <span style={{ fontFamily: 'monospace' }}>{c.pw}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 16 }}>
          © {new Date().getFullYear()} ValueMap SL — Internal Use Only
        </p>
      </div>
    </div>
  );
}
