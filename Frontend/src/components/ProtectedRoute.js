import { Navigate, Outlet } from 'react-router-dom';

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to parse stored user data:', error);
    return null;
  }
};

const ProtectedRoute = ({ allowedRoles }) => {
  const user = getStoredUser();
  const token = localStorage.getItem('token');

  if (!token || !user) {
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