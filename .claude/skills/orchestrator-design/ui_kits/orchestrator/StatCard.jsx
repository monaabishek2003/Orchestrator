/* eslint-disable */
function StatCard({ icon, label, value, tone = 'default' }) {
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__icon">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div className="stat__label">{label}</div>
        <div className="stat__value">{value}</div>
      </div>
    </div>
  );
}
window.StatCard = StatCard;
