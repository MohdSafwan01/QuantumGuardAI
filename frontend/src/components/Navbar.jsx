import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: scrolled ? 'rgba(8,8,8,0.95)' : '#080808',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        zIndex: 50,
        transition: 'background 0.2s, backdrop-filter 0.2s',
      }}
    >
      {/* Left — Logo */}
      <Link
        to="/dashboard"
        style={{
          fontFamily: '"Space Mono", monospace',
          fontWeight: 700,
          fontSize: '16px',
          color: '#C8FF00',
          textDecoration: 'none',
          letterSpacing: '0.02em',
        }}
      >
        QuantumGuard
      </Link>

      {/* Right — Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user && (
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '13px',
              color: '#555',
            }}
          >
            {user.email}
          </span>
        )}

        <Link
          to="/scan"
          className="neo-btn"
          style={{
            background: '#C8FF00',
            color: '#000',
            padding: '6px 16px',
            fontSize: '12px',
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          New Scan
        </Link>

        {user && (
          <button
            id="sign-out-btn"
            onClick={handleLogout}
            style={{
              background: '#fff',
              color: '#000',
              fontFamily: '"Space Mono", monospace',
              fontWeight: 700,
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '7px 14px',
              border: '2px solid #000',
              boxShadow: '3px 3px 0 #000',
              borderRadius: '3px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.1s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FF3B3B'
              e.currentTarget.style.color = '#fff'
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '5px 5px 0 #000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.color = '#000'
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '3px 3px 0 #000'
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '1px 1px 0 #000'
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '5px 5px 0 #000'
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        )}
      </div>
    </nav>
  )
}
