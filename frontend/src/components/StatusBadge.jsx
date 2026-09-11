export default function StatusBadge({ status }) {
  const kind = status.startsWith('PENDING') ? 'pending' : status.toLowerCase();
  return <span className={`badge badge-${kind}`}>{status}</span>;
}
