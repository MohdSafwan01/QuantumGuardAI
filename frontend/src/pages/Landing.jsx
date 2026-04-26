import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion'
import HeroScene from '../components/HeroScene'

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = '', duration = 2 }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate(v) {
        setValue(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [isInView, target, duration])

  return (
    <span ref={ref}>
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ═══════════════════════════════════════════
   FLOATING CODE TAGS DATA
   ═══════════════════════════════════════════ */
const floatingTags = [
  {
    label: 'md5() · CRITICAL',
    color: '#FF3B3B',
    bg: 'rgba(255,59,59,0.12)',
    top: '14%',
    left: '8%',
    delay: '0s',
  },
  {
    label: 'RSA-1024 · HIGH',
    color: '#FF9500',
    bg: 'rgba(255,149,0,0.12)',
    top: '32%',
    left: '62%',
    delay: '0.6s',
  },
  {
    label: 'eval() · MEDIUM',
    color: '#FFE500',
    bg: 'rgba(255,229,0,0.12)',
    top: '58%',
    left: '18%',
    delay: '1.2s',
  },
  {
    label: '→ SHA3-256',
    color: '#C8FF00',
    bg: 'rgba(200,255,0,0.10)',
    top: '72%',
    left: '55%',
    delay: '0.9s',
  },
  {
    label: '→ CRYSTALS-Kyber',
    color: '#C8FF00',
    bg: 'rgba(200,255,0,0.10)',
    top: '45%',
    left: '38%',
    delay: '1.8s',
  },
]

/* ═══════════════════════════════════════════
   FEATURE CARDS DATA
   ═══════════════════════════════════════════ */
const features = [
  {
    title: 'Quantum-Safe Scanner',
    body: 'Detects RSA, ECC, MD5, SHA1 and all NIST-flagged quantum-vulnerable patterns across your entire codebase.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="1.5">
        <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7l-9-5z" />
      </svg>
    ),
    accent: false,
  },
  {
    title: 'AI-Powered Fixes',
    body: 'LLaMA 3.3 70B suggests quantum-safe replacements: CRYSTALS-Kyber, Dilithium, SPHINCS+ with code examples.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    accent: true,
  },
  {
    title: 'Multi-Language',
    body: 'Deep AST analysis for JavaScript, TypeScript and Python. Context-aware — understands how crypto flows across files.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="1.5">
        <path d="M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16" />
      </svg>
    ),
    accent: false,
  },
]

/* ═══════════════════════════════════════════
   STEPS DATA
   ═══════════════════════════════════════════ */
const steps = [
  {
    num: '01',
    title: 'Input your code',
    desc: 'GitHub repo URL, file upload, or paste a code snippet directly into the scanner.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    ),
    tag: 'GitHub · Upload · Snippet',
    tagAccent: false,
  },
  {
    num: '02',
    title: 'Smart scanning',
    desc: '3-layer pipeline: regex filter → deep AST scan → AI-powered contextual analysis.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>
    ),
    tag: 'Regex → AST → AI',
    tagAccent: false,
  },
  {
    num: '03',
    title: 'Fix it',
    desc: 'Severity-ranked findings with quantum-safe replacement suggestions and ready-to-use code.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C8FF00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 7v6c0 5.25 3.75 10.15 9 11.25C17.25 23.15 21 18.25 21 13V7l-9-5z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    tag: 'NIST PQC Standards',
    tagAccent: true,
  },
]

/* ═══════════════════════════════════════════
   FRAMER MOTION VARIANTS
   ═══════════════════════════════════════════ */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: 'easeOut' },
  }),
}

const slideIn = {
  hidden: { opacity: 0, x: -50 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.2, duration: 0.5, ease: 'easeOut' },
  }),
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function Landing() {
  const { scrollY } = useScroll()
  const navBg = useTransform(scrollY, [0, 80], ['rgba(8,8,8,0)', 'rgba(8,8,8,0.85)'])
  const navBlur = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(12px)'])

  return (
    <div className="min-h-screen bg-void font-grotesk text-white">
      {/* ── NAVBAR ── */}
      <motion.nav
        style={{ backgroundColor: navBg, backdropFilter: navBlur }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-surface"
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-6 py-4">
          <Link to="/" className="font-mono text-lg font-bold text-acid tracking-wide">
            QuantumGuard
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted hover:text-white transition-colors duration-200">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-white transition-colors duration-200">
              How it works
            </a>
            <a href="#" className="text-sm text-muted hover:text-white transition-colors duration-200">
              Docs
            </a>
          </div>

          <Link
            to="/auth"
            className="neo-btn bg-acid text-black px-5 py-2 text-sm"
          >
            Try it free
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO ── */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        {/* Left text */}
        <div className="relative z-10 w-full px-6 pt-24 md:w-1/2 md:pl-20 lg:pl-20">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <span className="block h-px w-5 bg-acid" />
            <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-acid uppercase">
              Quantum-Era Security
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-grotesk text-4xl font-bold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-[64px]"
          >
            Your code won't survive{' '}
            <span className="text-acid">the quantum</span> era.
            <br />
            Fix it now.
          </h1>

          {/* Scanning pill */}
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-[#0f0f0f] px-4 py-1.5">
            <span
              className="block h-2 w-2 rounded-full bg-safe"
              style={{ animation: 'pulse-dot 1.8s ease-in-out infinite' }}
            />
            <span className="font-mono text-[11px] text-muted">scanning repo...</span>
          </div>

          {/* Subtext */}
          <p className="mt-5 max-w-[380px] text-[15px] leading-[1.7] text-muted">
            QuantumGuard detects cryptographic vulnerabilities before quantum computers make them exploitable.
          </p>

          {/* CTA */}
          <div className="mt-8">
            <Link
              to="/auth"
              className="neo-btn bg-acid text-black px-7 py-3 text-[15px]"
            >
              Try QuantumGuard AI →
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-10 flex gap-8 border-t border-surface pt-8">
            {[
              { target: 2847, suffix: '+', label: 'Vulns detected' },
              { target: 941, suffix: '+', label: 'Repos scanned' },
              { target: 340, suffix: 'ms', label: 'Avg scan time' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-grotesk text-[22px] font-bold text-white">
                  <AnimatedCounter target={stat.target} suffix="" duration={2.2} />
                  <span className="text-acid">{stat.suffix}</span>
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#444]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — 3D scene */}
        <div className="absolute inset-0 opacity-30 md:opacity-100" style={{ left: '50%' }}>
          <HeroScene />

          {/* Floating code tags */}
          {floatingTags.map((tag) => (
            <div
              key={tag.label}
              className="pointer-events-none absolute font-mono text-[11px] rounded px-3 py-1 border"
              style={{
                top: tag.top,
                left: tag.left,
                color: tag.color,
                background: tag.bg,
                borderColor: tag.color + '33',
                animation: `float 3.5s ease-in-out infinite`,
                animationDelay: tag.delay,
              }}
            >
              {tag.label}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative px-6 py-28">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-14">
            <h2 className="font-grotesk text-[36px] font-bold text-white">Why QuantumGuard?</h2>
            <div className="mt-3 h-[3px] w-[60px] bg-acid" />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className={`neo-card p-7 ${
                  f.accent ? 'bg-acid text-black' : 'bg-base text-white'
                }`}
              >
                <div className="mb-5">{f.icon}</div>
                <h3 className="font-grotesk text-lg font-bold mb-2">{f.title}</h3>
                <p
                  className={`text-[13px] leading-[1.7] ${
                    f.accent ? 'text-black/70' : 'text-muted'
                  }`}
                >
                  {f.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative border-t border-surface" style={{ padding: '120px 80px' }}>
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-14">
            <h2 className="font-grotesk text-[36px] font-bold text-white">
              Three steps to quantum safety
            </h2>
            <div className="mt-3 h-[3px] w-[60px] bg-acid" />
          </div>

          <div className="grid md:grid-cols-3" style={{ gap: '2px' }}>
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="relative flex flex-col"
                style={{
                  background: '#0d0d0d',
                  border: '1.5px solid #2a2a2a',
                  boxShadow: '3px 3px 0 #1a1a1a',
                  padding: '40px 32px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  borderRight: i < 2 ? '1px dashed #2a2a2a' : '1.5px solid #2a2a2a',
                }}
                whileHover={{
                  borderColor: '#C8FF00',
                  boxShadow: '3px 3px 0 #C8FF00',
                }}
              >
                {/* Step number badge */}
                <span
                  className="absolute font-mono text-xs font-bold"
                  style={{
                    top: '-16px',
                    left: '32px',
                    background: '#C8FF00',
                    color: '#000',
                    padding: '4px 10px',
                    border: '1.5px solid #000',
                    boxShadow: '2px 2px 0 #000',
                    borderRadius: '2px',
                  }}
                >
                  {s.num}
                </span>

                {/* Icon */}
                <div className="mb-4">{s.icon}</div>

                {/* Title */}
                <h3 className="font-grotesk text-[20px] font-semibold text-white mt-4">
                  {s.title}
                </h3>

                {/* Description */}
                <p className="text-[14px] leading-[1.7] text-muted mt-2 flex-1">
                  {s.desc}
                </p>

                {/* Bottom tag */}
                <div className="mt-6">
                  <span
                    className="font-mono text-[10px] inline-block"
                    style={{
                      background: s.tagAccent ? '#C8FF00' : '#1a1a1a',
                      color: s.tagAccent ? '#000' : '#555',
                      padding: '3px 8px',
                      border: '1px solid #2a2a2a',
                      borderRadius: '2px',
                    }}
                  >
                    {s.tag}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-surface bg-void px-6 py-8">
        <div className="mx-auto flex max-w-[1100px] flex-col items-center justify-between gap-4 md:flex-row">
          <span className="font-mono text-sm font-bold text-acid">QuantumGuard AI</span>
          <span className="font-grotesk text-xs text-[#333]">
            Built for the post-quantum era
          </span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  )
}
