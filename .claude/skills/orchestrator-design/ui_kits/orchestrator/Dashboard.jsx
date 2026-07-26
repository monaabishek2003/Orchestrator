/* eslint-disable */
function Dashboard() {
  const [agents, setAgents]   = React.useState(SEED_AGENTS);
  const [query, setQuery]     = React.useState('');
  const [openId, setOpenId]   = React.useState(null);
  const [sort, setSort]       = React.useState({ key: 'time', dir: 'desc' });

  const stats = React.useMemo(() => ({
    total:     agents.length,
    running:   agents.filter(a => a.status === 'running' && !a.reason).length + agents.filter(a => a.status === 'running' && a.reason).length,
    attention: agents.filter(isNeedsAttention).length,
    completed: agents.filter(a => a.status === 'done').length,
  }), [agents]);

  const attentionAgents = React.useMemo(
    () => agents.filter(isNeedsAttention),
    [agents]
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = agents;
    if (q) rows = rows.filter(a =>
      a.name.toLowerCase().includes(q) ||
      (a.lastMessage || '').toLowerCase().includes(q) ||
      a.status.includes(q)
    );
    const dir = sort.dir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      let av, bv;
      switch (sort.key) {
        case 'name':   av = a.name; bv = b.name; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'msg':    av = a.lastMessage || ''; bv = b.lastMessage || ''; break;
        case 'time':
        default:       av = a.updatedAt; bv = b.updatedAt;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return  1 * dir;
      return 0;
    });
    return rows;
  }, [agents, query, sort]);

  const handleResolve = (id) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, reason: null, status: 'done', lastMessage: 'resolved by operator', updatedAt: Date.now() } : a));
  };

  const handleSort = (key) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'time' ? 'desc' : 'asc' });
  };

  const handleCreate = () => {
    const n = agents.length + 1;
    const fresh = {
      id: 'a' + Date.now(),
      name: `agent-${String(n).padStart(2, '0')}`,
      status: 'running',
      lastMessage: 'Agent started successfully',
      updatedAt: Date.now(),
      reason: null,
    };
    setAgents(prev => [fresh, ...prev]);
  };

  const open = openId ? agents.find(a => a.id === openId) : null;

  return (
    <div className="app">
      <TopBar query={query} onQuery={setQuery} onCreate={handleCreate} />

      <div className="page">
        <header className="page__head">
          <h1 className="page__title">Orchestrator</h1>
          <p className="page__sub">Monitor your AI agents in real time</p>
        </header>

        <section className="stats">
          <StatCard icon="layers"          label="Total Agents"     value={stats.total} />
          <StatCard icon="activity"        label="Running"          value={stats.running}   tone="running" />
          <StatCard icon="alert-triangle"  label="Needs Attention"  value={stats.attention} tone="warning" />
          <StatCard icon="check-circle"    label="Completed"        value={stats.completed} tone="done" />
        </section>

        <AlertPanel
          agents={attentionAgents}
          onResolve={handleResolve}
          onOpen={(a) => setOpenId(a.id)}
        />

        <section>
          <div className="section__head">
            <h2 className="section__title">
              All agents
              <span className="section__sub">{filtered.length} / {agents.length}</span>
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn--ghost btn--sm">
                <Icon name="filter" size={12} /> Filter
              </button>
              <button className="btn btn--ghost btn--sm">
                <Icon name="settings" size={12} />
              </button>
            </div>
          </div>
          <AgentsTable
            agents={filtered}
            onOpen={(a) => setOpenId(a.id)}
            selectedId={openId}
            sort={sort}
            onSort={handleSort}
          />
        </section>
      </div>

      {open && (
        <AgentDetail
          agent={open}
          onClose={() => setOpenId(null)}
          onResolve={(id) => { handleResolve(id); }}
        />
      )}
    </div>
  );
}
window.Dashboard = Dashboard;
