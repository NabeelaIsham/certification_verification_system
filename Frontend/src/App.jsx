import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
//import 'react-toastify/dist/ReactToastify.css'

// Context Providers
import { AuthProvider } from './contexts/AuthContext'
import { InstituteProvider } from './contexts/InstituteContext'

// Components
import Navbar from './components/shared/Navbar'
import Footer from './components/shared/Footer'

// Pages
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/Forgotpassword'
import VerificationPortal from './pages/VerificationPortal'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import InstituteDashboard from './pages/InstituteDashboard'
import StudentDashboard from './pages/StudentPortal'
import NotFound from './pages/NotFound'
import CertificateTemplates from './components/institute/CertificateTemplates'
import CourseManagement from './components/institute/CourseManagement'
import SystemLogs from './components/admin/SystemLogs'
import InstituteManagement from './components/admin/InstituteManagement'
import OTPVerification from './pages/OTPVerification'
import TeacherManagement from './components/institute/TeacherManagement'
import TeacherDashboard from './components/teacher/TeacherDashboard'

// Define API_URL here so it can be used throughout the app
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserType }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedUserType && user.userType !== allowedUserType) {
    // Redirect to appropriate dashboard based on user type
    switch (user.userType) {
      case 'superadmin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'institute':
        return <Navigate to="/institute/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/teacher/dashboard" replace />;
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <InstituteProvider>
        <div className="App min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify" element={<VerificationPortal />} />
              <Route path='/OTPVerification' element={<OTPVerification />} />

              {/* Super Admin Routes */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="superadmin">
                    <SuperAdminDashboard API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/system-logs" 
                element={
                  <ProtectedRoute allowedUserType="superadmin">
                    <SystemLogs API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/InstituteManagement" 
                element={
                  <ProtectedRoute allowedUserType="superadmin">
                    <InstituteManagement API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />

              {/* Institute Routes */}
              <Route 
                path="/institute/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <InstituteDashboard API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CertificateTemplates" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <CertificateTemplates API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CourseManagement" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <CourseManagement API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher-management" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <TeacherManagement API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />

              {/* Teacher Routes */}
              <Route 
                path="/teacher/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="teacher">
                    <TeacherDashboard API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />

              {/* Student Routes */}
              <Route 
                path="/student/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="student">
                    <StudentDashboard API_URL={API_URL} />
                  </ProtectedRoute>
                } 
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer 
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </InstituteProvider>
    </AuthProvider>
  )
}

export default App