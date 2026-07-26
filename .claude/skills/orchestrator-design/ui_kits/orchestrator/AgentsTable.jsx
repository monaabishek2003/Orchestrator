/* eslint-disable */
function AgentsTable({ agents, onOpen, selectedId, sort, onSort }) {
  const arrow = (key) => {
    if (sort.key !== key) return null;
    return <Icon name={sort.dir === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} className="sort-arrow" />;
  };
  const cls = (key) => 'col-' + key + (sort.key === key ? ' is-sorted' : '');

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className={cls('name')} onClick={() => onSort('name')}>Name {arrow('name')}</th>
            <th className={cls('status')} onClick={() => onSort('status')}>Status {arrow('status')}</th>
            <th className={cls('msg')} onClick={() => onSort('msg')}>Last message {arrow('msg')}</th>
            <th className={cls('time') + ' num'} onClick={() => onSort('time')}>Last update {arrow('time')}</th>
          </tr>
        </thead>
        <tbody>
          {agents.length === 0 && (
            <tr><td className="empty" colSpan="4">No agents match.</td></tr>
          )}
          {agents.map((a) => (
            <tr
              key={a.id}
              className={selectedId === a.id ? 'is-selected' : ''}
              onClick={() => onOpen(a)}
            >
              <td className="col-name">{a.name}</td>
              <td><StatusPill status={statusFor(a)} /></td>
              <td className="col-msg">{a.lastMessage}</td>
              <td className="col-time">{humanizeAgo(a.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
window.AgentsTable = AgentsTable;
