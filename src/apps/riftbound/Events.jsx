import React from 'react';

// Events Zack has attended, read from the sheet's Events tab. View-only.
export default function Events({ resource }) {
  const events = resource.data?.events ?? [];
  const formatDate = date => date ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }) : 'Date not set';
  return <main className="rb-events rb-book">
    <div className="rb-book-title"><h2>Zack’s Event History</h2></div>
    {resource.loading ? <p role="status">Loading events…</p>
      : resource.error ? <p role="alert">Event history is unavailable right now.</p>
        : !events.length ? <div className="rb-state"><h3>No events recorded yet</h3></div>
          : <>
            <p>{events.length} {events.length === 1 ? 'event' : 'events'} attended.</p>
            <ul>{events.map((event, index) => <li key={`${event.date}-${event.name}-${index}`}><div>
              <h3>{event.name}</h3>
              <time dateTime={event.date ?? undefined}>{formatDate(event.date)}</time>
              <p>{[event.location, event.format].filter(Boolean).join(' · ') || 'Location not recorded'}</p>
              {(event.deck || event.result) && <p><b>{event.result || 'Result not recorded'}</b>{event.deck && ` with ${event.deck}`}</p>}
              {event.notes && <p className="rb-event-notes">{event.notes}</p>}
            </div></li>)}</ul>
          </>}
  </main>;
}
