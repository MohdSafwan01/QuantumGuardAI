import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MatrixRain from '../components/MatrixRain'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || ''

// ─── Helpers ───────────────────────────────────────

function detectLanguageFromExt(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'py') return 'python'
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return 'javascript'
  return 'javascript'
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

// ─── Tabs ──────────────────────────────────────────

const TABS = [
  { id: 'github', label: 'GitHub Repo' },
  { id: 'upload', label: 'Upload File' },
  { id: 'paste', label: 'Paste Code' },
]

// ─── Component ─────────────────────────────────────

export default function NewScan() {
  const navigate = useNavigate()

  // Tab state
  const [activeTab, setActiveTab] = useState('github')

  // GitHub tab
  const [repoUrl, setRepoUrl] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [ghToken, setGhToken] = useState('')

  // Upload tab
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // Paste tab
  const [pasteLanguage, setPasteLanguage] = useState('javascript')
  const [codeContent, setCodeContent] = useState('')

  // Scan state
  const [scanning, setScanning] = useState(false)
  const [scanLogs, setScanLogs] = useState([])
  const [scanError, setScanError] = useState(null)
  const logContainerRef = useRef(null)

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [scanLogs])

  // ─── Log helper ──────────────────────────────────

  const addLog = useCallback((text, color = '#555') => {
    setScanLogs((prev) => [...prev, { text, color, id: Date.now() + Math.random() }])
  }, [])

  const delay = (ms) => new Promise((r) => setTimeout(r, ms))

  // ─── Check if scan can start ─────────────────────

  const canScan = (() => {
    if (activeTab === 'github') return repoUrl.trim().length > 10
    if (activeTab === 'upload') return uploadedFiles.length > 0
    if (activeTab === 'paste') return codeContent.trim().length > 10
    return false
  })()

  // ─── File upload handlers ────────────────────────

  const handleFileDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['js', 'jsx', 'ts', 'tsx', 'py'].includes(ext) && f.size <= 500000
    })
    addFiles(files)
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ['js', 'jsx', 'ts', 'tsx', 'py'].includes(ext) && f.size <= 500000
    })
    addFiles(files)
    e.target.value = ''
  }

  const addFiles = (files) => {
    const newFiles = files.map((f) => ({
      file: f,
      name: f.name,
      size: f.size,
      language: detectLanguageFromExt(f.name),
      id: Date.now() + Math.random(),
    }))
    setUploadedFiles((prev) => [...prev, ...newFiles])
  }

  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // ─── Read file contents ──────────────────────────

  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target.result)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  // ─── Start scan ─────────────────────────────────

  const startScan = async () => {
    setScanning(true)
    setScanLogs([])
    setScanError(null)

    try {
      // Get user session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setScanError('You must be logged in to scan')
        setScanning(false)
        return
      }

      const userId = session.user.id
      let files = []
      let sourceType = 'snippet'
      let sourceLabel = 'Code scan'

      // ── GitHub tab ──
      if (activeTab === 'github') {
        sourceType = 'github'
        sourceLabel = repoUrl.trim()

        addLog('→ Fetching repository files...', '#555')
        await delay(300)

        try {
          const ghRes = await fetch(`${API_URL}/api/github/fetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoUrl: repoUrl.trim(), token: ghToken || undefined }),
          })

          const ghData = await ghRes.json()

          if (!ghRes.ok) {
            throw new Error(ghData.error || 'Failed to fetch repository')
          }

          if (!ghData.files || ghData.files.length === 0) {
            addLog('✗ No scannable files found in this repository', '#FF3B3B')
            await delay(500)
            setScanError('No scannable files found (.js, .jsx, .ts, .tsx, .py)')
            setScanning(false)
            return
          }

          addLog(`→ Found ${ghData.totalFilesInRepo || '?'} total files in repo`, '#555')
          await delay(200)
          addLog(`→ Filtered to ${ghData.files.length} relevant code files`, '#555')
          await delay(200)

          files = ghData.files.map((f) => ({
            path: f.path,
            content: f.content,
            language: f.language,
          }))
        } catch (err) {
          addLog(`✗ ${err.message}`, '#FF3B3B')
          setScanError(err.message)
          setScanning(false)
          return
        }
      }

      // ── Upload tab ──
      if (activeTab === 'upload') {
        sourceType = 'upload'
        sourceLabel = `${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''} uploaded`

        addLog('→ Reading uploaded files...', '#555')
        await delay(200)

        for (const uf of uploadedFiles) {
          try {
            const content = await readFileContent(uf.file)
            files.push({
              path: uf.name,
              content,
              language: uf.language,
            })
          } catch {
            addLog(`✗ Failed to read ${uf.name}`, '#FF3B3B')
          }
        }

        addLog(`→ Loaded ${files.length} files`, '#555')
        await delay(200)
      }

      // ── Paste tab ──
      if (activeTab === 'paste') {
        sourceType = 'snippet'
        sourceLabel = `Pasted ${pasteLanguage} code`

        files = [
          {
            path: pasteLanguage === 'python' ? 'pasted_code.py' : 'pasted_code.js',
            content: codeContent,
            language: pasteLanguage,
          },
        ]

        addLog('→ Preparing pasted code for analysis...', '#555')
        await delay(300)
      }

      // ── Send to API for scanning ──
      addLog(`→ Sending ${files.length} files to scanner engine...`, '#555')
      await delay(400)

      const scanRes = await fetch(`${API_URL}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType, sourceLabel, files, userId }),
      })

      const scanData = await scanRes.json()

      if (!scanRes.ok) {
        throw new Error(scanData.error || 'Scan failed')
      }

      const scanId = scanData.scanId

      addLog('→ Scan initiated — analyzing files...', '#555')
      await delay(500)

      // ── Simulate per-file scanning logs while polling ──
      let fileLogIndex = 0

      const logFileProgress = async () => {
        if (fileLogIndex < files.length) {
          const f = files[fileLogIndex]
          addLog(`→ Scanning ${f.path}...`, '#555')
          fileLogIndex++
        }
      }

      // ── Poll for completion ──
      let attempts = 0
      const maxAttempts = 120 // 4 minutes max

      while (attempts < maxAttempts) {
        await delay(2000)
        attempts++

        // Log file progress during polling
        await logFileProgress()

        try {
          const pollRes = await fetch(`${API_URL}/api/scan/${scanId}`)
          const pollData = await pollRes.json()

          if (pollData.scan?.status === 'complete') {
            // Show results summary
            const totalVulns = pollData.summary?.totalVulnerabilities || 0
            const maxSev = pollData.summary?.maxSeverity || 'NONE'
            const flagged = pollData.summary?.flaggedFiles || 0
            const clean = pollData.summary?.cleanFiles || 0

            if (totalVulns > 0) {
              addLog(`✗ Found ${totalVulns} vulnerabilities (max: ${maxSev})`, '#FF3B3B')
              await delay(300)
              addLog(`→ ${flagged} files flagged, ${clean} files clean`, '#555')
            } else {
              addLog('✓ No vulnerabilities detected!', '#00FF88')
            }

            await delay(300)
            addLog('→ Running AI analysis on flagged files...', '#C8FF00')
            await delay(800)
            addLog('✓ Scan complete — redirecting to results...', '#C8FF00')
            await delay(1000)

            // Build full scan result object for Results page
            const scanResult = {
              id: scanId,
              sourceType,
              sourceLabel,
              status: 'complete',
              totalFilesScanned: pollData.summary?.totalFiles || files.length,
              totalVulnerabilities: totalVulns,
              maxSeverity: maxSev,
              vulnerabilities: pollData.vulnerabilities || [],
              createdAt: pollData.scan?.created_at || new Date().toISOString(),
              completedAt: pollData.scan?.completed_at || new Date().toISOString(),
            }

            navigate(`/results/${scanId}`, { state: { scan: scanResult } })
            return
          }

          if (pollData.scan?.status === 'error') {
            addLog('✗ Scan failed — an error occurred', '#FF3B3B')
            setScanError('Scan processing failed')
            setScanning(false)
            return
          }
        } catch {
          // polling error — retry
        }
      }

      addLog('✗ Scan timed out', '#FF3B3B')
      setScanError('Scan timed out after 4 minutes')
      setScanning(false)
    } catch (err) {
      addLog(`✗ Error: ${err.message}`, '#FF3B3B')
      setScanError(err.message)
      setScanning(false)
    }
  }

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════

  // ─── Scanning animation view ─────────────────

  if (scanning) {
    return (
      <>
        <Navbar />
        <div
          style={{
            minHeight: '100vh',
            background: '#000',
            paddingTop: '56px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Matrix Rain background */}
          <MatrixRain
            fontSize={18}
            color="#C8FF00"
            characters="01"
            fadeOpacity={0.06}
            speed={1.0}
          />

          {/* Content overlay */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 56px)',
              padding: '48px 24px',
            }}
          >
            {/* Title with glow */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1
                style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '28px',
                  color: '#C8FF00',
                  margin: 0,
                  textShadow: '0 0 20px rgba(200,255,0,0.4)',
                }}
              >
                Scanning your code...
              </h1>
              <p
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: '12px',
                  color: '#555',
                  margin: '8px 0 0',
                }}
              >
                Analyzing for quantum-vulnerable cryptographic patterns
              </p>
            </div>

            {/* Terminal log */}
            <div
              ref={logContainerRef}
              style={{
                width: '100%',
                maxWidth: '700px',
                height: '280px',
                background: 'rgba(8,8,8,0.92)',
                border: '1.5px solid #2a2a2a',
                borderRadius: '4px',
                padding: '16px',
                overflowY: 'auto',
                fontFamily: '"Space Mono", monospace',
                fontSize: '12px',
                lineHeight: '1.9',
                backdropFilter: 'blur(8px)',
              }}
            >
              {scanLogs.map((log) => (
                <div key={log.id} style={{ color: log.color }}>
                  {log.text}
                </div>
              ))}
              {/* Blinking cursor */}
              <span
                style={{
                  display: 'inline-block',
                  width: '7px',
                  height: '14px',
                  background: '#C8FF00',
                  animation: 'pulse-dot 1s ease-in-out infinite',
                  marginTop: '4px',
                }}
              />
            </div>

            {/* Error state */}
            {scanError && (
              <div
                style={{
                  marginTop: '24px',
                  padding: '12px 20px',
                  background: 'rgba(255,59,59,0.1)',
                  border: '1px solid rgba(255,59,59,0.3)',
                  borderRadius: '4px',
                  maxWidth: '700px',
                  width: '100%',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '12px',
                    color: '#FF3B3B',
                  }}
                >
                  {scanError}
                </span>
                <button
                  onClick={() => {
                    setScanning(false)
                    setScanError(null)
                    setScanLogs([])
                  }}
                  className="neo-btn"
                  style={{
                    marginTop: '12px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1.5px solid #2a2a2a',
                    padding: '8px 20px',
                    fontSize: '12px',
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    display: 'block',
                  }}
                >
                  ← Go back
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // ─── Main input view ─────────────────────────

  return (
    <>
      <Navbar />
      <div
        style={{
          minHeight: '100vh',
          background: '#080808',
          paddingTop: '56px',
        }}
      >
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '48px 24px',
          }}
        >
          {/* ── Heading ── */}
          <h1
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 700,
              fontSize: '32px',
              color: '#fff',
              margin: '0 0 8px',
            }}
          >
            New scan
          </h1>
          <p
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: '14px',
              color: '#555',
              margin: '0 0 36px',
            }}
          >
            Paste code, upload a file, or connect a GitHub repo
          </p>

          {/* ── Tab bar ── */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={activeTab === tab.id ? 'neo-btn' : ''}
                style={{
                  background: activeTab === tab.id ? '#C8FF00' : '#111',
                  color: activeTab === tab.id ? '#000' : '#555',
                  border: activeTab === tab.id ? '1.5px solid #000' : '1.5px solid #2a2a2a',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                  ...(activeTab !== tab.id
                    ? { boxShadow: 'none' }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.borderColor = '#C8FF00'
                    e.currentTarget.style.color = '#C8FF00'
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.borderColor = '#2a2a2a'
                    e.currentTarget.style.color = '#555'
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════════════════ */}
          {/* TAB 1: GitHub Repo                      */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'github' && (
            <div>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                style={{
                  width: '100%',
                  background: '#111',
                  border: '1.5px solid #2a2a2a',
                  color: '#fff',
                  padding: '14px 16px',
                  fontSize: '13px',
                  fontFamily: '"Space Mono", monospace',
                  borderRadius: '3px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#C8FF00')}
                onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')}
              />

              {/* Detected language pill */}
              {repoUrl.trim().length > 10 && (
                <div
                  style={{
                    marginTop: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(200,255,0,0.08)',
                    border: '1px solid rgba(200,255,0,0.2)',
                    borderRadius: '3px',
                    padding: '4px 10px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#C8FF00',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: '"Space Mono", monospace',
                      fontSize: '11px',
                      color: '#C8FF00',
                    }}
                  >
                    Detected: JavaScript / TypeScript / Python
                  </span>
                </div>
              )}

              {/* Private repo toggle */}
              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#333',
                    fontSize: '12px',
                    fontFamily: '"Space Mono", monospace',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#C8FF00')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#333')}
                >
                  Private repo? Add token {showToken ? '↑' : '↓'}
                </button>

                {showToken && (
                  <input
                    type="password"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      background: '#111',
                      border: '1.5px solid #2a2a2a',
                      color: '#fff',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontFamily: '"Space Mono", monospace',
                      borderRadius: '3px',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#C8FF00')}
                    onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')}
                  />
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* TAB 2: Upload File                      */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'upload' && (
            <div>
              {/* Drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragOver ? '#C8FF00' : '#2a2a2a'}`,
                  borderRadius: '4px',
                  background: isDragOver ? 'rgba(200,255,0,0.03)' : '#0d0d0d',
                  padding: '48px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Upload icon */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDragOver ? '#C8FF00' : '#333'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ margin: '0 auto 12px', display: 'block' }}
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>

                <div
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '13px',
                    color: isDragOver ? '#C8FF00' : '#555',
                  }}
                >
                  Drop .js, .ts, or .py files here
                </div>
                <div
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '11px',
                    color: '#333',
                    marginTop: '6px',
                  }}
                >
                  or click to browse · max 500KB per file
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {/* File list */}
              {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {uploadedFiles.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#111',
                        border: '1px solid #2a2a2a',
                        borderRadius: '3px',
                        padding: '6px 10px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '11px',
                          color: '#C8FF00',
                        }}
                      >
                        {f.name}
                      </span>
                      <span
                        style={{
                          fontFamily: '"Space Mono", monospace',
                          fontSize: '10px',
                          color: '#333',
                        }}
                      >
                        {formatSize(f.size)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile(f.id)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#555',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '0 2px',
                          lineHeight: 1,
                          transition: 'color 0.1s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#FF3B3B')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════ */}
          {/* TAB 3: Paste Code                       */}
          {/* ════════════════════════════════════════ */}
          {activeTab === 'paste' && (
            <div>
              {/* Language selector */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {['javascript', 'python'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setPasteLanguage(lang)}
                    className={pasteLanguage === lang ? 'neo-btn' : ''}
                    style={{
                      background: pasteLanguage === lang ? '#C8FF00' : 'transparent',
                      color: pasteLanguage === lang ? '#000' : '#555',
                      border: pasteLanguage === lang ? '1.5px solid #000' : '1.5px solid #2a2a2a',
                      padding: '6px 16px',
                      fontSize: '12px',
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: pasteLanguage === lang ? 700 : 500,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                      textTransform: 'capitalize',
                    }}
                    onMouseEnter={(e) => {
                      if (pasteLanguage !== lang) {
                        e.currentTarget.style.borderColor = '#C8FF00'
                        e.currentTarget.style.color = '#C8FF00'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pasteLanguage !== lang) {
                        e.currentTarget.style.borderColor = '#2a2a2a'
                        e.currentTarget.style.color = '#555'
                      }
                    }}
                  >
                    {lang === 'javascript' ? 'JavaScript' : 'Python'}
                  </button>
                ))}
              </div>

              {/* ── Load Sample Code Buttons ── */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '10px',
                    color: '#444',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginRight: '4px',
                  }}
                >
                  Load sample:
                </span>

                {/* JS Sample Button */}
                <button
                  id="load-js-sample"
                  onClick={() => {
                    setPasteLanguage('javascript')
                    setCodeContent(`// =============================================
// auth-controller.js — User Authentication
// WARNING: This file contains known vulnerabilities
// =============================================

const crypto = require('crypto');

// ❌ VULNERABILITY: MD5 is quantum-vulnerable & collision-prone
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// ❌ VULNERABILITY: SHA-1 is broken — collisions demonstrated by Google
function generateToken(userId) {
  const timestamp = Date.now().toString();
  return crypto.createHash('sha1').update(userId + timestamp).digest('hex');
}

// ❌ VULNERABILITY: DES is a 56-bit cipher — trivially breakable
function encryptSessionData(data, key) {
  const cipher = crypto.createCipher('des', key);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// ❌ VULNERABILITY: RSA-1024 is quantum-vulnerable (Shor's algorithm)
const { generateKeyPairSync } = require('crypto');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 1024,
});

// ❌ VULNERABILITY: DOM-based XSS via innerHTML
function renderUserGreeting() {
  const params = new URLSearchParams(window.location.search);
  const name = params.get('name');
  document.getElementById('greeting').innerHTML = \`Welcome back, \${name}!\`;
}

// ❌ VULNERABILITY: eval() allows arbitrary code execution
function processUserFormula(input) {
  return eval(input);
}

// ❌ VULNERABILITY: Hardcoded secret in source code
const API_SECRET = 'HARDCODED_SECRET_a1b2c3d4e5f6g7h8i9j0';

module.exports = { hashPassword, generateToken, encryptSessionData };`)
                  }}
                  style={{
                    background: '#fff',
                    color: '#000',
                    fontFamily: '"Space Mono", monospace',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '7px 14px',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0 #000',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.1s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#00FF88'
                    e.currentTarget.style.transform = 'translate(-2px, -2px)'
                    e.currentTarget.style.boxShadow = '5px 5px 0 #000'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
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
                  <span style={{ fontSize: '13px' }}>⚡</span>
                  JS Sample · XSS + Weak Crypto
                </button>

                {/* Python Sample Button */}
                <button
                  id="load-py-sample"
                  onClick={() => {
                    setPasteLanguage('python')
                    setCodeContent(`# =============================================
# crypto_utils.py — Cryptographic Utilities
# WARNING: This file contains known vulnerabilities
# =============================================

import hashlib
import hmac
from Crypto.Cipher import DES
from cryptography.hazmat.primitives.asymmetric import rsa, dsa
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

# ❌ VULNERABILITY: MD5 is quantum-vulnerable & collision-prone
def hash_password(password: str) -> str:
    return hashlib.md5(password.encode()).hexdigest()

# ❌ VULNERABILITY: SHA-1 is broken — collisions demonstrated
def generate_token(user_id: str, secret: str) -> str:
    return hashlib.sha1(f"{user_id}:{secret}".encode()).hexdigest()

# ❌ VULNERABILITY: RSA-1024 is breakable by Shor's algorithm
def generate_rsa_keypair():
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=1024,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key

# ❌ VULNERABILITY: DSA is quantum-vulnerable (discrete logarithm)
def generate_dsa_keypair():
    private_key = dsa.generate_private_key(
        key_size=1024,
        backend=default_backend()
    )
    return private_key

# ❌ VULNERABILITY: DES is a 56-bit cipher — trivially breakable
def encrypt_session(data: bytes, key: bytes) -> bytes:
    cipher = DES.new(key[:8], DES.MODE_ECB)
    padded = data + b'\\x00' * (8 - len(data) % 8)
    return cipher.encrypt(padded)

# ❌ VULNERABILITY: Hardcoded secret key
SECRET_KEY = "super_secret_key_12345_do_not_share"

# ❌ VULNERABILITY: HMAC with MD5 is quantum-vulnerable
def sign_payload(payload: str) -> str:
    return hmac.new(
        SECRET_KEY.encode(),
        payload.encode(),
        hashlib.md5
    ).hexdigest()

# ❌ VULNERABILITY: Using SHA-1 for certificate fingerprinting
def get_cert_fingerprint(cert_data: bytes) -> str:
    return hashlib.sha1(cert_data).hexdigest()

if __name__ == "__main__":
    print("Password hash:", hash_password("admin123"))
    print("Token:", generate_token("user_42", SECRET_KEY))
    priv, pub = generate_rsa_keypair()
    print("RSA-1024 key generated (INSECURE)")`)
                  }}
                  style={{
                    background: '#fff',
                    color: '#000',
                    fontFamily: '"Space Mono", monospace',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '7px 14px',
                    border: '2px solid #000',
                    boxShadow: '3px 3px 0 #000',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.1s ease',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#00FF88'
                    e.currentTarget.style.transform = 'translate(-2px, -2px)'
                    e.currentTarget.style.boxShadow = '5px 5px 0 #000'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fff'
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
                  <span style={{ fontSize: '13px' }}>⚡</span>
                  PY Sample · Quantum Vulnerable
                </button>
              </div>

              {/* Textarea */}
              <div style={{ position: 'relative' }}>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  placeholder="// Paste your code here or load a sample above..."
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    background: '#0d0d0d',
                    border: '1.5px solid #2a2a2a',
                    color: '#fff',
                    padding: '16px',
                    fontSize: '13px',
                    fontFamily: '"Space Mono", monospace',
                    borderRadius: '3px',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: '1.6',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#C8FF00')}
                  onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')}
                />
                {/* Character count */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '12px',
                    fontFamily: '"Space Mono", monospace',
                    fontSize: '10px',
                    color: '#333',
                  }}
                >
                  {codeContent.length} chars
                </span>
              </div>
            </div>
          )}

          {/* ── Scan button ── */}
          <button
            onClick={startScan}
            disabled={!canScan}
            className={canScan ? 'neo-btn' : ''}
            style={{
              width: '100%',
              marginTop: '28px',
              background: canScan ? '#C8FF00' : '#1a1a1a',
              color: canScan ? '#000' : '#333',
              border: canScan ? '1.5px solid #000' : '1.5px solid #2a2a2a',
              padding: '14px',
              fontSize: '16px',
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: canScan ? 'pointer' : 'not-allowed',
              transition: 'all 0.1s ease',
              boxShadow: canScan ? '3px 3px 0 #000' : 'none',
            }}
          >
            Scan for vulnerabilities →
          </button>
        </div>
      </div>
    </>
  )
}
