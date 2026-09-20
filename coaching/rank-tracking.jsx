const API_BASE_URL = 'http://localhost:8000'; // Change this for production

function RankTracker() {
  const [mrPlayers, setMrPlayers] = React.useState({});
  const [owPlayers, setOwPlayers] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  
  // Form State
  const [game, setGame] = React.useState('marvel-rivals');
  const [query, setQuery] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  React.useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const [mrRes, owRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/marvel-rivals/players`).catch(() => null),
          fetch(`${API_BASE_URL}/api/overwatch/players`).catch(() => null)
        ]);
        if (mrRes && mrRes.ok && isMounted) setMrPlayers(await mrRes.json());
        if (owRes && owRes.ok && isMounted) setOwPlayers(await owRes.json());
      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setSubmitting(true);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/${game}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setQuery('');
        
        const [mrRes, owRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/marvel-rivals/players`).catch(() => null),
          fetch(`${API_BASE_URL}/api/overwatch/players`).catch(() => null)
        ]);
        if (mrRes && mrRes.ok) setMrPlayers(await mrRes.json());
        if (owRes && owRes.ok) setOwPlayers(await owRes.json());
      } else {
        setMessage({ type: 'error', text: data.detail || 'Failed to add student.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Make sure the API is running.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p style={{ color: 'black', fontFamily: "'Aeonik Pro', sans-serif", fontWeight: 'bold' }}>LOADING DATA...</p>;

  return (
    <main style={{ backgroundColor: '#dceeff', color: 'black', fontFamily: "'Aeonik Pro', sans-serif", padding: '2rem', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3rem', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 800, textTransform: 'uppercase', fontFamily: "'Lateral', sans-serif", lineHeight: 0.8, margin: 0 }}>
          Coaching Rank Tracker
        </h1>
        <p style={{ color: 'black', fontWeight: 500, fontSize: '15px', marginTop: '1rem' }}>Live student ranks for Marvel Rivals & Overwatch 2</p>
      </header>
      
      <section style={{ marginBottom: '4rem', padding: '2rem', border: '1px solid black', borderRadius: '20px', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginTop: 0 }}>Add Student</h2>
        <form onSubmit={handleAddStudent} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <select value={game} onChange={e => setGame(e.target.value)} style={{ padding: '12px 16px', backgroundColor: 'white', border: '1px solid black', borderRadius: '1600px', color: 'black', fontWeight: 700, outline: 'none' }}>
            <option value="marvel-rivals">Marvel Rivals</option>
            <option value="overwatch">Overwatch 2</option>
          </select>
          <input 
            type="text" 
            placeholder={game === 'marvel-rivals' ? 'Username or UID' : 'BattleTag (Name#1234)'} 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            style={{ padding: '12px 16px', flex: 1, minWidth: '250px', backgroundColor: 'white', border: '1px solid black', borderRadius: '1600px', color: 'black', fontWeight: 500, outline: 'none' }}
          />
          <button type="submit" disabled={submitting} style={{ padding: '12px 24px', cursor: 'pointer', backgroundColor: 'black', border: '1px solid black', borderRadius: '1600px', color: 'white', fontWeight: 700, fontSize: '14px', letterSpacing: '0.032em' }}>
            {submitting ? 'ADDING...' : 'TRACK'}
          </button>
        </form>
        {message && (
          <p style={{ marginTop: '2rem', padding: '1rem', borderRadius: '20px', border: '1px solid black', fontWeight: 700, color: message.type === 'error' ? 'white' : 'black', backgroundColor: message.type === 'error' ? '#fb4903' : '#55db9c' }}>
            {message.text}
          </p>
        )}
      </section>

      <section style={{ marginBottom: '4rem' }}>
        <h2 style={{ fontSize: '30px', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>Marvel Rivals</h2>
        {Object.keys(mrPlayers).length === 0 ? (
          <p style={{ color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>No Marvel Rivals players tracked yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(mrPlayers).map(([q, data]) => (
              <div key={q} style={{ display: 'flex', padding: '1.5rem', border: '1px solid black', borderRadius: '20px', backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '24px', fontWeight: 700 }}>{data.name}</strong> 
                <span style={{ color: 'black', fontWeight: 700, backgroundColor: '#55db9c', border: '1px solid black', borderRadius: '1600px', padding: '4px 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.032em' }}>
                  {data.last_tier} ({data.last_score} SR)
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '30px', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>Overwatch 2</h2>
        {Object.keys(owPlayers).length === 0 ? (
          <p style={{ color: 'rgba(0,0,0,0.5)', fontWeight: 500 }}>No Overwatch 2 players tracked yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(owPlayers).map(([q, data]) => (
              <div key={q} style={{ border: '1px solid black', borderRadius: '20px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid black' }}>
                  <strong style={{ fontSize: '24px', fontWeight: 700 }}>{data.name}</strong>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#e9ccff' }}>
                  {data.ranks && Object.keys(data.ranks).length > 0 ? (
                    Object.entries(data.ranks).map(([role, rankData]) => (
                      <div key={role} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontWeight: 500 }}>
                        <span style={{ textTransform: 'capitalize' }}>{role}</span>
                        <strong style={{ backgroundColor: 'white', border: '1px solid black', borderRadius: '1600px', padding: '2px 8px', fontSize: '12px' }}>
                          {rankData.division.charAt(0).toUpperCase() + rankData.division.slice(1)} {rankData.tier}
                        </strong>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: 'black', fontWeight: 700, backgroundColor: '#cccccc', border: '1px solid black', borderRadius: '1600px', padding: '4px 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.032em', display: 'inline-block' }}>
                      Unranked
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<RankTracker />);
