import { Routes, Route, Navigate } from 'react-router-dom';
import './App.scss';
import Sidebar from './components/Sidebar/Sidebar';
import './index.scss';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import ProfileChat from './pages/ProfileChat/ProfileChat';
import Header from './components/Header/Header';
import NewMatchPage from './pages/NewMatch/NewMatch';
import ProfileMatch from './pages/ProfileMatch/ProfileMatch';
import ProfileDetails from './pages/ProfileDetails/ProfileDetails';
import LoginPage from './pages/Login/Login';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';

import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={
          <ProtectedRoute>
            <div className="app">
              <Header />
              <div className="page-wrapper">
                <Sidebar />
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="profiles" element={<Profile />} />
                  <Route path="profile-chat/:chatId" element={<ProfileChat />} />
                  <Route path="chat/new" element={<NewMatchPage />} />
                  <Route path="chat/:id" element={<NewMatchPage />} />
                  <Route path="matches/:chatId" element={<ProfileMatch />} />
                  <Route path="profile-details" element={<ProfileDetails />} />
                  <Route path="profile/:cvId" element={<ProfileDetails />} />
                </Routes>
              </div>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
