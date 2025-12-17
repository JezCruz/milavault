import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export default function Dashboard() {
  const [people, setPeople] = useState([])
  const [name, setName] = useState('')

  // Fetch people from Supabase
  const fetchPeople = async () => {
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .order('name')
    if (error) console.error(error)
    else setPeople(data)
  }

  // Add new person
  const addPerson = async () => {
    if (!name) return
    const { error } = await supabase.from('people').insert([{ name }])
    if (error) console.error(error)
    else {
      setName('')
      fetchPeople()
    }
  }

  useEffect(() => {
    fetchPeople()
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>People List</h2>
      <input
        type="text"
        placeholder="Add Name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ padding: 8, width: 250 }}
      />
      <button onClick={addPerson} style={{ padding: '8px 20px', marginLeft: 10 }}>
        Add
      </button>
      <ul>
        {people.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  )
}