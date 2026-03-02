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
                    <SuperAdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/system-logs" 
                element={
                  <ProtectedRoute allowedUserType="superadmin">
                    <SystemLogs />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/InstituteManagement" 
                element={
                  <ProtectedRoute allowedUserType="superadmin">
                    <InstituteManagement />
                  </ProtectedRoute>
                } 
              />

              {/* Institute Routes */}
              <Route 
                path="/institute/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <InstituteDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CertificateTemplates" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <CertificateTemplates />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/CourseManagement" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <CourseManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/teacher-management" 
                element={
                  <ProtectedRoute allowedUserType="institute">
                    <TeacherManagement />
                  </ProtectedRoute>
                } 
              />

              {/* Teacher Routes */}
              <Route 
                path="/teacher/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="teacher">
                    <TeacherDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Student Routes */}
              <Route 
                path="/student/dashboard" 
                element={
                  <ProtectedRoute allowedUserType="student">
                    <StudentDashboard />
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