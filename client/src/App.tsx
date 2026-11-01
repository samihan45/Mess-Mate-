import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import { EmptyState, Spinner } from './components/ui';
import Home from './pages/Home';
import Messes from './pages/Messes';
import MessDetail from './pages/MessDetail';
import { Login, Register } from './pages/Auth';
import Favourites from './pages/Favourites';
import CheckIn from './pages/CheckIn';

const OwnerDashboard = lazy(() => import('./pages/owner/OwnerDashboard'));
const ManageMess = lazy(() => import('./pages/owner/ManageMess'));
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));

export default function App() {
  return (
    <Suspense fallback={<div className="p-6"><Spinner /></div>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="messes" element={<Messes />} />
          <Route path="messes/:id" element={<MessDetail />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="checkin/:token" element={<RequireRole roles={['STUDENT']}><CheckIn /></RequireRole>} />
          <Route path="favourites" element={<RequireRole roles={['STUDENT']}><Favourites /></RequireRole>} />
          <Route path="owner" element={<RequireRole roles={['OWNER']}><OwnerDashboard /></RequireRole>} />
          <Route path="owner/:id" element={<RequireRole roles={['OWNER']}><ManageMess /></RequireRole>} />
          <Route path="admin" element={<RequireRole roles={['ADMIN']}><AdminPanel /></RequireRole>} />
          <Route path="*" element={<EmptyState title="Page not found" body="That link does not lead anywhere." />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
