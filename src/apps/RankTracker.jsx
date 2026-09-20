import React, { useState, useEffect } from 'react';
import { LineChart } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export default function RankTracker() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const [mrPlayers, setMrPlayers] = useState({});
  const [owPlayers, setOwPlayers] = useState({});
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState('checking');
  
  // Form State
  const [game, setGame] = useState('marvel-rivals');
  const [query, setQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const [mrRes, owRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/marvel-rivals/players`).catch(() => null),
          fetch(`${API_BASE_URL}/api/overwatch/players`).catch(() => null)
        ]);
        const mrData = mrRes?.ok ? await mrRes.json() : null;
        const owData = owRes?.ok ? await owRes.json() : null;
        if (!isMounted) return;
        if (mrData) setMrPlayers(mrData);
        if (owData) setOwPlayers(owData);
        setConnection(mrData && owData ? 'connected' : mrData || owData ? 'partial' : 'offline');
      } catch (err) {
        console.error("Error fetching data", err);
        if (isMounted) setConnection('offline');
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
        
        // Refresh the list manually since fetchData is removed from scope
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

  const getMarvelRivalsRanks = () => {
    return Object.entries(mrPlayers).map(([q, data]) => ({
      id: q,
      game: "Marvel Rivals",
      name: data.name || q,
      rank: data.last_tier ? `${data.last_tier} (${data.last_score} SR)` : "Unranked",
      icon: "https://upload.wikimedia.org/wikipedia/en/thumb/5/5e/Marvel_Rivals_logo.png/320px-Marvel_Rivals_logo.png",
      color: "#2a75d3"
    }));
  };

  const getOverwatchRanks = () => {
    return Object.entries(owPlayers).map(([q, data]) => {
      let topRank = "Unranked";
      if (data.ranks && Object.keys(data.ranks).length > 0) {
        // Just grab the first role's rank for overview, or highest if we wanted to parse
        const roles = Object.entries(data.ranks);
        if (roles.length > 0) {
          const [role, rankData] = roles[0];
          topRank = `${rankData.division.charAt(0).toUpperCase() + rankData.division.slice(1)} ${rankData.tier} (${role})`;
        }
      }
      
      return {
        id: q,
        game: "Overwatch 2",
        name: data.name || q,
        rank: topRank,
        icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Overwatch_circle_logo.svg/512px-Overwatch_circle_logo.svg.png",
        color: "#f99e1a",
        fullData: data.ranks
      };
    });
  };

    return (
    <div className="tracker-app flex h-full w-full flex-col bg-zinc-50/50 text-zinc-900 font-sans">
      {/* Modern Header */}
      <div className="shrink-0 border-b border-zinc-200 bg-white/80 backdrop-blur-md p-5 z-10">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <LineChart size={20} className="text-indigo-600" strokeWidth={2.5} />
            Rank Tracker
          </h1>
          <div className="tracker-status" data-state={connection} role="status">
            {connection === 'connected' ? '● Connected' : connection === 'checking' ? 'Checking connection…' : connection === 'partial' ? '◐ Partial connection' : '○ Offline'}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-100/80 rounded-xl border border-zinc-200/50">
          <button 
            aria-pressed={activeTab === 'overview'}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold transition-all rounded-lg ${activeTab === 'overview' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            aria-pressed={activeTab === 'add'}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold transition-all rounded-lg ${activeTab === 'add' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-200/50'}`}
            onClick={() => setActiveTab('add')}
          >
            Add Profile
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-auto p-6 bg-transparent">
        {connection === 'offline' && <p className="tracker-notice" role="status">The tracker is currently offline. Profiles will appear when the connection is restored.</p>}
        {connection === 'partial' && <p className="tracker-notice" role="status">One game service is unavailable. Some profiles may be missing or out of date.</p>}
        {loading && <p className="tracker-notice" role="status">Loading your tracked profiles…</p>}
        {activeTab === 'overview' ? (
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="tracker-summary"><div><p className="eyebrow">Keep an eye on the climb</p><strong>{Object.keys(mrPlayers).length + Object.keys(owPlayers).length}</strong><p>Tracked profiles</p></div><LineChart size={38} strokeWidth={1} className="text-indigo-600" /></div>
            {/* Marvel Rivals */}
            <section>
              <h2 className="mb-4 text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Marvel Rivals
              </h2>
              {getMarvelRivalsRanks().length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-100/50 rounded-2xl border border-zinc-200 border-dashed text-sm font-medium">No Marvel Rivals profiles added.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {getMarvelRivalsRanks().map(item => (
                    <div key={item.id} className="group flex bg-white rounded-2xl p-4 shadow-sm border border-zinc-200/60 hover:shadow-md hover:border-zinc-300 transition-all cursor-default">
                      <div className="flex flex-1 items-center justify-between">
                        <div className="font-semibold text-zinc-800">{item.name}</div>
                        <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                          {item.rank}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Overwatch 2 */}
            <section>
              <h2 className="mb-4 text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Overwatch 2
              </h2>
              {getOverwatchRanks().length === 0 ? (
                <div className="p-8 text-center text-zinc-400 bg-zinc-100/50 rounded-2xl border border-zinc-200 border-dashed text-sm font-medium">No Overwatch profiles added.</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {getOverwatchRanks().map(item => (
                    <div key={item.id} className="flex flex-col bg-white rounded-2xl shadow-sm border border-zinc-200/60 hover:shadow-md hover:border-zinc-300 transition-all cursor-default overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                        <div className="font-semibold text-zinc-800">{item.name}</div>
                        {(!item.fullData || Object.keys(item.fullData).length === 0) && (
                          <div className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded-full px-2.5 py-1 tracking-wider uppercase">
                            Unranked
                          </div>
                        )}
                      </div>
                      
                      {item.fullData && Object.keys(item.fullData).length > 0 && (
                        <div className="p-4 bg-white flex flex-col gap-3">
                          {Object.entries(item.fullData).map(([role, rankData]) => (
                            <div key={role} className="flex items-center justify-between text-sm">
                              <span className="font-medium text-zinc-500 capitalize">{role}</span>
                              <span className="font-semibold text-zinc-700 bg-zinc-100 rounded-md px-2.5 py-1 text-xs">
                                {rankData.division.charAt(0).toUpperCase() + rankData.division.slice(1)} {rankData.tier}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="max-w-md mx-auto py-4">
            <div className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8">
              <h2 className="mb-6 text-xl font-bold text-zinc-800">Track New Profile</h2>
              
              <form onSubmit={handleAddStudent} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="tracker-game" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Game</label>
                  <select 
                    id="tracker-game"
                    value={game} 
                    onChange={e => setGame(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="marvel-rivals">Marvel Rivals</option>
                    <option value="overwatch">Overwatch 2</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="tracker-player" className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Player Tag</label>
                  <input 
                    id="tracker-player"
                    type="text" 
                    value={query} 
                    placeholder={game === 'overwatch' ? "e.g. Player#1234" : "e.g. Player"}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm text-zinc-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting || !query.trim()}
                  className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl py-3.5 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Finding profile…' : 'Add to Tracker'}
                </button>

                {message && (
                  <div role="status" className={`mt-2 p-3 text-sm font-medium rounded-xl border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {message.text}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
