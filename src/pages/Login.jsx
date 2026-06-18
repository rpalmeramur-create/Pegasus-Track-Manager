import React, { useEffect, useState } from 'react'
import { Eye, EyeOff, ChevronLeft, Shield, Users } from 'lucide-react'
import AppLogo from '../components/AppLogo.jsx'
import { useAuth } from '../AuthContext.jsx'
import { useSettings } from '../SettingsContext.jsx'

export default function Login() {
  const { login, setUser } = useAuth()
  const { homeTeam } = useSettings()

  const [accounts, setAccounts] = useState([])
  const [role, setRole]         = useState(null)    // 'admin' | 'parent'
  const [selected, setSelected] = useState(null)    // account object
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    window.electronAPI?.authListUsers?.()
      .then(u => setAccounts((u ?? []).filter(a => a.active)))
      .catch(() => {})
  }, [])

  const adminAccounts  = accounts.filter(a => a.role === 'admin')
  const parentAccounts = accounts.filter(a => a.role === 'parent')

  const handleRoleSelect = (r) => {
    setRole(r)
    setSelected(null)
    setPassword('')
    setError('')
    // If only one account for this role, auto-select it
    const list = r === 'admin' ? adminAccounts : parentAccounts
    if (list.length === 1) setSelected(list[0])
  }

  const handleBack = () => {
    if (selected && (role === 'admin' ? adminAccounts : parentAccounts).length > 1) {
      setSelected(null)
    } else {
      setRole(null)
      setSelected(null)
    }
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) { setError('Enter your password.'); return }
    setLoading(true)
    setError('')
    const res = await login({ username: selected.username, password })
    setLoading(false)
    if (res?.error) setError(res.error)
  }

  const handlePasscode = (e) => {
    e.preventDefault()
    if (password === 'Groundlift#01') {
      setUser({ role: 'parent', display_name: 'Parent' })
    } else {
      setError('Incorrect passcode.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'var(--accent-glow)', border: '1px solid rgba(56,189,248,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <AppLogo size={28} />
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700,
            letterSpacing: '0.08em',
          }}>
            {homeTeam.toUpperCase()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            Club Management System
          </div>
        </div>

        <div className="card" style={{ padding: 28 }}>

          {/* ── Step 1: choose role ── */}
          {!role && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
                Sign in as
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Coach */}
                <button onClick={() => handleRoleSelect('admin')} style={roleTileStyle}>
                  <div style={roleIconStyle('var(--accent-glow)', 'rgba(56,189,248,.2)')}>
                    <Shield size={22} style={{ color: 'var(--accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Coach Access</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Full app — roster, meets, results</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                </button>

                {/* Parent */}
                <button onClick={() => handleRoleSelect('parent')} style={roleTileStyle}>
                  <div style={roleIconStyle('rgba(245,158,11,.1)', 'rgba(245,158,11,.2)')}>
                    <Users size={22} style={{ color: '#f59e0b' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Parent Portal</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>View schedules and meet results</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
                </button>

              </div>
            </>
          )}

          {/* ── Step 2a: pick account (multiple accounts for role) ── */}
          {role && !selected && (
            <>
              <BackHeader onBack={handleBack}
                title={role === 'admin' ? 'Coach Access' : 'Parent Portal'}
                sub="Choose your account" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(role === 'admin' ? adminAccounts : parentAccounts).map(a => (
                  <button key={a.id} onClick={() => setSelected(a)} style={accountTileStyle}>
                    <div style={avatarStyle}>{(a.display_name || a.username)[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{a.display_name || a.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{a.username}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>›</span>
                  </button>
                ))}
                {(role === 'admin' ? adminAccounts : parentAccounts).length === 0 && (
                  role === 'parent' ? (
                    <form onSubmit={handlePasscode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                        Enter the parent portal passcode
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input className="input" type={showPw ? 'text' : 'password'} autoFocus
                          value={password} onChange={e => { setPassword(e.target.value); setError('') }}
                          placeholder="Passcode" style={{ paddingRight: 40 }} />
                        <button type="button" className="btn btn-ghost btn-icon"
                          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                          onClick={() => setShowPw(v => !v)}>
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                      {error && <div style={errorStyle}>{error}</div>}
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Enter Portal
                      </button>
                    </form>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                      No coach accounts set up yet.
                    </div>
                  )
                )}
              </div>
            </>
          )}

          {/* ── Step 2b: password ── */}
          {role && selected && (
            <>
              <BackHeader onBack={handleBack}
                title={selected.display_name || selected.username}
                sub={role === 'admin' ? 'Coach Access' : 'Parent Portal'} />
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input className="input" type={showPw ? 'text' : 'password'}
                      autoFocus autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password" style={{ paddingRight: 40 }} />
                    <button type="button" className="btn btn-ghost btn-icon"
                      style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 4 }}
                      onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {error && <div style={errorStyle}>{error}</div>}
                <button type="submit" className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          )}

        </div>

        {!role && (
          <div style={{ textAlign: 'center', marginTop: 14, fontSize: 11, color: 'var(--text-muted)' }}>
            Default: <strong>admin</strong> / <strong>coach</strong>
          </div>
        )}
      </div>
    </div>
  )
}

function BackHeader({ onBack, title, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <button className="btn btn-ghost btn-icon" onClick={onBack} style={{ padding: 4 }}>
        <ChevronLeft size={16} />
      </button>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

const roleTileStyle = {
  display: 'flex', alignItems: 'center', gap: 14,
  padding: '16px 14px', borderRadius: 'var(--radius-md)',
  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
  cursor: 'pointer', textAlign: 'left', width: '100%',
}
const accountTileStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 'var(--radius-md)',
  background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
  cursor: 'pointer', textAlign: 'left', width: '100%',
}
const roleIconStyle = (bg, border) => ({
  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
  background: bg, border: `1px solid ${border}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})
const avatarStyle = {
  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
  background: 'var(--accent-glow)', border: '1px solid rgba(56,189,248,.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--accent)',
}
const errorStyle = {
  padding: '10px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
  background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: 'var(--red)',
}
