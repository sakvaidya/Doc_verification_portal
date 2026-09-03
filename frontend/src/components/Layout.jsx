import { Link, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../api/client';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const user = getSession()?.user;

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <div className="page">
      <header className="header">
        <Link to="/" className="brand">Document Verification Portal</Link>
        <nav className="nav">
          <Link to="/verify">Verify</Link>
          {user ? (
            <>
              <Link to="/">Dashboard</Link>
              <span className="muted">{user.name} ({user.role})</span>
              <button className="btn btn-link" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
