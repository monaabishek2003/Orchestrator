/* eslint-disable */
function TopBar({ query, onQuery, onCreate }) {
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current && inputRef.current.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar__logo">
        <img src="../../assets/logo.svg" alt="Orchestrator" />
      </div>
      <nav className="topbar__nav">
        <a href="#" className="is-active">Agents</a>
        <a href="#">Runs</a>
        <a href="#">Tools</a>
        <a href="#">Logs</a>
        <a href="#">Settings</a>
      </nav>
      <div className="topbar__spacer" />
      <div className="search">
        <Icon name="search" size={14} style={{ color: 'var(--fg-3)' }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search agents…"
        />
        <span className="search__kbd">/</span>
      </div>
      <button className="btn btn--ghost btn--icon" title="Refresh">
        <Icon name="refresh" size={15} />
      </button>
      <button className="btn btn--primary" onClick={onCreate}>
        <Icon name="plus" size={14} />
        New agent
      </button>
    </div>
  );
}
window.TopBar = TopBar;
