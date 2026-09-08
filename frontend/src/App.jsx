import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="*" element={<p className="muted">Nothing here yet.</p>} />
      </Routes>
    </Layout>
  );
}
