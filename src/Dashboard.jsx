import { Fragment, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const DRAFT_STORAGE_KEY = 'milavault_notes_drafts'
const EDIT_DRAFT_STORAGE_KEY = 'milavault_edit_drafts'

export default function Dashboard({ theme, toggleTheme }) {
  const [people, setPeople] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    social_facebook: '',
    social_instagram: '',
    notes: '',
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
    notes: '',
  })
  const [expandedNotesId, setExpandedNotesId] = useState(null)
  const [notesDrafts, setNotesDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (err) {
      console.error('Failed to load note drafts', err)
      return {}
    }
  })
  const [editDrafts, setEditDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem(EDIT_DRAFT_STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch (err) {
      console.error('Failed to load edit drafts', err)
      return {}
    }
  })

  const persistDrafts = (next) => {
    setNotesDrafts(next)
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next))
    } catch (err) {
      console.error('Failed to persist note drafts', err)
    }
  }

  const persistEditDrafts = (updater) => {
    setEditDrafts((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(EDIT_DRAFT_STORAGE_KEY, JSON.stringify(next))
      } catch (err) {
        console.error('Failed to persist edit drafts', err)
      }
      return next
    })
  }

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

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditingData((prev) => {
      const next = { ...prev, [name]: value }
      if (editingId) {
        persistEditDrafts((drafts) => ({ ...drafts, [editingId]: next }))
      }
      return next
    })
  }

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
      notes: '',
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

  const getEditDraft = (person) =>
    editDrafts[person.id] || {
      name: person.name || '',
      contact: person.contact || '',
      email: person.email || '',
      address: person.address || '',
      social_facebook: person.social_facebook || '',
      social_instagram: person.social_instagram || '',
      notes: person.notes || '',
    }

  const autoSaveCurrentEdit = async () => {
    if (!editingId || !currentUser) return true
    const payload = editDrafts[editingId] || editingData
    if (!payload.name.trim()) {
      setStatus('Name is required before autosaving. Draft kept locally.')
      return false
    }
    setStatus('Autosaving...')
    const { error } = await supabase
      .from('people')
      .update({ ...payload })
      .eq('id', editingId)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error(error)
      setStatus(error.message || 'Could not autosave. Please retry.')
      return false
    }

    const { data, error: refreshError } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('name')

    if (refreshError) {
      console.error(refreshError)
      setStatus('Autosaved, but list did not refresh. Reload the page.')
    } else {
      setPeople(data || [])
      setStatus('Changes autosaved.')
    }

    persistEditDrafts((drafts) => {
      const next = { ...drafts }
      delete next[editingId]
      return next
    })

    setEditingId(null)
    setEditingData({
      name: '',
      contact: '',
      email: '',
      address: '',
      social_facebook: '',
      social_instagram: '',
      notes: '',
    })
    return true
  }

  const startEditing = async (person) => {
    if (editingId && editingId !== person.id) {
      const ok = await autoSaveCurrentEdit()
      if (!ok) return
    }
    setEditingId(person.id)
    setEditingData({ ...getEditDraft(person), notes: getNoteDraft(person) })
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
      notes: '',
    })
    if (editingId) {
      persistEditDrafts((drafts) => {
        const next = { ...drafts }
        delete next[editingId]
        return next
      })
    }
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

    if (notesDrafts[editingId]) {
      const nextDrafts = { ...notesDrafts }
      delete nextDrafts[editingId]
      persistDrafts(nextDrafts)
    }

    persistEditDrafts((drafts) => {
      const next = { ...drafts }
      delete next[editingId]
      return next
    })

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
    if (notesDrafts[id]) {
      const nextDrafts = { ...notesDrafts }
      delete nextDrafts[id]
      persistDrafts(nextDrafts)
    }

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

  const toggleNotes = (person) => {
    const isOpen = expandedNotesId === person.id
    if (!isOpen && notesDrafts[person.id] === undefined) {
      persistDrafts({ ...notesDrafts, [person.id]: person.notes ?? '' })
    }
    setExpandedNotesId(isOpen ? null : person.id)
  }

  const handleNoteDraftChange = (personId, value) => {
    persistDrafts({ ...notesDrafts, [personId]: value })
  }

  const saveNote = async (person) => {
    if (!currentUser) {
      setStatus('Not authenticated. Please log in again.')
      return
    }
    const noteValue = getNoteDraft(person)
    setStatus('Saving note...')
    const { error } = await supabase
      .from('people')
      .update({ notes: noteValue })
      .eq('id', person.id)
      .eq('user_id', currentUser.id)

    if (error) {
      console.error(error)
      setStatus(error.message || 'Could not save note. Please try again.')
      return
    }

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
      setStatus('Note saved!')
    }

    const nextDrafts = { ...notesDrafts }
    delete nextDrafts[person.id]
    persistDrafts(nextDrafts)
    setExpandedNotesId(null)
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
        p.notes,
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

  const getNoteDraft = (person) => notesDrafts[person.id] ?? person.notes ?? ''

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
          <input name="address" placeholder="Home Address" value={formData.address} onChange={handleChange} />
          <input name="social_facebook" placeholder="Facebook" value={formData.social_facebook} onChange={handleChange} />
          <input name="social_instagram" placeholder="Instagram" value={formData.social_instagram} onChange={handleChange} />
          <textarea
            name="notes"
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
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
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="muted">Loading...</td></tr>
              ) : filteredPeople.length === 0 ? (
                <tr><td colSpan="8" className="muted">No people found.</td></tr>
              ) : (
                filteredPeople.map((p) => (
                  <Fragment key={p.id}>
                  <tr>
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
                      <div className="notes-snippet">
                        <div className="note-text">{highlight((getNoteDraft(p) || '').slice(0, 10))}{(getNoteDraft(p) || '').length > 10 ? '…' : ''}</div>
                        <button className="action-btn note" onClick={() => toggleNotes(p)}>
                          {expandedNotesId === p.id ? 'Hide notes' : 'View full notes'}
                        </button>
                      </div>
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
                  {expandedNotesId === p.id && (
                    <tr className="notes-row">
                      <td colSpan="8">
                        <div className="notes-panel">
                          <textarea
                            value={getNoteDraft(p)}
                            onChange={(e) => handleNoteDraftChange(p.id, e.target.value)}
                            rows={6}
                          />
                          <div className="action-buttons">
                            <button className="action-btn save" onClick={() => saveNote(p)}>Save note</button>
                            <button className="action-btn cancel" onClick={() => setExpandedNotesId(null)}>Close</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
