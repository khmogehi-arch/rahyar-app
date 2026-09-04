import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import BuildingsPage from './pages/BuildingsPage';
import MapEditorPage from './pages/MapEditorPage';
import QRCodesPage from './pages/QRCodesPage';
import BeaconsPage from './pages/BeaconsPage';
import DestinationsPage from './pages/DestinationsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/buildings" element={<BuildingsPage />} />
        <Route path="/map-editor" element={<MapEditorPage />} />
        <Route path="/qrcodes" element={<QRCodesPage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/beacons" element={<BeaconsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/buildings" replace />} />
      <Route path="*" element={<Navigate to="/buildings" replace />} />
    </Routes>
  );
}
