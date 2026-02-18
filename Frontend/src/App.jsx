import { Routes, Route } from 'react-router-dom'
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

function App() {
  return (
    <AuthProvider>
      <InstituteProvider>
        <div className="App min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify" element={<VerificationPortal />} />
              <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
              <Route path="/institute/dashboard" element={<InstituteDashboard />} />
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/CertificateTemplates" element={<CertificateTemplates />} />
              <Route path="/CourseManagement" element={<CourseManagement />} />
              <Route path="/system-logs" element={<SystemLogs />} />
              <Route path="/InstituteManagement" element={<InstituteManagement />} />
              <Route path='/OTPVerification' element={<OTPVerification />} />


        
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