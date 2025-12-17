import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard({ theme, toggleTheme }) {
  const [people, setPeople] = useState([])
  const handleEditChange = (e) => setEditingData({ ...editingData, [e.target.name]: e.target.value })
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    social_facebook: '',
    social_instagram: '',
  })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingData, setEditingData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    social_facebook: '',
    social_instagram: '',
  })

  // Fetch people for the logged-in user
  const fetchPeople = async (userId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', userId)
      .order('name')

    if (error) {
      console.error(error)
      setStatus('Could not load people. Please retry.')
    } else {
      setPeople(data || [])
      setStatus('')
    }
    setLoading(false)
  }

  useEffect(() => {
    const loadUserAndPeople = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        setStatus('Not authenticated. Please log in again.')
        return
      }
      setCurrentUser(userData.user)
      await fetchPeople(userData.user.id)
    }

    loadUserAndPeople()
  }, [])

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

  const addPerson = async () => {
    if (!formData.name.trim()) {
      setStatus('Name is required.')
      return
    }
    if (!currentUser) {
      setStatus('Not authenticated. Please log in again.')
      return
    }
    setStatus('Saving...')
    const { error } = await supabase.from('people').insert([{ ...formData, user_id: currentUser.id }])
    if (error) {
      console.error(error)
      setStatus(error.message || 'Could not add person. Please try again.')
      return
    }
    setFormData({
      name: '',
      contact: '',
      email: '',
      address: '',
      social_facebook: '',
      social_instagram: '',
    })
    const { data, error: refreshError } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name')
    if (refreshError) {
      console.error(refreshError)
      setStatus('Saved, but list did not refresh. Reload the page.')
    } else {
      setPeople(data || [])
      setStatus('Person added!')
    }
  }

  const startEditing = (person) => {
    setEditingId(person.id)
    setEditingData({
      name: person.name || '',
      contact: person.contact || '',
      email: person.email || '',
      address: person.address || '',
      social_facebook: person.social_facebook || '',
      social_instagram: person.social_instagram || '',
    })
    setStatus('Editing person...')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingData({
      name: '',
      contact: '',
      email: '',
      address: '',
      social_facebook: '',
      social_instagram: '',
    })
    setStatus('')
  }

  const saveEdit = async () => {
    if (!editingId) return
    if (!editingData.name.trim()) {
      setStatus('Name is required.')
      return
    }
    if (!currentUser) {
      setStatus('Not authenticated. Please log in again.')
      return
    }
    setStatus('Saving changes...')
    const { error } = await supabase
      .from('people')
      .update({ ...editingData })
      .eq('id', editingId)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error(error)
      setStatus(error.message || 'Could not update. Please try again.')
      return
    }

    const { data, error: refreshError } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name')

    if (refreshError) {
      console.error(refreshError)
      setStatus('Updated, but list did not refresh. Reload the page.')
    } else {
      setPeople(data || [])
      setStatus('Person updated!')
    }

    cancelEditing()
  }

  const deletePerson = async (id) => {
    if (!currentUser) {
      setStatus('Not authenticated. Please log in again.')
      return
    }
    const confirmed = window.confirm('Are you sure you want to delete this person?')
    if (!confirmed) return
    setStatus('Deleting...')
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error(error)
      setStatus(error.message || 'Could not delete. Please try again.')
      return
    }

    if (editingId === id) cancelEditing()

    const { data, error: refreshError } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name')

    if (refreshError) {
      console.error(refreshError)
      setStatus('Deleted, but list did not refresh. Reload the page.')
    } else {
      setPeople(data || [])
      setStatus('Person deleted.')
    }
  }

  // Derived filtered list for search
  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return people
    return people.filter((p) => {
      const haystack = [
        p.name,
        p.contact,
        p.email,
        p.address,
        p.social_facebook,
        p.social_instagram,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [people, search])

  // Highlight helper: wrap matching term with <mark>
  const highlight = (text) => {
    const term = search.trim()
    if (!term) return text
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return String(text || '').split(regex).map((part, idx) =>
      regex.test(part) ? <mark key={idx}>{part}</mark> : part
    )
  }

  // Lock Vault: sign out and redirect to login
  const handleLockVault = async () => {
    await supabase.auth.signOut()
    // Go to the app root so App renders the Login screen; avoids 404 since we do not define /login route.
    window.location.assign('/')
  }

  return (
    <div className={`dashboard ${theme}`}>
      {/* Header & Theme Toggle */}
      <header className="dashboard-header">
        <h1>Mila<span className="brand-accent">Vault</span></h1>
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
        {status && <p className="status-text">{status}</p>}
      </section>

      {/* Search & People Table */}
      <section className="people-section">
        <div className="people-header">
          <h2>People</h2>
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, number, email, address, socials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="people-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Home Address</th>
                <th>Facebook</th>
                <th>Instagram</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="muted">Loading...</td></tr>
              ) : filteredPeople.length === 0 ? (
                <tr><td colSpan="7" className="muted">No people found.</td></tr>
              ) : (
                filteredPeople.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {editingId === p.id ? (
                        <input name="name" value={editingData.name} onChange={handleEditChange} />
                      ) : highlight(p.name)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <input name="contact" value={editingData.contact} onChange={handleEditChange} />
                      ) : highlight(p.contact)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <input name="email" value={editingData.email} onChange={handleEditChange} />
                      ) : highlight(p.email)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <input name="address" value={editingData.address} onChange={handleEditChange} />
                      ) : highlight(p.address)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <input name="social_facebook" value={editingData.social_facebook} onChange={handleEditChange} />
                      ) : highlight(p.social_facebook)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <input name="social_instagram" value={editingData.social_instagram} onChange={handleEditChange} />
                      ) : highlight(p.social_instagram)}
                    </td>
                    <td>
                      {editingId === p.id ? (
                        <div className="action-buttons">
                          <button className="action-btn save" onClick={saveEdit}>Save</button>
                          <button className="action-btn cancel" onClick={cancelEditing}>Cancel</button>
                          <button className="action-btn delete" onClick={() => deletePerson(p.id)}>Delete</button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="action-btn edit" onClick={() => startEditing(p)}>Edit</button>
                          <button className="action-btn delete" onClick={() => deletePerson(p.id)}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
