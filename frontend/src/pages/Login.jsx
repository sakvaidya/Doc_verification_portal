import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api/client';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      saveSession(await api.post('/auth/login', form));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card title="Login">
      <form onSubmit={submit} className="form narrow">
        <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')} required />
        {error && <p className="error">{error}</p>}
        <Button type="submit">Login</Button>
        <p className="muted">No account? <Link to="/register">Register</Link></p>
      </form>
    </Card>
  );
}
