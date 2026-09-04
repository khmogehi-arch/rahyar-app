import { Navigate, Route, Routes } from 'react-router-dom';
import EntryPage from './pages/EntryPage';
import DestinationSelectPage from './pages/DestinationSelectPage';
import RoutePage from './pages/RoutePage';
import RequireEntry from './components/RequireEntry';

export default function App() {
  return (
    <Routes>
      <Route path="/entry/:token" element={<EntryPage />} />
      <Route
        path="/destinations"
        element={
          <RequireEntry>
            <DestinationSelectPage />
          </RequireEntry>
        }
      />
      <Route
        path="/route/:destinationNodeId"
        element={
          <RequireEntry>
            <RoutePage />
          </RequireEntry>
        }
      />
      <Route
        path="/"
        element={
          <RequireEntry>
            <DestinationSelectPage />
          </RequireEntry>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
