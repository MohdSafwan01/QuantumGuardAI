import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#080808',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
        }}
      >
        <span
          style={{
            display: 'block',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: '#C8FF00',
            animation: 'pulse-dot 1.8s ease-in-out infinite',
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
          QuantumGuard
        </span>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return children
}
