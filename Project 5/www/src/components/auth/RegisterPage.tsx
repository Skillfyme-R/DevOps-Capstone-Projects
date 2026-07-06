import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/catalog')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0E1A' }}>
      <div style={{ width: 360, padding: '2rem', background: '#13182a', borderRadius: 12, color: '#fff' }}>
        <h1 style={{ marginBottom: '1.5rem', color: '#7C3AED' }}>Create Account</h1>
        <form onSubmit={handleSubmit}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: 8, border: '1px solid #7C3AED', background: '#0A0E1A', color: '#fff', boxSizing: 'border-box' }} />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', borderRadius: 8, border: '1px solid #7C3AED', background: '#0A0E1A', color: '#fff', boxSizing: 'border-box' }} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password"
            style={{ width: '100%', padding: '0.75rem', marginBottom: '1.5rem', borderRadius: 8, border: '1px solid #7C3AED', background: '#0A0E1A', color: '#fff', boxSizing: 'border-box' }} />
          <button type="submit" style={{ width: '100%', padding: '0.75rem', background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Create Account
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', color: '#aaa' }}>
          Already have an account? <Link to="/login" style={{ color: '#F97316' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
