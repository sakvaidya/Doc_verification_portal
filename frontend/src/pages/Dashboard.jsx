import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getSession } from '../api/client';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';

const SOURCE = { student: '/applications/mine', faculty: '/applications/assigned', admin: '/applications/all' };

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = getSession().user;
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(SOURCE[role]).then(setRows).catch((e) => setError(e.message));
  }, [role]);

  const title = { student: 'My applications', faculty: 'Assigned to me', admin: 'All applications' }[role];
  const actions = role === 'student' && <Button onClick={() => navigate('/new')}>New application</Button>;

  return (
    <Card title={title} actions={actions}>
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="muted">Loading…</p>}
      {rows && rows.length === 0 && <p className="muted">No applications yet.</p>}
      {rows && rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>#</th><th>Subject</th>
              {role !== 'student' && <th>Student</th>}
              {role === 'faculty' && <th>Step</th>}
              <th>{role === 'faculty' ? 'My decision' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.request_id}-${r.step_no || 0}`}>
                <td>{r.request_id}</td>
                <td><Link to={`/applications/${r.request_id}`}>{r.subject}</Link></td>
                {role !== 'student' && <td>{r.student_name}</td>}
                {role === 'faculty' && <td>{r.step_no}</td>}
                <td><StatusBadge status={role === 'faculty' ? r.decision : r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
