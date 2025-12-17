import { supabase } from './supabaseClient'
import { useState } from 'react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Login to MilaVault</h2>
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ padding: 8, width: '300px', marginBottom: 10 }}
      />
      <br />
      <button onClick={handleLogin} style={{ padding: '8px 20px' }}>
        Send Magic Link
      </button>
      <p>{message}</p>
    </div>
  )
}
