/* eslint-disable */
function AgentDetail({ agent, onClose, onResolve }) {
  React.useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!agent) return null;
  const logs = getLogsFor(agent.name);

  return (
    <React.Fragment>
      <div className="flyout-overlay" onClick={onClose} />
      <aside className="flyout" role="dialog" aria-label={`Agent ${agent.name}`}>
        <div className="flyout__head">
          <div className="flyout__title">
            <div className="flyout__agent">{agent.name}</div>
            <div className="flyout__meta">
              <StatusPill status={statusFor(agent)} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
                updated {humanizeAgo(agent.updatedAt)}
              </span>
            </div>
          </div>
          <button className="flyout__close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flyout__controls">
          {agent.reason && (
            <button
              className="btn btn--primary btn--sm"
              onClick={() => onResolve(agent.id)}
            >
              Resolve
            </button>
          )}
          <button className="btn btn--secondary btn--sm">
            <Icon name="pause" size={12} /> Pause
          </button>
          <button className="btn btn--secondary btn--sm">
            <Icon name="refresh" size={12} /> Restart
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn--danger btn--sm">
            <Icon name="square" size={12} /> Stop
          </button>
        </div>

        <div className="flyout__body">
          {agent.reason && (
            <div style={{
              background: 'var(--warning-dim)',
              border: '1px solid rgba(245,181,68,0.25)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 22,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: 'var(--warning-fg)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <Icon name="alert-triangle" size={14} />
              {agent.reason}
            </div>
          )}

          <h4 className="flyout__section-title">Properties</h4>
          <dl className="flyout__props">
            <dt>id</dt><dd>{agent.id}</dd>
            <dt>name</dt><dd>{agent.name}</dd>
            <dt>status</dt><dd>{agent.status}</dd>
            <dt>last_msg</dt><dd>{agent.lastMessage}</dd>
            <dt>updated</dt><dd>{humanizeAgo(agent.updatedAt)}</dd>
          </dl>

          <h4 className="flyout__section-title">Recent log</h4>
          <div className="log">
            {logs.map(([t, lvl, msg], i) => (
              <div className="log__line" key={i}>
                <span className="log__time">{t}</span>
                <span className={`log__level log__level--${lvl}`}>{lvl}</span>
                <span className="log__msg">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}
window.AgentDetail = AgentDetail;
