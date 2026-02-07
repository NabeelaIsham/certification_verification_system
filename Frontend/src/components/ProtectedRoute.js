import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem('user'));
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