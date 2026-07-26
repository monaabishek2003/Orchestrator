/* eslint-disable */
function AlertPanel({ agents, onResolve, onOpen }) {
  if (!agents.length) return null;
  return (
    <div className="alert">
      <div className="alert__head">
        <Icon name="alert-triangle" size={16} style={{ color: 'var(--warning)' }} />
        <span className="alert__title">
          Needs Attention <span className="alert__count">({agents.length})</span>
        </span>
      </div>
      <div className="alert__list">
        {agents.map((a) => {
          const isErr = /error|rate limit|blew/i.test(a.reason || '');
          return (
            <div className="alert__row" key={a.id} onClick={() => onOpen(a)}>
              <div className="alert__row-left">
                <span className="alert__agent">{a.name}</span>
                <span className={`alert__reason ${isErr ? 'alert__reason--err' : ''}`}>
                  {a.reason}
                </span>
              </div>
              <button
                className="btn btn--secondary btn--sm"
                onClick={(e) => { e.stopPropagation(); onResolve(a.id); }}
              >
                Resolve
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
window.AlertPanel = AlertPanel;
