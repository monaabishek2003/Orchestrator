/* eslint-disable */
function StatusPill({ status }) {
  const map = {
    running: { cls: 'running', label: 'Running' },
    stalled: { cls: 'stalled', label: 'Stalled' },
    error:   { cls: 'error',   label: 'Error' },
    done:    { cls: 'done',    label: 'Done' },
    queued:  { cls: 'queued',  label: 'Queued' },
  };
  const v = map[status] || map.done;
  return (
    <span className={`pill pill--${v.cls}`}>
      <span className="pill__dot" />
      {v.label}
    </span>
  );
}
window.StatusPill = StatusPill;
