import { Routes, Route } from 'react-router-dom';
import Navbar from './components/shared/Navbar.jsx';
import Footer from './components/shared/Footer.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import VerificationPortal from './pages/VerificationPortal';
import ForgotPassword from './pages/Forgotpassword.jsx';
import Register from './pages/Register.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import InstituteDashboard from './pages/InstituteDashboard';


function App() {
  return (
    <div className="App min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
         <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<VerificationPortal />} />
          <Route path="/Register" element={<Register />} />
           <Route path="/forgot-password" element={<ForgotPassword />} />
           <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/institute/dashboard" element={<InstituteDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;