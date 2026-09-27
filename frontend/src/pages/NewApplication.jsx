import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';

export default function NewApplication() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/faculty').then(setFaculty).catch((e) => setError(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { requestId } = await api.post('/applications', new FormData(e.target));
      navigate(`/applications/${requestId}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Card title="New application">
      <form onSubmit={submit} className="form">
        <Field label="Subject" name="subject" required />
        <Field label="Description" name="description" as="textarea" rows={4} required />
        <Field label="Send to" name="facultyUserId" as="select" required defaultValue="">
          <option value="" disabled>Choose a faculty member</option>
          {faculty.map((f) => (
            <option key={f.user_id} value={f.user_id}>{f.name} ({f.designation})</option>
          ))}
        </Field>
        <Field label="Files (any type, max 10 MB each)" name="files" type="file" multiple required />
        {error && <p className="error">{error}</p>}
        <div>
          <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button>{' '}
          <Button type="button" variant="secondary" onClick={() => navigate('/')}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
