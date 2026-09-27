import { Navigate, Route, Routes } from 'react-router-dom';
import { getSession } from './api/client';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewApplication from './pages/NewApplication';
import ApplicationDetail from './pages/ApplicationDetail';
import Verify from './pages/Verify';

function Private({ children }) {
  return getSession() ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/:signatureId" element={<Verify />} />
        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/new" element={<Private><NewApplication /></Private>} />
        <Route path="/applications/:id" element={<Private><ApplicationDetail /></Private>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
