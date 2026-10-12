import React, { useState } from 'react';
import useLocalRecords from './useLocalRecords';
import { validateEvents } from './events.js';
import LocalBackup from './LocalBackup';

export default function Events() {
  const { records, save, error, unavailable } = useLocalRecords('riftbound-events-v1', validateEvents);
  const [editing, setEditing] = useState(null);
  return <main className="rb-events rb-book">
    <div className="rb-book-title"><h2>Your Event Journal</h2></div>
    <p>Plan game nights and tournaments. Saved in this browser; these are your own entries, not an official event feed. Times use your local timezone.</p>
    {error && <p role="alert">{error}</p>}
    <LocalBackup kind="events" records={records} save={save} unavailable={unavailable} />
    <form key={editing?.id ?? 'new'} onSubmit={event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fields = new FormData(form);
      const item = { id: editing?.id ?? crypto.randomUUID(), name: fields.get('name').trim(), location: fields.get('location').trim(), date: fields.get('date') };
      if (!item.name) return;
      if (save(editing ? records.map(record => record.id === editing.id ? item : record) : [...records, item])) { setEditing(null); form.reset(); }
    }}>
      <label>Event name<input name="name" required maxLength={100} defaultValue={editing?.name ?? ''} /></label>
      <label>When<input name="date" type="datetime-local" required defaultValue={editing?.date ?? ''} /></label>
      <label>Location<input name="location" maxLength={200} defaultValue={editing?.location ?? ''} placeholder="Store, venue, or online" /></label>
      <button disabled={!editing && records.length >= 200}>{editing ? 'Save changes' : 'Add event'}</button>
      {editing && <button type="button" onClick={() => setEditing(null)}>Cancel edit</button>}
    </form>
    {!records.length && <div className="rb-state"><h3>Your next adventure starts here</h3><p>Add a game night or tournament to your journal.</p></div>}
    <ul>{[...records].sort((a, b) => a.date.localeCompare(b.date)).map(event => <li key={event.id}><div><h3>{event.name}</h3><time dateTime={event.date}>{new Date(event.date).toLocaleString()}</time><p>{event.location || 'Location not set'}</p></div><button onClick={() => setEditing(event)}>Edit</button><button onClick={() => { if (save(records.filter(record => record.id !== event.id)) && editing?.id === event.id) setEditing(null); }}>Remove</button></li>)}</ul>
  </main>;
}
