import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { showRedirectNotification } from './services/notifications'
import { ToastContainer } from 'react-toastify'
//import 'react-toastify/dist/ReactToastify.css'

// Context Providers
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { InstituteProvider } from './contexts/InstituteContext'

// Components
import Navbar from './components/shared/Navbar'
import Footer from './components/shared/Footer'

// Load route-specific dashboards, editors and QR tools only when visited.
import Home from './pages/Home'
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const TeacherSetPassword = lazy(() => import('./pages/TeacherSetPassword'));
const LegalPages = lazy(() => import('./pages/LegalPages'));
const ForgotPassword = lazy(() => import('./pages/Forgotpassword'));
const VerificationPortal = lazy(() => import('./pages/VerificationPortal'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const InstituteDashboard = lazy(() => import('./pages/InstituteDashboard'));
const StudentDashboard = lazy(() => import('./pages/StudentPortal'));
const NotFound = lazy(() => import('./pages/NotFound'));
const CertificateTemplates = lazy(() => import('./components/institute/CertificateTemplates'));
const CourseManagement = lazy(() => import('./components/institute/CourseManagement'));
const SystemLogs = lazy(() => import('./components/admin/SystemLogs'));
const InstituteManagement = lazy(() => import('./components/admin/InstituteManagement'));
const OTPVerification = lazy(() => import('./pages/OTPVerification'));
const TeacherManagement = lazy(() => import('./components/institute/TeacherManagement'));
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const CredentialShare = lazy(() => import('./pages/CredentialShare'));
const Pricing = lazy(() => import('./components/shared/Subscriptions').then(module => ({ default: module.Pricing })));
const InstituteSubscription = lazy(() => import('./components/shared/Subscriptions').then(module => ({ default: module.InstituteSubscription })));
const PackageCheckout = lazy(() => import('./components/shared/Subscriptions').then(module => ({ default: module.PackageCheckout })));
const PackagePayment = lazy(() => import('./components/shared/Subscriptions').then(module => ({ default: module.PackagePayment })));

// Define API_URL here so it can be used throughout the app
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Protected Route Component
const ProtectedRoute = ({ children, allowedUserType }) => {
  const location = useLocation();

  const { user, loading } = useAuth();
  if (loading) return <p role="status">Checking your session...</p>;

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
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
  useEffect(showRedirectNotification, []);
  const isAdminWorkspace = ['/admin/dashboard', '/institute/dashboard', '/teacher/dashboard'].includes(useLocation().pathname);
  return (
    <AuthProvider>
      <InstituteProvider>
        <div className="App min-h-screen flex flex-col bg-gray-50">
          {!isAdminWorkspace && <Navbar />}
          <main className="flex-grow">
            <Suspense fallback={<p role="status" className="p-8 text-center">Loading page...</p>}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              {import.meta.env.VITE_SAAS_ENABLED === 'true' && <Route path="/pricing" element={<Pricing />} />}
              {import.meta.env.VITE_SAAS_ENABLED === 'true' && <Route path="/institute/subscription" element={<ProtectedRoute allowedUserType="institute"><InstituteSubscription /></ProtectedRoute>} />}
              {import.meta.env.VITE_SAAS_ENABLED === 'true' && <Route path="/institute/subscription/checkout/:planId" element={<ProtectedRoute allowedUserType="institute"><PackageCheckout /></ProtectedRoute>} />}
              {import.meta.env.VITE_SAAS_ENABLED === 'true' && <Route path="/institute/subscription/payment/:subscriptionId" element={<ProtectedRoute allowedUserType="institute"><PackagePayment /></ProtectedRoute>} />}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/teacher/set-password" element={<TeacherSetPassword />} />
              <Route path="/terms" element={<LegalPages kind="terms" />} />
              <Route path="/privacy" element={<LegalPages kind="privacy" />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify" element={<VerificationPortal />} />
              <Route path="/verify/:code" element={<VerificationPortal />} />
              <Route path="/share/:token" element={<CredentialShare />} />
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
              <Route path="/student" element={<StudentDashboard />} />
              <Route
                path="/student/dashboard"
                element={<Navigate to="/student" replace />}
              />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </main>
          {!isAdminWorkspace && <Footer />}
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
