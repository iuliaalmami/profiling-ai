import { Routes, Route, Navigate } from 'react-router-dom';
import './App.scss';
import Sidebar from './components/Sidebar/Sidebar';
import './index.scss';
import Dashboard from './pages/Dashboard/Dashboard';
import Profile from './pages/Profile/Profile';
import Header from './components/Header/Header';
import JobDescription from './components/JobDescription/JobDescription';

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
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
