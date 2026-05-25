import { Navigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

/** Solo admin principal (isMainAdmin). */
export default function MainAdminRoute({ children }) {
  const { isMainAdmin } = useUser();

  if (!isMainAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}
