import { Routes, Route, Navigate } from 'react-router-dom';
import './App.scss';
import Sidebar from './components/Sidebar/Sidebar';
import './index.scss';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import Header from './components/Header/Header';
import NewMatchPage from './pages/NewMatch/NewMatch';
import ProfileMatch from './pages/ProfileMatch/ProfileMatch';
import ProfileDetails from './pages/ProfileDetails/ProfileDetails';

function App() {
  return (
    <>
      <div className="app">
        <Header />

        <div className="page-wrapper">
          <Sidebar />

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profiles" element={<Profile />} />
            <Route path="/chat/new" element={<NewMatchPage />} />
            <Route path="/chat/:id" element={<NewMatchPage />} />
            <Route path="/matches/:chatId" element={<ProfileMatch />} />
            <Route path="/profile-details" element={<ProfileDetails />} />
            <Route path="/profile/:cvId" element={<ProfileDetails />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
