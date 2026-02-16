import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { AnimatedToastProvider } from '@/components/ui/animated-toast';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import CertificateVerificationPage from '@/pages/CertificateVerificationPage';
import StudentDashboard from '@/pages/student/StudentDashboard';
import FacultyDashboard from '@/pages/faculty/FacultyDashboard';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import StudentProfile from '@/pages/student/StudentProfile';
import FacultyProfile from '@/pages/faculty/FacultyProfile';
import AdminProfile from '@/pages/admin/AdminProfile';
import FacultyDetailsPage from '@/pages/admin/FacultyDetailsPage';
import { Loader2 } from 'lucide-react';

// Page transition wrapper
const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

// Animated loading state
const LoadingSpinner = () => (
  <motion.div 
    className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary" />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-r-primary/50"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
      <motion.span
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Loading...
      </motion.span>
    </motion.div>
  </motion.div>
);

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
}

function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'student') {
    return <StudentDashboard />;
  }

  if (profile.role === 'faculty') {
    return <FacultyDashboard />;
  }

  if (profile.role === 'admin') {
    return <AdminDashboard />;
  }

  return <Navigate to="/login" replace />;
}

function ProfileRouter() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'student') {
    return <StudentProfile />;
  }

  if (profile.role === 'faculty') {
    return <FacultyProfile />;
  }

  if (profile.role === 'admin') {
    return <AdminProfile />;
  }

  return <Navigate to="/login" replace />;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition><LandingPage /></PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition><LoginPage /></PageTransition>
        } />
        <Route path="/register" element={
          <PageTransition><RegisterPage /></PageTransition>
        } />
        <Route path="/forgot-password" element={
          <PageTransition><ForgotPasswordPage /></PageTransition>
        } />
        <Route path="/reset-password" element={
          <PageTransition><ResetPasswordPage /></PageTransition>
        } />
        <Route path="/verify-certificate" element={
          <PageTransition><CertificateVerificationPage /></PageTransition>
        } />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/faculty/:facultyId"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <FacultyDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileRouter />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="student-hub-theme">
        <AuthProvider>
          <AnimatedToastProvider position="bottom-right">
            <AnimatedRoutes />
            <Toaster />
          </AnimatedToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
