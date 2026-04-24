import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Toaster from 'react-hot-toast';
import { Toaster as HotToaster } from 'react-hot-toast';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const VolunteerSignup = lazy(() => import('./pages/VolunteerSignup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const TaskBoard = lazy(() => import('./pages/TaskBoard'));
const MapView = lazy(() => import('./pages/MapView'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const ImpactDashboard = lazy(() => import('./pages/ImpactDashboard'));
const Meetups = lazy(() => import('./pages/Meetups'));
const NGOForm = lazy(() => import('./pages/NGOForm'));
const NGORequests = lazy(() => import('./pages/NGORequests'));
const VolunteerOnboarding = lazy(() => import('./pages/VolunteerOnboarding'));

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><VolunteerSignup /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="tasks" element={<TaskBoard />} />
        <Route path="map" element={<MapView />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="impact" element={<ImpactDashboard />} />
        <Route path="meetups" element={<Meetups />} />
        <Route path="ngo-form" element={<NGOForm />} />
        <Route path="ngo-requests" element={<NGORequests />} />
        <Route path="volunteer-onboarding" element={<VolunteerOnboarding />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <AppRoutes />
          <HotToaster position="top-right" />
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
