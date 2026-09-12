import { Navigate, Route, Routes } from 'react-router-dom';
import { getSession } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

function Private({ children }) {
  return getSession() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Layout>
  );
}
