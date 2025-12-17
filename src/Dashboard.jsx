import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function Dashboard({ theme, toggleTheme }) {
  const [people, setPeople] = useState([])
  const [formData, setFormData] = useState({
    name: '', contact: '', email: '', address: '', social_facebook: '', social_instagram: ''
  })
  const navigate = useNavigate()

  // Fetch people for the logged-in user
  useEffect(() => {
    const fetchPeople = async () => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('name')

      if (error) console.error(error)
      else setPeople(data)
    }

    fetchPeople()
  }, [])

  const handleChange = e => setFormData({ ...formData, [e.target.name]: e.target.value })

  const addPerson = async () => {
    const { error } = await supabase.from('people').insert([formData])
    if (!error) {
      setFormData({
        name: '', contact: '', email: '', address: '', social_facebook: '', social_instagram: ''
      })
      const { data } = await supabase.from('people').select('*').order('name')
      setPeople(data)
    }
  }

  // Lock Vault: sign out and redirect to login
  const handleLockVault = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className={`dashboard ${theme}`}>
      {/* Header & Theme Toggle */}
      <header className="dashboard-header">
        <h1>MilaVault</h1>
        <div className="header-buttons">
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button className="lock-btn" onClick={handleLockVault}>
            🔒 Lock Vault
          </button>
        </div>
      </header>

      {/* Add Person Form */}
      <section className="form-section">
        <h2>Add a Person</h2>
        <div className="form-grid">
          <input name="name" placeholder="Name" value={formData.name} onChange={handleChange} />
          <input name="contact" placeholder="Contact" value={formData.contact} onChange={handleChange} />
          <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} />
          <input name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
          <input name="social_facebook" placeholder="Facebook" value={formData.social_facebook} onChange={handleChange} />
          <input name="social_instagram" placeholder="Instagram" value={formData.social_instagram} onChange={handleChange} />
        </div>
        <button className="add-btn" onClick={addPerson}>Add Person</button>
      </section>

      {/* People List */}
      <section className="people-list">
        {people.map(p => (
          <div className="person-card" key={p.id}>
            <h3>{p.name}</h3>
            <p>📞 {p.contact}</p>
            <p>✉️ {p.email}</p>
            <p>🏠 {p.address}</p>
            <p>🔗 FB: {p.social_facebook}</p>
            <p>🔗 IG: {p.social_instagram}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
