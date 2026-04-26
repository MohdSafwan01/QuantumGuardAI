import { useState, useEffect, useMemo } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Navbar from '../components/Navbar'

const API_URL = import.meta.env.VITE_API_URL || ''

const SEVERITY_ORDER = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 }
const SEVERITY_COLORS = {
  CRITICAL: '#FF3B3B',
  HIGH: '#FF9500',
  MEDIUM: '#FFE500',
  LOW: '#555',
  NONE: '#00FF88',
}

/* ═══ HELPERS ═══ */

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function getDuration(start, end) {
  if (!start || !end) return '—'
  const ms = new Date(end) - new Date(start)
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function parseAiFix(val) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
}

function formatSourceLabel(label, type) {
  if (type === 'github') {
    try {
      const url = new URL(label)
      return url.hostname + url.pathname
    } catch { return label }
  }
  if (type === 'upload') return `uploaded: ${label}`
  return label || 'code snippet'
}

/* ═══ SEVERITY BADGE ═══ */

function SeverityBadge({ severity, large }) {
  const config = {
    CRITICAL: { bg: '#FF3B3B', text: '#fff' },
    HIGH: { bg: '#FF9500', text: '#000' },
    MEDIUM: { bg: '#FFE500', text: '#000' },
    LOW: { bg: '#1a1a1a', text: '#555' },
    NONE: { bg: '#00FF88', text: '#000' },
  }
  const s = config[severity] || config.LOW
  const label = severity === 'NONE' ? 'ALL CLEAR' : severity

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: large ? '10px 22px' : '4px 10px',
        background: s.bg,
        color: s.text,
        fontFamily: '"Space Mono", monospace',
        fontSize: large ? '14px' : '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        border: '1.5px solid #000',
        boxShadow: large ? '4px 4px 0 #000' : '2px 2px 0 #000',
        borderRadius: '3px',
      }}
    >
      {label}
    </span>
  )
}

/* ═══ CONFIDENCE BADGE ═══ */

function ConfidenceBadge({ confidence }) {
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
        color: '#555',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}
    >
      {confidence} confidence
    </span>
  )
}

/* ═══ ANIMATED CHECKMARK (empty state) ═══ */

function AnimatedCheckmark() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <motion.circle
        cx="40" cy="40" r="36"
        stroke="#00FF88"
        strokeWidth="3"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
      <motion.polyline
        points="24,42 35,53 56,30"
        stroke="#00FF88"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
      />
    </svg>
  )
}

/* ═══ COPY BUTTON ═══ */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'none',
        border: '1px solid #2a2a2a',
        borderRadius: '3px',
        padding: '4px 10px',
        fontFamily: '"Space Mono", monospace',
        fontSize: '10px',
        color: copied ? '#00FF88' : '#555',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          e.currentTarget.style.borderColor = '#C8FF00'
          e.currentTarget.style.color = '#C8FF00'
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          e.currentTarget.style.borderColor = '#2a2a2a'
          e.currentTarget.style.color = '#555'
        }
      }}
    >
      {copied ? '✓ Copied!' : 'Copy fix'}
    </button>
  )
}

/* ═══ VULNERABILITY CARD ═══ */

function VulnerabilityCard({ vuln, index }) {
  const [expanded, setExpanded] = useState(true)
  const sevColor = SEVERITY_COLORS[vuln.severity] || '#555'
  const aiFix = parseAiFix(vuln.ai_fix_suggestion)

  // Build before/after display
  const beforeCode = aiFix?.code_before || vuln.pattern_matched || ''
  const afterCode = aiFix?.code_after || vuln.quantum_safe_replacement || ''

  return (
    <motion.div
      custom={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      style={{
        background: '#0d0d0d',
        borderLeft: `4px solid ${sevColor}`,
        borderTop: '1px solid #1a1a1a',
        borderRight: '1px solid #1a1a1a',
        borderBottom: '1px solid #1a1a1a',
        boxShadow: '4px 4px 0 #1a1a1a',
        borderRadius: '0 4px 4px 0',
        marginBottom: '12px',
        overflow: 'hidden',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `4px 4px 0 ${sevColor}`
        e.currentTarget.style.borderTopColor = sevColor
        e.currentTarget.style.borderRightColor = sevColor
        e.currentTarget.style.borderBottomColor = sevColor
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '4px 4px 0 #1a1a1a'
        e.currentTarget.style.borderTopColor = '#1a1a1a'
        e.currentTarget.style.borderRightColor = '#1a1a1a'
        e.currentTarget.style.borderBottomColor = '#1a1a1a'
      }}
    >
      {/* ROW 1 — Header Bar */}
      <div
        style={{
          background: '#111',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <SeverityBadge severity={vuln.severity} />
          <ConfidenceBadge confidence={vuln.confidence || 'MEDIUM'} />
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#fff',
            }}
          >
            {vuln.vulnerability_type}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: '11px',
              color: '#C8FF00',
              background: 'rgba(200,255,0,0.06)',
              border: '1px solid rgba(200,255,0,0.2)',
              padding: '3px 10px',
              borderRadius: '3px',
            }}
          >
            {vuln.file_path?.split('/').pop() || vuln.file_path}
          </span>
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: '11px',
              color: '#555',
            }}
          >
            line {vuln.line_number || '?'}
          </span>
        </div>
      </div>

      {/* ROW 2 — Description + Pattern */}
      <div style={{ padding: '16px 20px' }}>
        <p
          style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '14px',
            color: '#888',
            lineHeight: '1.7',
            margin: 0,
          }}
        >
          {vuln.description}
        </p>

        {vuln.pattern_matched && (
          <div
            style={{
              background: '#080808',
              border: '1px solid #2a2a2a',
              padding: '8px 14px',
              borderRadius: '3px',
              marginTop: '10px',
            }}
          >
            <div
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '4px',
              }}
            >
              Pattern Detected
            </div>
            <code
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '13px',
                color: sevColor,
              }}
            >
              {vuln.pattern_matched}
            </code>
          </div>
        )}
      </div>

      {/* ROW 3 — AI Fix Panel */}
      {(vuln.quantum_safe_replacement || aiFix) && (
        <>
          {/* Collapsible header */}
          <div
            onClick={() => setExpanded(!expanded)}
            style={{
              background: '#0a1a00',
              borderTop: '1px solid #1a3a00',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#0d2200')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0a1a00')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Lightning bolt icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '11px',
                  color: '#C8FF00',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                AI-Suggested Fix
              </span>
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '10px',
                  color: '#555',
                  marginLeft: '4px',
                }}
              >
                {expanded ? '▾' : '▸'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {vuln.nist_reference && (
                <a
                  href={`https://csrc.nist.gov/projects/post-quantum-cryptography`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '10px',
                    color: '#C8FF00',
                    background: 'rgba(200,255,0,0.06)',
                    border: '1px solid rgba(200,255,0,0.15)',
                    padding: '3px 8px',
                    borderRadius: '2px',
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                  }}
                >
                  {vuln.nist_reference}
                </a>
              )}
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '16px 20px', background: '#080808' }}>
                  {/* Two-column code diff */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    {/* BEFORE — Vulnerable */}
                    <div
                      style={{
                        background: 'rgba(255,59,59,0.05)',
                        border: '1px solid rgba(255,59,59,0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '8px 14px',
                          borderBottom: '1px solid rgba(255,59,59,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span style={{ color: '#FF3B3B', fontSize: '12px' }}>✗</span>
                        <span
                          style={{
                            fontFamily: '"Space Mono", monospace',
                            fontSize: '10px',
                            color: '#FF3B3B',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          Vulnerable
                        </span>
                      </div>
                      <pre
                        style={{
                          padding: '12px 14px',
                          margin: 0,
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '12px',
                          color: '#FF3B3B',
                          lineHeight: '1.8',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {beforeCode}
                      </pre>
                    </div>

                    {/* AFTER — Quantum-safe */}
                    <div
                      style={{
                        background: 'rgba(0,255,136,0.04)',
                        border: '1px solid rgba(0,255,136,0.15)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          padding: '8px 14px',
                          borderBottom: '1px solid rgba(0,255,136,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#00FF88', fontSize: '12px' }}>✓</span>
                          <span
                            style={{
                              fontFamily: '"Space Mono", monospace',
                              fontSize: '10px',
                              color: '#00FF88',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                            }}
                          >
                            Quantum-Safe
                          </span>
                        </div>
                        <CopyButton text={afterCode} />
                      </div>
                      <pre
                        style={{
                          padding: '12px 14px',
                          margin: 0,
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '12px',
                          color: '#00FF88',
                          lineHeight: '1.8',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {afterCode}
                      </pre>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  {aiFix?.explanation && (
                    <div
                      style={{
                        background: '#0d0d0d',
                        borderTop: '1px solid #1a1a1a',
                        padding: '14px 20px',
                        marginTop: '12px',
                        borderRadius: '3px',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '10px',
                          color: '#555',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: '6px',
                        }}
                      >
                        AI Explanation
                      </div>
                      <p
                        style={{
                          fontFamily: '"Space Grotesk", sans-serif',
                          fontSize: '13px',
                          color: '#666',
                          lineHeight: '1.7',
                          margin: 0,
                        }}
                      >
                        {aiFix.explanation}
                      </p>
                      {aiFix.fix_summary && aiFix.fix_summary !== aiFix.explanation && (
                        <p
                          style={{
                            fontFamily: '"Space Grotesk", sans-serif',
                            fontSize: '13px',
                            color: '#888',
                            lineHeight: '1.7',
                            margin: '8px 0 0',
                            fontStyle: 'italic',
                          }}
                        >
                          {aiFix.fix_summary}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

/* ═══ QUANTUM THREAT METER (unique component) ═══ */

function ThreatMeter({ vulnerabilities }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const v of vulnerabilities) {
      if (c[v.severity] !== undefined) c[v.severity]++
    }
    return c
  }, [vulnerabilities])

  const total = vulnerabilities.length || 1
  const segments = [
    { key: 'CRITICAL', color: '#FF3B3B', count: counts.CRITICAL },
    { key: 'HIGH', color: '#FF9500', count: counts.HIGH },
    { key: 'MEDIUM', color: '#FFE500', count: counts.MEDIUM },
    { key: 'LOW', color: '#555', count: counts.LOW },
  ].filter((s) => s.count > 0)

  return (
    <div style={{ flex: 1 }}>
      <div
        style={{
          fontFamily: '"Space Mono", monospace',
          fontSize: '10px',
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: '12px',
        }}
      >
        Quantum Threat Distribution
      </div>

      {/* Bar */}
      <div
        style={{
          display: 'flex',
          borderRadius: '3px',
          overflow: 'hidden',
          height: '28px',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
        }}
      >
        {segments.map((seg, i) => (
          <motion.div
            key={seg.key}
            initial={{ width: 0 }}
            animate={{ width: `${(seg.count / total) * 100}%` }}
            transition={{ duration: 1.2, delay: i * 0.15, ease: 'easeOut' }}
            style={{
              background: seg.color,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {(seg.count / total) > 0.12 && (
              <span
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: seg.key === 'LOW' ? '#fff' : '#000',
                }}
              >
                {seg.count}
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Legend below bar */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
        {[
          { key: 'CRITICAL', color: '#FF3B3B' },
          { key: 'HIGH', color: '#FF9500' },
          { key: 'MEDIUM', color: '#FFE500' },
          { key: 'LOW', color: '#555' },
        ].map((s) => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: s.color,
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                color: '#555',
              }}
            >
              {s.key}
            </span>
            <span
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '13px',
                fontWeight: 600,
                color: counts[s.key] > 0 ? s.color : '#333',
              }}
            >
              {counts[s.key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══ STAT BOX ═══ */

function StatBox({ label, value, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#111',
        border: '1.5px solid #2a2a2a',
        boxShadow: '3px 3px 0 #1a1a1a',
        borderRadius: '3px',
        padding: '16px 20px',
        minWidth: '120px',
        transition: 'all 0.1s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translate(-2px, -2px)'
        e.currentTarget.style.boxShadow = '5px 5px 0 #1a1a1a'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)'
        e.currentTarget.style.boxShadow = '3px 3px 0 #1a1a1a'
      }}
    >
      <div
        style={{
          fontFamily: '"Space Mono", monospace',
          fontSize: '10px',
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: '28px',
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </motion.div>
  )
}

/* ═══ LOADING SKELETON ═══ */

function LoadingSkeleton() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        fontFamily: '"Space Grotesk", sans-serif',
      }}
    >
      <Navbar />
      <div style={{ paddingTop: '56px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 56px)',
            gap: '20px',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              display: 'block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#C8FF00',
            }}
          />
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: '14px',
              color: '#555',
              letterSpacing: '0.08em',
            }}
          >
            Loading scan results...
          </span>
        </div>
      </div>
    </div>
  )
}

/* ═══ FILTER / SORT BUTTON ═══ */

function FilterButton({ label, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? (color || '#C8FF00') : '#111',
        color: active ? '#000' : '#555',
        border: active ? '1.5px solid #000' : '1.5px solid #2a2a2a',
        boxShadow: active ? '2px 2px 0 #000' : 'none',
        padding: '6px 14px',
        fontSize: '11px',
        fontFamily: '"Space Mono", monospace',
        fontWeight: active ? 700 : 400,
        borderRadius: '3px',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = color || '#C8FF00'
          e.currentTarget.style.color = color || '#C8FF00'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.borderColor = '#2a2a2a'
          e.currentTarget.style.color = '#555'
        }
      }}
    >
      {label}
    </button>
  )
}

/* ═══════════════════════════════════════════
   RESULTS PAGE
   ═══════════════════════════════════════════ */

export default function Results() {
  const location = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [scan, setScan] = useState(location.state?.scan || null)
  const [loading, setLoading] = useState(!location.state?.scan)
  const [error, setError] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('ALL')

  // Fetch from API if no state passed
  useEffect(() => {
    if (scan) return

    const fetchScan = async () => {
      try {
        const res = await fetch(`${API_URL}/api/scan/${id}`)
        if (!res.ok) throw new Error('Scan not found')
        const data = await res.json()

        // Normalize the API response shape
        setScan({
          id: data.scan?.id || id,
          sourceType: data.scan?.source_type || 'snippet',
          sourceLabel: data.scan?.source_label || 'Code scan',
          status: data.scan?.status || 'complete',
          totalFilesScanned: data.summary?.totalFiles || data.scan?.total_files_scanned || 0,
          totalVulnerabilities: data.summary?.totalVulnerabilities || data.scan?.total_vulnerabilities || 0,
          maxSeverity: data.summary?.maxSeverity || data.scan?.max_severity || 'NONE',
          vulnerabilities: data.vulnerabilities || [],
          createdAt: data.scan?.created_at,
          completedAt: data.scan?.completed_at,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchScan()
  }, [id, scan])

  // Memoize filtered + sorted vulns
  const filteredVulns = useMemo(() => {
    if (!scan?.vulnerabilities) return []
    let vulns = [...scan.vulnerabilities]

    // Filter
    if (severityFilter !== 'ALL') {
      vulns = vulns.filter((v) => v.severity === severityFilter)
    }

    // Sort: CRITICAL first
    vulns.sort((a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0))
    return vulns
  }, [scan, severityFilter])

  // Severity counts
  const severityCounts = useMemo(() => {
    if (!scan?.vulnerabilities) return { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    for (const v of scan.vulnerabilities) {
      if (c[v.severity] !== undefined) c[v.severity]++
    }
    return c
  }, [scan])

  // Quantum Risk Score
  const riskScore = useMemo(() => {
    const raw =
      severityCounts.CRITICAL * 10 +
      severityCounts.HIGH * 5 +
      severityCounts.MEDIUM * 2 +
      severityCounts.LOW * 1
    return Math.min(raw, 100)
  }, [severityCounts])

  const riskColor = riskScore > 50 ? '#FF3B3B' : riskScore > 20 ? '#FF9500' : '#00FF88'

  // Files affected count
  const filesAffected = useMemo(() => {
    if (!scan?.vulnerabilities) return 0
    return new Set(scan.vulnerabilities.map((v) => v.file_path)).size
  }, [scan])

  // Export JSON
  const handleExport = () => {
    const dateStr = new Date().toISOString().split('T')[0]
    const safeName = (scan.sourceLabel || 'scan').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
    const filename = `quantumguard-${safeName}-${dateStr}.json`
    const blob = new Blob([JSON.stringify(scan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <LoadingSkeleton />

  if (error || !scan) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080808',
          fontFamily: '"Space Grotesk", sans-serif',
        }}
      >
        <Navbar />
        <div
          style={{
            paddingTop: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 56px)',
            gap: '20px',
          }}
        >
          <span
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '24px',
              fontWeight: 700,
              color: '#FF3B3B',
            }}
          >
            Scan not found
          </span>
          <span
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: '13px',
              color: '#555',
            }}
          >
            {error || 'This scan result could not be loaded.'}
          </span>
          <button
            onClick={() => navigate('/scan')}
            className="neo-btn"
            style={{
              background: '#C8FF00',
              color: '#000',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
              border: '1.5px solid #000',
              boxShadow: '3px 3px 0 #000',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            ← Start New Scan
          </button>
        </div>
      </div>
    )
  }

  const totalVulns = scan.totalVulnerabilities || scan.vulnerabilities?.length || 0

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        fontFamily: '"Space Grotesk", sans-serif',
        paddingBottom: '72px', /* space for sticky action bar */
      }}
    >
      <Navbar />

      {/* ═══ SECTION 1: SCAN HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          paddingTop: '56px',
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
        }}
      >
        <div
          style={{
            padding: '32px 64px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Left */}
          <div>
            <div
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '10px',
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                marginBottom: '8px',
              }}
            >
              Scan Complete · {formatDate(scan.createdAt || scan.created_at)}
            </div>
            <h1
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '28px',
                color: '#fff',
                margin: '0 0 12px',
              }}
            >
              {formatSourceLabel(scan.sourceLabel || scan.source_label, scan.sourceType || scan.source_type)}
            </h1>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '2px',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '11px',
                  color: '#888',
                }}
              >
                {scan.sourceType || scan.source_type || 'snippet'}
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '2px',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '11px',
                  color: '#888',
                }}
              >
                {scan.totalFilesScanned || scan.total_files_scanned || 0} files scanned
              </span>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '2px',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '11px',
                  color: '#888',
                }}
              >
                completed in {getDuration(scan.createdAt || scan.created_at, scan.completedAt || scan.completed_at)}
              </span>
            </div>
          </div>

          {/* Right — Max Severity Badge */}
          <SeverityBadge severity={scan.maxSeverity || scan.max_severity || 'NONE'} large />
        </div>
      </motion.div>

      {/* ═══ SECTION 2: STATS BAR + THREAT METER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{
          background: '#080808',
          borderBottom: '1px solid #1a1a1a',
          padding: '24px 64px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Threat Meter (left) */}
          {totalVulns > 0 && <ThreatMeter vulnerabilities={scan.vulnerabilities || []} />}

          {/* Stat Boxes (right) */}
          <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
            <StatBox
              label="Total Vulns"
              value={totalVulns}
              color={totalVulns > 0 ? '#C8FF00' : '#00FF88'}
            />
            <StatBox
              label="Critical"
              value={severityCounts.CRITICAL}
              color={severityCounts.CRITICAL > 0 ? '#FF3B3B' : '#333'}
            />
            <StatBox
              label="Files Affected"
              value={filesAffected}
              color={filesAffected > 0 ? '#FF9500' : '#333'}
            />
            <StatBox
              label="Risk Score"
              value={`${riskScore}/100`}
              color={riskColor}
            />
          </div>
        </div>
      </motion.div>

      {/* ═══ SECTION 3: VULNERABILITY LIST ═══ */}
      <div
        style={{
          padding: '48px 64px',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {totalVulns > 0 ? (
          <>
            {/* Section header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  Vulnerabilities
                </h2>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    background: 'rgba(200,255,0,0.12)',
                    border: '1px solid rgba(200,255,0,0.3)',
                    borderRadius: '10px',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#C8FF00',
                  }}
                >
                  {totalVulns}
                </span>
              </div>

              {/* Severity filter buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <FilterButton
                  label="All"
                  active={severityFilter === 'ALL'}
                  onClick={() => setSeverityFilter('ALL')}
                />
                <FilterButton
                  label="Critical"
                  active={severityFilter === 'CRITICAL'}
                  color="#FF3B3B"
                  onClick={() => setSeverityFilter('CRITICAL')}
                />
                <FilterButton
                  label="High"
                  active={severityFilter === 'HIGH'}
                  color="#FF9500"
                  onClick={() => setSeverityFilter('HIGH')}
                />
                <FilterButton
                  label="Medium"
                  active={severityFilter === 'MEDIUM'}
                  color="#FFE500"
                  onClick={() => setSeverityFilter('MEDIUM')}
                />
                <FilterButton
                  label="Low"
                  active={severityFilter === 'LOW'}
                  color="#555"
                  onClick={() => setSeverityFilter('LOW')}
                />
              </div>
            </div>

            {/* Vulnerability cards */}
            {filteredVulns.length > 0 ? (
              filteredVulns.map((vuln, i) => (
                <VulnerabilityCard key={vuln.id || `${vuln.file_path}-${vuln.line_number}-${i}`} vuln={vuln} index={i} />
              ))
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '13px',
                  color: '#333',
                }}
              >
                No {severityFilter} vulnerabilities found
              </div>
            )}
          </>
        ) : (
          /* ═══ SECTION 4: EMPTY STATE ═══ */
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <AnimatedCheckmark />
            <h2
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 700,
                fontSize: '28px',
                color: '#fff',
                marginTop: '24px',
                marginBottom: '8px',
              }}
            >
              Your code is quantum-safe
            </h2>
            <p
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: '14px',
                color: '#555',
                margin: '0 0 8px',
              }}
            >
              No quantum-vulnerable cryptographic patterns detected.
            </p>
            <span
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: '12px',
                color: '#00FF88',
              }}
            >
              Scanned {scan.totalFilesScanned || scan.total_files_scanned || 0} files · 0 vulnerabilities found
            </span>
          </div>
        )}
      </div>

      {/* ═══ SECTION 5: STICKY ACTION BAR ═══ */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(8,8,8,0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #1a1a1a',
          padding: '16px 64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 40,
        }}
      >
        {/* Left — summary */}
        <span
          style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '12px',
            color: '#555',
          }}
        >
          QuantumGuard · {totalVulns} issue{totalVulns !== 1 ? 's' : ''} · {formatSourceLabel(scan.sourceLabel || scan.source_label, scan.sourceType || scan.source_type)}
        </span>

        {/* Right — action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* New Scan */}
          <button
            onClick={() => navigate('/scan')}
            style={{
              background: 'transparent',
              border: '1.5px solid #2a2a2a',
              borderRadius: '3px',
              padding: '8px 18px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              color: '#555',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#555'
            }}
          >
            ← New Scan
          </button>

          {/* Dashboard */}
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              border: '1.5px solid #2a2a2a',
              borderRadius: '3px',
              padding: '8px 18px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              color: '#555',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#fff'
              e.currentTarget.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a'
              e.currentTarget.style.color = '#555'
            }}
          >
            Dashboard
          </button>

          {/* Export JSON */}
          <button
            onClick={handleExport}
            className="neo-btn"
            style={{
              background: '#C8FF00',
              color: '#000',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 600,
              border: '1.5px solid #000',
              boxShadow: '3px 3px 0 #000',
              borderRadius: '3px',
              cursor: 'pointer',
              fontFamily: '"Space Grotesk", sans-serif',
            }}
          >
            Export JSON ↓
          </button>
        </div>
      </div>
    </div>
  )
}
