import React, { useState } from 'react';
import { theme } from '../styles/theme';
import { api, setStoredKey } from '../services/api';
import { ShieldCheck, Zap, Check, AlertTriangle } from 'lucide-react';

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [state, setState] = useState<'idle' | 'checking' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setState('checking');
    setErrorMsg('');

    const valid = await api.validateKey(key.trim());
    if (valid) {
      setStoredKey(key.trim());
      onSuccess();
    } else {
      setState('error');
      setErrorMsg('Invalid API key. Check your VaultFlow API key and try again.');
    }
  };

  const features = [
    { icon: <Zap size={14} strokeWidth={2} />, text: 'Real-time financial analytics' },
    { icon: <Check size={14} strokeWidth={2} />, text: 'Budget variance & forecasting' },
    { icon: <ShieldCheck size={14} strokeWidth={2} />, text: 'End-to-end encrypted data' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      fontFamily: theme.font.sans,
      background: theme.colors.platinum,
    }}>
      {/* Left panel */}
      <div style={{
        width: '45%',
        background: `linear-gradient(160deg, ${theme.colors.navy} 0%, ${theme.colors.navyMid} 55%, #1E3A5F 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background glows */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320,
          background: `radial-gradient(circle, ${theme.colors.tealGlow} 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60,
          width: 280, height: 280,
          background: `radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 65%)`,
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 64, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 46, height: 46,
            background: `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.tealDark})`,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 20px ${theme.colors.tealGlow}`,
          }}>
            <ShieldCheck size={24} color={theme.colors.navy} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.colors.white, letterSpacing: '-0.5px' }}>VaultFlow</div>
            <div style={{ fontSize: 10, color: theme.colors.teal, letterSpacing: '2px', textTransform: 'uppercase' }}>Financial Intelligence</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            margin: '0 0 16px',
            fontSize: 38, fontWeight: 800,
            color: theme.colors.white,
            letterSpacing: '-1.2px',
            lineHeight: 1.1,
          }}>
            Every dollar.<br />Every decision.<br />
            <span style={{ color: theme.colors.teal }}>In focus.</span>
          </h1>
          <p style={{ margin: '0 0 48px', fontSize: 15, color: theme.colors.gray400, lineHeight: 1.7 }}>
            Unified financial analytics, budget intelligence, and spend forecasting — built for finance teams that move fast.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: `${theme.colors.teal}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: theme.colors.teal, flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: 14, color: theme.colors.gray400 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Version badge */}
        <div style={{
          position: 'absolute', bottom: 32, left: 64,
          fontSize: 11, color: theme.colors.gray500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.colors.success }} />
          VaultFlow v1.0.0 &mdash; All systems operational
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 48px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 800, color: theme.colors.navy, letterSpacing: '-0.5px' }}>
              Connect to your workspace
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: theme.colors.gray500, lineHeight: 1.5 }}>
              Enter your VaultFlow API key to access the financial dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* API key field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.colors.gray600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                API Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={key}
                  onChange={e => { setKey(e.target.value); if (state === 'error') setState('idle'); }}
                  placeholder="vf_live_••••••••••••••••••••••••"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    borderRadius: 12,
                    border: `1.5px solid ${state === 'error' ? theme.colors.danger : key ? theme.colors.teal : theme.colors.gray200}`,
                    fontSize: 14,
                    fontFamily: theme.font.mono,
                    color: theme.colors.navy,
                    background: theme.colors.white,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                    boxShadow: state === 'error' ? `0 0 0 3px ${theme.colors.dangerBg}` : key ? `0 0 0 3px ${theme.colors.tealGlow}` : 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: theme.colors.gray400, fontSize: 13, fontFamily: theme.font.sans,
                    padding: '2px 4px',
                  }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>

              {/* Error message */}
              {state === 'error' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <AlertTriangle size={13} color={theme.colors.danger} strokeWidth={2} />
                  <span style={{ fontSize: 12, color: theme.colors.danger }}>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Where to find the key */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: theme.colors.infoBg,
              border: `1px solid ${theme.colors.info}25`,
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 11.5, color: theme.colors.gray600, lineHeight: 1.6 }}>
                <strong style={{ color: theme.colors.navy }}>Where to find your API key:</strong><br />
                Your API key is set via the <code style={{ background: theme.colors.gray100, padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: theme.font.mono }}>VAULTFLOW_JWT_SECRET</code> environment variable in your deployment. The default value for local Docker Compose is shown in your <code style={{ background: theme.colors.gray100, padding: '1px 5px', borderRadius: 4, fontSize: 11, fontFamily: theme.font.mono }}>docker-compose.yml</code>.
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!key.trim() || state === 'checking'}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 12,
                border: 'none',
                background: !key.trim() || state === 'checking'
                  ? theme.colors.gray200
                  : `linear-gradient(135deg, ${theme.colors.teal}, ${theme.colors.tealDark})`,
                color: !key.trim() || state === 'checking' ? theme.colors.gray400 : theme.colors.navy,
                fontSize: 14, fontWeight: 700,
                cursor: !key.trim() || state === 'checking' ? 'not-allowed' : 'pointer',
                fontFamily: theme.font.sans,
                letterSpacing: '0.2px',
                transition: 'all 0.2s',
                boxShadow: key.trim() && state !== 'checking' ? `0 4px 16px ${theme.colors.tealGlow}` : 'none',
              }}
            >
              {state === 'checking' ? 'Verifying key…' : 'Access Dashboard →'}
            </button>
          </form>

          {/* Footer note */}
          <div style={{ marginTop: 32, textAlign: 'center', fontSize: 12, color: theme.colors.gray400 }}>
            Your key is stored in session memory only.<br />It is cleared when you close the browser tab.
          </div>
        </div>
      </div>
    </div>
  );
}
