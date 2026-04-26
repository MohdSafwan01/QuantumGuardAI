import { useEffect, useRef } from 'react'

/**
 * MatrixRain — Canvas-based falling binary rain effect.
 * Adapted for QuantumGuard's acid-green design system.
 *
 * Props:
 *   fontSize    — character size (default 18)
 *   color       — rain color (default acid green #C8FF00)
 *   characters  — characters to rain (default "01")
 *   fadeOpacity — trail fade speed (default 0.06)
 *   speed       — fall speed multiplier (default 1)
 */
export default function MatrixRain({
  fontSize = 18,
  color = '#C8FF00',
  characters = '01',
  fadeOpacity = 0.06,
  speed = 1,
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement

    const resizeCanvas = () => {
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      } else {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const chars = characters.split('')
    const drops = []
    const columnCount = Math.floor(canvas.width / fontSize)

    for (let i = 0; i < columnCount; i++) {
      drops[i] = Math.random() * -100
    }

    const draw = () => {
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = color
      ctx.font = `${fontSize}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(char, i * fontSize, drops[i] * fontSize)

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i] += speed
      }
    }

    const interval = setInterval(draw, 33 / speed)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [fontSize, color, characters, fadeOpacity, speed])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}
