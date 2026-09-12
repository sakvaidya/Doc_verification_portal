import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api/client';
import Card from '../components/Card';
import Field from '../components/Field';
import Button from '../components/Button';

const COMMON = [
  ['firstName', 'First name'], ['middleName', 'Middle name (optional)'], ['lastName', 'Last name'],
  ['email', 'Email', 'email'], ['phoneNo', 'Phone numbers (optional, comma-separated)'], ['password', 'Password', 'password'],
];
const BY_ROLE = {
  student: [['sapId', 'SAP ID'], ['department', 'Department'], ['division', 'Division'],
    ['yearOfGraduation', 'Year of graduation', 'number']],
  faculty: [['facultyId', 'Faculty ID'], ['designation', 'Designation'], ['department', 'Department']],
};
const OPTIONAL = ['middleName', 'phoneNo'];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      saveSession(await api.post('/auth/register', { ...form, role }));
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Card title="Register">
      <div className="toggle">
        {['student', 'faculty'].map((r) => (
          <Button key={r} type="button" variant={role === r ? 'primary' : 'secondary'} onClick={() => setRole(r)}>
            {r === 'student' ? 'Student' : 'Faculty'}
          </Button>
        ))}
      </div>
      <form onSubmit={submit} className="form grid">
        {[...COMMON, ...BY_ROLE[role]].map(([key, label, type = 'text']) => (
          <Field
            key={key} label={label} type={type} required={!OPTIONAL.includes(key)}
            value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        ))}
        {role === 'faculty' && <p className="muted full">An RSA key pair is generated for you on registration.</p>}
        {error && <p className="error full">{error}</p>}
        <div className="full">
          <Button type="submit">Create account</Button>
          <span className="muted"> Have an account? <Link to="/login">Login</Link></span>
        </div>
      </form>
    </Card>
  );
}
