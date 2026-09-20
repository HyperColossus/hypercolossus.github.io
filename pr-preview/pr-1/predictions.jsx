/* global React, ReactDOM */
const { useMemo, useState } = React;

const BASE_CONTEXT = {
  team_ratings: { blue: 1842.3, red: 1794.1 },
  recent_form: {
    blue: { wins: 7, losses: 3, games: 10 },
    red: { wins: 6, losses: 4, games: 10 },
  },
  head_to_head: { blue_wins: 4, red_wins: 3, games: 7 },
  rosters: {
    blue: ["Top · Atlas", "Jungle · Mako", "Mid · Sol", "Bot · Nox", "Support · Vale"],
    red: ["Top · Rune", "Jungle · Pike", "Mid · Ember", "Bot · Flux", "Support · Moss"],
  },
  draft: null,
  missing_sections: [],
};

const PRE = {
  prediction_id: 42,
  release_status: "production",
  feature_cutoff: "2026-09-20T15:15:00Z",
  published_at: "2026-09-20T15:16:00Z",
  model: { name: "game_winner", version: "2026.09.20" },
  teams: [
    { side: "blue", team_id: "team-a", name: "Team A", acronym: "A", fair_probability: 0.62, fair_decimal_price: 1.613 },
    { side: "red", team_id: "team-b", name: "Team B", acronym: "B", fair_probability: 0.38, fair_decimal_price: 2.632 },
  ],
  context: BASE_CONTEXT,
  settlement: { status: "pending", actual_winner_team_id: null, settled_at: null },
};

const POST = {
  ...PRE,
  prediction_id: 43,
  feature_cutoff: "2026-09-20T15:48:00Z",
  published_at: "2026-09-20T15:49:00Z",
  teams: [
    { side: "blue", team_id: "team-a", name: "Team A", acronym: "A", fair_probability: 0.68, fair_decimal_price: 1.471 },
    { side: "red", team_id: "team-b", name: "Team B", acronym: "B", fair_probability: 0.32, fair_decimal_price: 3.125 },
  ],
  context: {
    ...BASE_CONTEXT,
    draft: {
      blue: ["Aatrox", "Sejuani", "Azir", "Kai'Sa", "Nautilus"],
      red: ["Renekton", "Vi", "Orianna", "Xayah", "Rakan"],
    },
  },
};

const SCENARIOS = {
  pre_available: {
    label: "1 · Pre-draft available",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "scheduled" },
    forecasts: {
      pre_draft: { status: "available", reason_code: null, prediction: PRE },
      post_draft: { status: "pending", reason_code: null, prediction: null },
    },
  },
  both_available: {
    label: "2 · Pre + post-draft available",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "draft complete" },
    forecasts: {
      pre_draft: { status: "available", reason_code: null, prediction: PRE },
      post_draft: { status: "available", reason_code: null, prediction: POST },
    },
  },
  pending: {
    label: "3 · Pre-draft pending",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "scheduled" },
    forecasts: {
      pre_draft: { status: "pending", reason_code: null, prediction: null },
      post_draft: { status: "pending", reason_code: null, prediction: null },
    },
  },
  unavailable: {
    label: "4 · Pre-draft unavailable",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "scheduled" },
    forecasts: {
      pre_draft: { status: "unavailable", reason_code: "MODEL_INPUT_INCOMPLETE", prediction: null },
      post_draft: { status: "pending", reason_code: null, prediction: null },
    },
  },
  suppressed: {
    label: "5 · Post-draft suppressed",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "in progress" },
    forecasts: {
      pre_draft: { status: "available", reason_code: null, prediction: PRE },
      post_draft: { status: "suppressed", reason_code: "FINAL_DRAFT_UNAVAILABLE", prediction: null },
    },
  },
  no_h2h: {
    label: "6 · No head-to-head",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "scheduled" },
    forecasts: {
      pre_draft: {
        status: "available",
        reason_code: null,
        prediction: {
          ...PRE,
          context: { ...BASE_CONTEXT, head_to_head: null, missing_sections: ["head_to_head"] },
        },
      },
      post_draft: { status: "pending", reason_code: null, prediction: null },
    },
  },
  partial: {
    label: "7 · Partial context",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 20 · 11:30 AM ET", state: "scheduled" },
    forecasts: {
      pre_draft: {
        status: "available",
        reason_code: null,
        prediction: {
          ...PRE,
          context: {
            ...BASE_CONTEXT,
            recent_form: { blue: BASE_CONTEXT.recent_form.blue, red: null },
            rosters: { blue: BASE_CONTEXT.rosters.blue, red: [] },
            missing_sections: ["recent_form.red", "rosters.red"],
          },
        },
      },
      post_draft: { status: "pending", reason_code: null, prediction: null },
    },
  },
  settled: {
    label: "8 · Settled historical",
    game: { game_id: "game-123", series_id: "series-456", game_number: 2, tournament_id: "msi-2026", scheduled_at: "Sep 18 · Final", state: "completed" },
    forecasts: {
      pre_draft: {
        status: "available",
        reason_code: null,
        prediction: {
          ...PRE,
          settlement: { status: "settled", actual_winner_team_id: "team-a", settled_at: "2026-09-18T19:42:00Z" },
        },
      },
      post_draft: {
        status: "available",
        reason_code: null,
        prediction: {
          ...POST,
          settlement: { status: "settled", actual_winner_team_id: "team-a", settled_at: "2026-09-18T19:42:00Z" },
        },
      },
    },
  },
};

function formatPct(value) {
  return value == null ? "—" : Math.round(value * 100) + "%";
}

function StatePanel({ state }) {
  const copy = {
    pending: {
      title: "Forecast pending",
      body: "The game is known, but the production forecast has not been published yet.",
    },
    unavailable: {
      title: "Forecast unavailable",
      body: "Required prediction data or model inputs were not available. No forecast has been fabricated.",
    },
    suppressed: {
      title: "Post-draft forecast suppressed",
      body: "The finalized draft never became reliable enough to publish a post-draft forecast.",
    },
  }[state.status];

  return (
    <div className="state-panel">
      <div className="eyebrow">Production forecast</div>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      {state.reason_code && <span className="reason-code">{state.reason_code}</span>}
    </div>
  );
}

function ContextCard({ label, value, sub, empty }) {
  return (
    <div className="context-card">
      <div className="context-label">{label}</div>
      <div className={"context-value" + (empty ? " context-empty" : "")}>{value}</div>
      {sub && <div className="context-sub">{sub}</div>}
    </div>
  );
}

function Dashboard() {
  const [scenarioKey, setScenarioKey] = useState("pre_available");
  const scenario = SCENARIOS[scenarioKey];
  const defaultStage = scenario.forecasts.pre_draft.status === "available" ? "pre_draft" : "pre_draft";
  const [stage, setStage] = useState(defaultStage);

  const active = scenario.forecasts[stage];
  const prediction = active.prediction;

  const blue = prediction?.teams.find((team) => team.side === "blue");
  const red = prediction?.teams.find((team) => team.side === "red");
  const context = prediction?.context;

  const winnerId = prediction && blue && red
    ? (blue.fair_probability >= red.fair_probability ? blue.team_id : red.team_id)
    : null;

  const missing = useMemo(() => new Set(context?.missing_sections || []), [context]);

  function changeScenario(event) {
    const next = event.target.value;
    setScenarioKey(next);
    setStage("pre_draft");
  }

  return (
    <>
      <nav className="site-nav">
        <a className="brand" href="index.html">Zachary Siegel</a>
        <div className="nav-links">
          <a href="index.html">Home</a>
          <a href="Portfolio.html">Portfolio</a>
          <a className="active" href="predictions.html">Predictions</a>
        </div>
        <div className="nav-status"><span className="nav-dot"></span>Prediction Intelligence</div>
      </nav>

      <main className="page">
        <section className="prototype-bar">
          <div>
            <div className="eyebrow">Issue #31 · UI prototype</div>
            <h1>Prediction <em>Intelligence</em></h1>
            <p className="prototype-copy">
              A fixture-driven prototype for production game-winner forecasts. Supporting context explains the
              prediction environment without claiming that every displayed statistic is a direct model feature.
            </p>
          </div>
          <div className="scenario-picker">
            <label htmlFor="scenario">Prototype state</label>
            <select id="scenario" value={scenarioKey} onChange={changeScenario}>
              {Object.entries(SCENARIOS).map(([key, item]) => (
                <option key={key} value={key}>{item.label}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="game-shell">
          <div className="game-kicker">
            <span><strong>{scenario.game.tournament_id}</strong> · Game {scenario.game.game_number}</span>
            <span>{scenario.game.scheduled_at} · {scenario.game.state}</span>
          </div>

          <div className="stage-tabs" role="tablist" aria-label="Forecast stage">
            {["pre_draft", "post_draft"].map((key) => (
              <button
                key={key}
                className={"stage-tab" + (stage === key ? " active" : "")}
                onClick={() => setStage(key)}
                role="tab"
                aria-selected={stage === key}
              >
                {key === "pre_draft" ? "Pre-draft" : "Post-draft"}
              </button>
            ))}
          </div>

          <div className="forecast-card">
            <div className="forecast-meta">
              <span>{stage === "pre_draft" ? "Pre-draft forecast" : "Post-draft forecast"}</span>
              <span className={"status-chip " + active.status}>{active.status}</span>
            </div>

            {prediction ? (
              <>
                <div className="matchup">
                  <div className="team blue">
                    <div className="side-label">Blue side</div>
                    <div className="team-name">{blue.name}</div>
                    <div className={"probability" + (winnerId === blue.team_id ? " winner" : "")}>{formatPct(blue.fair_probability)}</div>
                    <div className="price">Fair price · {blue.fair_decimal_price.toFixed(3)}</div>
                  </div>

                  <div className="versus">vs.</div>

                  <div className="team red">
                    <div className="side-label">Red side</div>
                    <div className="team-name">{red.name}</div>
                    <div className={"probability" + (winnerId === red.team_id ? " winner" : "")}>{formatPct(red.fair_probability)}</div>
                    <div className="price">Fair price · {red.fair_decimal_price.toFixed(3)}</div>
                  </div>

                  <div
                    className="prob-bar"
                    style={{
                      "--blue-pct": (blue.fair_probability * 100) + "%",
                      "--red-pct": (red.fair_probability * 100) + "%",
                    }}
                    aria-label={"Blue " + formatPct(blue.fair_probability) + ", Red " + formatPct(red.fair_probability)}
                  >
                    <span className="prob-blue"></span>
                    <span className="prob-red"></span>
                  </div>
                </div>

                {prediction.settlement.status === "settled" && (
                  <div className="settlement">
                    <span>Verified result</span>
                    <strong>{prediction.settlement.actual_winner_team_id === blue.team_id ? blue.name : red.name} won</strong>
                  </div>
                )}
              </>
            ) : (
              <StatePanel state={active} />
            )}
          </div>
        </section>

        {prediction && (
          <>
            <section className="context-section">
              <div className="section-head">
                <h2>Prediction-time context</h2>
                <p>Snapshot values are frozen with the forecast so historical pages do not silently use today’s ratings, form, or rosters.</p>
              </div>

              <div className="context-grid">
                <ContextCard
                  label="Team rating · Blue"
                  value={context.team_ratings?.blue != null ? context.team_ratings.blue.toFixed(1) : "Unavailable"}
                  sub={blue.name}
                  empty={context.team_ratings?.blue == null}
                />
                <ContextCard
                  label="Team rating · Red"
                  value={context.team_ratings?.red != null ? context.team_ratings.red.toFixed(1) : "Unavailable"}
                  sub={red.name}
                  empty={context.team_ratings?.red == null}
                />
                <ContextCard
                  label="Recent form · Blue"
                  value={context.recent_form?.blue ? context.recent_form.blue.wins + "–" + context.recent_form.blue.losses : "Unavailable"}
                  sub={context.recent_form?.blue ? "Last " + context.recent_form.blue.games + " games" : null}
                  empty={!context.recent_form?.blue}
                />
                <ContextCard
                  label="Recent form · Red"
                  value={context.recent_form?.red ? context.recent_form.red.wins + "–" + context.recent_form.red.losses : "Unavailable"}
                  sub={context.recent_form?.red ? "Last " + context.recent_form.red.games + " games" : null}
                  empty={!context.recent_form?.red}
                />
                <ContextCard
                  label="Head-to-head"
                  value={context.head_to_head ? context.head_to_head.blue_wins + "–" + context.head_to_head.red_wins : "No sample"}
                  sub={context.head_to_head ? context.head_to_head.games + " prior games" : "Not replaced with a neutral value"}
                  empty={!context.head_to_head}
                />
                <div className="context-card">
                  <div className="context-label">Active rosters</div>
                  <div className="roster-grid">
                    <div className="roster-team">
                      <h3>{blue.acronym || blue.name}</h3>
                      <div className="roster-list">
                        {(context.rosters?.blue || []).length
                          ? context.rosters.blue.map((player) => <span className="roster-pill" key={player}>{player}</span>)
                          : <span className="context-sub">Unavailable</span>}
                      </div>
                    </div>
                    <div className="roster-team">
                      <h3>{red.acronym || red.name}</h3>
                      <div className="roster-list">
                        {(context.rosters?.red || []).length
                          ? context.rosters.red.map((player) => <span className="roster-pill" key={player}>{player}</span>)
                          : <span className="context-sub">Unavailable</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <ContextCard
                  label="Draft"
                  value={context.draft ? "Finalized" : (stage === "pre_draft" ? "Not yet known" : "Unavailable")}
                  sub={context.draft ? "Champion assignments captured in snapshot" : null}
                  empty={!context.draft && stage === "post_draft"}
                />
                <ContextCard
                  label="Missing sections"
                  value={missing.size ? String(missing.size) : "0"}
                  sub={missing.size ? Array.from(missing).join(", ") : "Context complete for this fixture"}
                  empty={missing.size > 0}
                />
              </div>
            </section>

            <section className="provenance" aria-label="Forecast provenance">
              <div className="prov-item">
                <div className="prov-label">Model</div>
                <div className="prov-value">{prediction.model.name}</div>
              </div>
              <div className="prov-item">
                <div className="prov-label">Version</div>
                <div className="prov-value">{prediction.model.version}</div>
              </div>
              <div className="prov-item">
                <div className="prov-label">Feature cutoff</div>
                <div className="prov-value">{prediction.feature_cutoff}</div>
              </div>
              <div className="prov-item">
                <div className="prov-label">Published</div>
                <div className="prov-value">{prediction.published_at}</div>
              </div>
            </section>
          </>
        )}

        <p className="prototype-note">
          Prototype only · Fixture data is intentionally synthetic. The page does not run model inference and does not connect to PostgreSQL.
        </p>
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);
