import { api } from '../api/client';

export default function FileList({ requestId, documents }) {
  if (documents.length === 0) return <p className="muted">No documents.</p>;
  return (
    <ul className="list">
      {documents.map((d) => (
        <li key={d.doc_no} className="row">
          <span>#{d.doc_no} {d.file_name}</span>
          <code className="muted small" title="SHA-256 of the file">{d.file_hash.slice(0, 16)}…</code>
          <button
            className="btn btn-link"
            onClick={() => api.download(`/documents/${requestId}/${d.doc_no}/download`, d.file_name)}
          >
            Download
          </button>
        </li>
      ))}
    </ul>
  );
}
