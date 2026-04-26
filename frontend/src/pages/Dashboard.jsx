import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

/* ═══════════════════════════════════════════
   SEVERITY BADGE COMPONENT
   ═══════════════════════════════════════════ */
function SeverityBadge({ severity }) {
  const config = {
    CRITICAL: {
      bg: 'rgba(255,59,59,0.15)',
      border: 'rgba(255,59,59,0.4)',
      color: '#FF3B3B',
    },
    HIGH: {
      bg: 'rgba(255,149,0,0.15)',
      border: 'rgba(255,149,0,0.4)',
      color: '#FF9500',
    },
    MEDIUM: {
      bg: 'rgba(255,229,0,0.15)',
      border: 'rgba(255,229,0,0.4)',
      color: '#FFE500',
    },
    LOW: {
      bg: '#1a1a1a',
      border: '#2a2a2a',
      color: '#555',
    },
  }

  const s = config[severity] || config.LOW

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: '2px',
        fontFamily: '"Space Mono", monospace',
        fontSize: '10px',
        fontWeight: 700,
        color: s.color,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {severity}
    </span>
  )
}

/* ═══════════════════════════════════════════
   LANGUAGE PILL
   ═══════════════════════════════════════════ */
function LanguagePill({ language }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: '2px',
        fontFamily: '"Space Mono", monospace',
        fontSize: '10px',
        color: '#888',
      }}
    >
      {language}
    </span>
  )
}

/* ═══════════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════════ */
function SkeletonRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 0.8fr',
        gap: '16px',
        padding: '14px 20px',
        borderBottom: '1px solid #1a1a1a',
      }}
    >
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            height: '14px',
            background: '#1a1a1a',
            borderRadius: '2px',
            animation: 'pulse-dot 2s ease-in-out infinite',
            width: i === 0 ? '80%' : '60%',
          }}
        />
      ))}
    </div>
  )
}

function SkeletonStatCard() {
  return (
    <div
      style={{
        background: '#111',
        border: '1.5px solid #2a2a2a',
        boxShadow: '3px 3px 0 #1a1a1a',
        borderRadius: '3px',
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          height: '10px',
          width: '60%',
          background: '#1a1a1a',
          borderRadius: '2px',
          marginBottom: '12px',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '28px',
          width: '40%',
          background: '#1a1a1a',
          borderRadius: '2px',
          animation: 'pulse-dot 2s ease-in-out infinite',
          animationDelay: '0.3s',
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   HELPER — Dynamic Greeting
   ═══════════════════════════════════════════ */
function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/* ═══════════════════════════════════════════
   HELPER — Format Date
   ═══════════════════════════════════════════ */
function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d

  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    return `${hours}h ago`
  }
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}d ago`
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════ */
export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalScans: 0,
    totalVulns: 0,
    criticalIssues: 0,
    reposScanned: 0,
  })

  useEffect(() => {
    const init = async () => {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchScans(session.user.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  const fetchScans = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching scans:', error)
        setScans([])
        return
      }

      setScans(data || [])

      // Compute stats
      if (data && data.length > 0) {
        const totalVulns = data.reduce((sum, s) => sum + (s.findings_count || 0), 0)
        const criticalIssues = data.filter((s) => s.max_severity === 'CRITICAL').length
        const uniqueRepos = new Set(data.map((s) => s.repo_name || s.source).filter(Boolean))
        setStats({
          totalScans: data.length,
          totalVulns,
          criticalIssues,
          reposScanned: uniqueRepos.size,
        })
      }
    } catch (err) {
      console.error('Failed to fetch scans:', err)
      setScans([])
    }
  }

  /* ── Stat cards config ── */
  const statCards = [
    { label: 'Total Scans', value: stats.totalScans, trend: null },
    { label: 'Vulnerabilities', value: stats.totalVulns, trend: null },
    { label: 'Critical Issues', value: stats.criticalIssues, trend: null },
    { label: 'Repos Scanned', value: stats.reposScanned, trend: null },
  ]

  /* ── Framer animation ── */
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      <Navbar />

      {/* ── Page content ── */}
      <div
        style={{
          paddingTop: '56px',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '80px 48px 48px',
        }}
      >
        {/* ── Top Bar ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '36px',
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '24px',
                fontWeight: 600,
                color: '#fff',
                margin: 0,
              }}
            >
              {getGreeting()},{' '}
              <span style={{ color: '#C8FF00' }}>
                {user?.email || 'user'}
              </span>
            </h1>
            <p
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '14px',
                color: '#555',
                marginTop: '6px',
              }}
            >
              Here are your recent scans
            </p>
          </div>
          <Link
            to="/scan"
            className="neo-btn"
            style={{
              background: '#C8FF00',
              color: '#000',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1.5px solid #000',
              boxShadow: '3px 3px 0 #000',
              borderRadius: '3px',
            }}
          >
            New Scan →
          </Link>
        </div>

        {/* ── Stats Row ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          {loading
            ? [...Array(4)].map((_, i) => <SkeletonStatCard key={i} />)
            : statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  className="neo-card"
                  style={{
                    background: '#111',
                    border: '1.5px solid #2a2a2a',
                    boxShadow: '3px 3px 0 #1a1a1a',
                    borderRadius: '3px',
                    padding: '20px 24px',
                    cursor: 'default',
                  }}
                >
                  <div
                    style={{
                      fontFamily: '"Space Mono", monospace',
                      fontSize: '10px',
                      color: '#555',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '8px',
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#fff',
                      lineHeight: 1,
                    }}
                  >
                    {stat.value}
                  </div>
                </motion.div>
              ))}
        </div>

        {/* ── Scan History Table ── */}
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
              margin: '0 0 16px 0',
            }}
          >
            Recent scans
          </h2>
        </div>

        <div
          style={{
            background: '#0d0d0d',
            border: '1.5px solid #2a2a2a',
            boxShadow: '3px 3px 0 #1a1a1a',
            borderRadius: '3px',
            overflow: 'hidden',
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 0.8fr',
              gap: '16px',
              padding: '12px 20px',
              borderBottom: '1px solid #2a2a2a',
              background: '#0a0a0a',
            }}
          >
            {['Source', 'Language', 'Findings', 'Severity', 'Date', 'Action'].map(
              (header) => (
                <span
                  key={header}
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '10px',
                    color: '#555',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {header}
                </span>
              )
            )}
          </div>

          {/* Table Body */}
          {loading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : scans.length === 0 ? (
            /* Empty State */
            <div
              style={{
                padding: '64px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '13px',
                  color: '#333',
                  marginBottom: '20px',
                }}
              >
                No scans yet. Run your first scan →
              </div>
              <Link
                to="/scan"
                className="neo-btn"
                style={{
                  display: 'inline-flex',
                  background: '#C8FF00',
                  color: '#000',
                  padding: '10px 24px',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  border: '1.5px solid #000',
                  boxShadow: '3px 3px 0 #000',
                  borderRadius: '3px',
                }}
              >
                Start scanning
              </Link>
            </div>
          ) : (
            scans.map((scan, i) => (
              <motion.div
                key={scan.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 0.8fr',
                  gap: '16px',
                  padding: '14px 20px',
                  borderBottom: '1px solid #1a1a1a',
                  alignItems: 'center',
                  transition: 'background 0.15s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#111')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {/* Source */}
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '12px',
                    color: '#fff',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {scan.repo_name || scan.source || 'snippet'}
                </span>

                {/* Language */}
                <LanguagePill language={scan.language || 'JS/TS'} />

                {/* Findings count */}
                <span
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '13px',
                    color: '#fff',
                    fontWeight: 600,
                  }}
                >
                  {scan.findings_count || 0}
                </span>

                {/* Severity */}
                <SeverityBadge severity={scan.max_severity || 'LOW'} />

                {/* Date */}
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '11px',
                    color: '#333',
                  }}
                >
                  {formatDate(scan.created_at)}
                </span>

                {/* Action */}
                <Link
                  to={`/results/${scan.id}`}
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '12px',
                    color: '#555',
                    textDecoration: 'none',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    border: '1px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#C8FF00'
                    e.currentTarget.style.borderColor = '#2a2a2a'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#555'
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  View →
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
