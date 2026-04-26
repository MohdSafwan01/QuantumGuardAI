import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'

/* ═══════════════════════════════════════════
   TERMINAL FINDING CARDS DATA
   ═══════════════════════════════════════════ */
const findingCards = [
  {
    icon: '✗',
    text: 'md5() detected',
    detail: 'Severity: CRITICAL · line 14 · auth.js',
    bgColor: 'rgba(255,59,59,0.08)',
    borderColor: 'rgba(255,59,59,0.3)',
    textColor: '#FF3B3B',
    detailColor: 'rgba(255,59,59,0.6)',
  },
  {
    icon: '✗',
    text: 'RSA-1024 detected',
    detail: 'Severity: HIGH · line 42 · crypto.ts',
    bgColor: 'rgba(255,149,0,0.08)',
    borderColor: 'rgba(255,149,0,0.3)',
    textColor: '#FF9500',
    detailColor: 'rgba(255,149,0,0.6)',
  },
  {
    icon: '→',
    text: 'Replace with CRYSTALS-Kyber',
    detail: 'Recommendation · NIST PQC Standard',
    bgColor: 'rgba(200,255,0,0.06)',
    borderColor: 'rgba(200,255,0,0.25)',
    textColor: '#C8FF00',
    detailColor: 'rgba(200,255,0,0.5)',
  },
  {
    icon: '✓',
    text: 'Scan complete — 3 vulnerabilities found',
    detail: '2 critical · 1 high · 0 medium · 0 low',
    bgColor: 'rgba(0,255,136,0.06)',
    borderColor: 'rgba(0,255,136,0.25)',
    textColor: '#00FF88',
    detailColor: 'rgba(0,255,136,0.5)',
  },
]

/* ═══════════════════════════════════════════
   GOOGLE SVG ICON
   ═══════════════════════════════════════════ */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   AUTH PAGE
   ═══════════════════════════════════════════ */
export default function Auth() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      let result
      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }

      if (result.error) {
        setError(result.error.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  /* ── 1-Click Demo Login ── */
  const handleDemoLogin = async () => {
    setError('')
    setDemoLoading(true)

    try {
      const result = await supabase.auth.signInWithPassword({
        email: 'recruiter@quantumguard.com',
        password: 'Demo123!',
      })

      if (result.error) {
        setError(result.error.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Demo login failed — please try again')
    } finally {
      setDemoLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) setError(error.message)
  }

  /* ── Shared input styles ── */
  const inputStyle = {
    width: '100%',
    background: '#111',
    border: '1.5px solid #2a2a2a',
    borderRadius: '3px',
    padding: '12px 16px',
    fontFamily: '"Space Grotesk", sans-serif',
    fontSize: '14px',
    color: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
  }

  const inputFocusHandler = (e) => {
    e.target.style.borderColor = '#C8FF00'
  }
  const inputBlurHandler = (e) => {
    e.target.style.borderColor = '#2a2a2a'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      {/* ════════════════════════════════════════════
          LEFT PANEL — Decorative
          ════════════════════════════════════════════ */}
      <div
        style={{
          width: '40%',
          minHeight: '100vh',
          background: '#0d0d0d',
          borderRight: '1px solid #1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 40px',
        }}
      >
        {/* Wordmark top-left */}
        <span
          style={{
            position: 'absolute',
            top: '32px',
            left: '40px',
            fontFamily: '"Space Mono", monospace',
            fontWeight: 700,
            fontSize: '18px',
            color: '#C8FF00',
            letterSpacing: '0.02em',
          }}
        >
          QuantumGuard
        </span>

        {/* Big background text */}
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: '"Space Mono", monospace',
            fontSize: '120px',
            fontWeight: 700,
            color: '#fff',
            opacity: 0.04,
            userSelect: 'none',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.04em',
          }}
        >
          SECURE
        </span>

        {/* Terminal-style finding cards */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {findingCards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.2, duration: 0.4, ease: 'easeOut' }}
              style={{
                background: card.bgColor,
                border: `1px solid ${card.borderColor}`,
                borderRadius: '3px',
                padding: '12px 16px',
                fontFamily: '"Space Mono", monospace',
                fontSize: '11px',
              }}
            >
              <div style={{ color: card.textColor, marginBottom: '4px' }}>
                <span style={{ marginRight: '8px' }}>{card.icon}</span>
                {card.text}
              </div>
              <div style={{ color: card.detailColor, fontSize: '10px' }}>
                {card.detail}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom tagline */}
        <span
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '40px',
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '13px',
            color: '#333',
          }}
        >
          Prepare your code for the quantum era
        </span>
      </div>

      {/* ════════════════════════════════════════════
          RIGHT PANEL — Auth Form
          ════════════════════════════════════════════ */}
      <div
        style={{
          width: '60%',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          {/* ── Mode Toggle ── */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '32px',
            }}
          >
            <button
              onClick={() => { setMode('signin'); setError('') }}
              className={mode === 'signin' ? 'neo-btn' : ''}
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'all 0.1s ease',
                ...(mode === 'signin'
                  ? {
                      background: '#C8FF00',
                      color: '#000',
                      border: '1.5px solid #000',
                      boxShadow: '3px 3px 0 #000',
                    }
                  : {
                      background: 'transparent',
                      color: '#555',
                      border: '1.5px solid #2a2a2a',
                      boxShadow: 'none',
                    }),
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className={mode === 'signup' ? 'neo-btn' : ''}
              style={{
                flex: 1,
                padding: '10px 0',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: '3px',
                transition: 'all 0.1s ease',
                ...(mode === 'signup'
                  ? {
                      background: '#C8FF00',
                      color: '#000',
                      border: '1.5px solid #000',
                      boxShadow: '3px 3px 0 #000',
                    }
                  : {
                      background: 'transparent',
                      color: '#555',
                      border: '1.5px solid #2a2a2a',
                      boxShadow: 'none',
                    }),
              }}
            >
              Sign up
            </button>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '10px',
                  color: '#555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                }}
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={inputFocusHandler}
                onBlur={inputBlurHandler}
                required
                style={{
                  ...inputStyle,
                  '::placeholder': { color: '#333' },
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: '16px', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '10px',
                  color: '#555',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={inputFocusHandler}
                  onBlur={inputBlurHandler}
                  required
                  style={{ ...inputStyle, paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#555',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password (sign up only) */}
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: '16px', overflow: 'hidden', position: 'relative' }}
                >
                  <label
                    style={{
                      display: 'block',
                      fontFamily: '"Space Mono", monospace',
                      fontSize: '10px',
                      color: '#555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}
                  >
                    Confirm Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onFocus={inputFocusHandler}
                      onBlur={inputBlurHandler}
                      required
                      style={{ ...inputStyle, paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#555',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showConfirmPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error pill */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'rgba(255,59,59,0.1)',
                    border: '1px solid rgba(255,59,59,0.3)',
                    borderRadius: '3px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '12px',
                    color: '#FF3B3B',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="neo-btn"
              style={{
                width: '100%',
                padding: '13px 0',
                background: loading ? '#a8d900' : '#C8FF00',
                color: '#000',
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 600,
                fontSize: '15px',
                border: '1.5px solid #000',
                boxShadow: '3px 3px 0 #000',
                borderRadius: '3px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#000',
                      animation: 'pulse-dot 1.2s ease-in-out infinite',
                    }}
                  />
                  Scanning credentials...
                </>
              ) : mode === 'signin' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          {/* ── Divider ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '24px 0',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                color: '#333',
                whiteSpace: 'nowrap',
              }}
            >
              or continue with
            </span>
            <span style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
          </div>

          {/* Google OAuth Button */}
          <button
            onClick={handleGoogleAuth}
            className="neo-btn"
            style={{
              width: '100%',
              padding: '12px 0',
              background: '#111',
              color: '#fff',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              border: '1.5px solid #2a2a2a',
              boxShadow: '3px 3px 0 #1a1a1a',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
           <GoogleIcon />
            Continue with Google
          </button>

          {/* ── Demo Divider ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              margin: '24px 0 16px 0',
            }}
          >
            <span style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                color: '#00FF88',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
              }}
            >
              ⚡ instant access
            </span>
            <span style={{ flex: 1, height: '1px', background: '#1a1a1a' }} />
          </div>

          {/* ════════════════════════════════════════════
              1-CLICK DEMO BUTTON — Massive & Unmissable
              ════════════════════════════════════════════ */}
          <motion.button
            id="demo-login-btn"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            whileHover={{ y: -3, x: -3 }}
            whileTap={{ y: 2, x: 2 }}
            style={{
              width: '100%',
              padding: '18px 0',
              background: demoLoading ? '#00cc6a' : '#00FF88',
              color: '#000',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              fontSize: '16px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              border: '3px solid #000',
              boxShadow: '5px 5px 0 #000',
              borderRadius: '4px',
              cursor: demoLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'box-shadow 0.1s ease, background 0.15s ease',
            }}
          >
            {/* Animated scanline overlay on the button */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                pointerEvents: 'none',
              }}
            />
            {demoLoading ? (
              <>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#000',
                    animation: 'pulse-dot 1s ease-in-out infinite',
                  }}
                />
                <span style={{ position: 'relative', zIndex: 1 }}>
                  Authenticating...
                </span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '20px', position: 'relative', zIndex: 1 }}>▶</span>
                <span style={{ position: 'relative', zIndex: 1 }}>
                  Try Demo (No Signup Required)
                </span>
              </>
            )}
          </motion.button>

          {/* Subtext under demo button */}
          <p
            style={{
              textAlign: 'center',
              fontFamily: '"Space Mono", monospace',
              fontSize: '10px',
              color: '#444',
              marginTop: '10px',
              letterSpacing: '0.05em',
            }}
          >
            Explore the full app instantly — no account needed
          </p>
        </div>
      </div>

      {/* ── Global placeholder color fix + demo glow animation ── */}
      <style>{`
        input::placeholder {
          color: #333 !important;
        }
        @media (max-width: 768px) {
          .auth-page-wrapper > div:first-child {
            display: none;
          }
          .auth-page-wrapper > div:last-child {
            width: 100% !important;
          }
        }
        #demo-login-btn {
          animation: demo-glow 2.5s ease-in-out infinite;
        }
        @keyframes demo-glow {
          0%, 100% { box-shadow: 5px 5px 0 #000, 0 0 0px rgba(0,255,136,0); }
          50% { box-shadow: 5px 5px 0 #000, 0 0 20px rgba(0,255,136,0.3); }
        }
        #demo-login-btn:hover {
          box-shadow: 7px 7px 0 #000, 0 0 25px rgba(0,255,136,0.4) !important;
        }
        #demo-login-btn:active {
          box-shadow: 2px 2px 0 #000 !important;
        }
      `}</style>
    </div>
  )
}
