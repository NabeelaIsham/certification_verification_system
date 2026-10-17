import { useAuth } from '../contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking your session...</p>;

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    // Redirect to appropriate dashboard based on user type
    switch (user.userType) {
      case 'superadmin':
        return <Navigate to="/admin/dashboard" />;
      case 'institute':
        return <Navigate to="/institute/dashboard" />;
      default:
        return <Navigate to="/login" />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
