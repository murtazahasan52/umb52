import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth, isStaff } from './auth';
import { Loading } from './ui';

import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import AppLayout from './layouts/AppLayout';

import Home from './pages/public/Home';
import Framework from './pages/public/Framework';
import RequestSupport from './pages/public/RequestSupport';
import Grievance from './pages/public/Grievance';
import Login from './pages/public/Login';

import Dashboard from './pages/admin/Dashboard';
import Warnings from './pages/admin/Warnings';
import Households from './pages/admin/Households';
import HouseholdForm from './pages/admin/HouseholdForm';
import HouseholdView from './pages/admin/HouseholdView';
import Cases from './pages/admin/Cases';
import CaseNew from './pages/admin/CaseNew';
import CaseDetail from './pages/admin/CaseDetail';
import Inbox from './pages/admin/Inbox';
import Users from './pages/admin/Users';
import Mauzes from './pages/admin/Mauzes';
import Reports from './pages/admin/Reports';
import Account from './pages/admin/Account';

import MyPlan from './pages/app/MyPlan';
import Repayments from './pages/app/Repayments';
import Progress from './pages/app/Progress';
import AppAccount from './pages/app/AppAccount';

function Guard({ staff, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (staff && !isStaff(user)) return <Navigate to="/app" replace />;
  if (!staff && isStaff(user)) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/framework" element={<Framework />} />
        <Route path="/request-support" element={<RequestSupport />} />
        <Route path="/grievance" element={<Grievance />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route
        path="/admin"
        element={
          <Guard staff>
            <AdminLayout />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="warnings" element={<Warnings />} />
        <Route path="households" element={<Households />} />
        <Route path="households/new" element={<HouseholdForm />} />
        <Route path="households/:id" element={<HouseholdView />} />
        <Route path="households/:id/edit" element={<HouseholdForm />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/new" element={<CaseNew />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="users" element={<Users />} />
        <Route path="mauzes" element={<Mauzes />} />
        <Route path="reports" element={<Reports />} />
        <Route path="account" element={<Account />} />
      </Route>

      <Route
        path="/app"
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        <Route index element={<MyPlan />} />
        <Route path="repayments" element={<Repayments />} />
        <Route path="progress" element={<Progress />} />
        <Route path="account" element={<AppAccount />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
