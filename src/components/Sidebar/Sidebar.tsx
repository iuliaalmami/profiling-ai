import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './Sidebar.scss';
import { DashboardOutlined, TeamOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const handleNewMatch = () => {
    sessionStorage.removeItem('chatId');
    navigate('/chat/new');
  };

  // Show New Match button only on dashboard and profiles pages
  const showNewMatchButton = location.pathname === '/dashboard' || location.pathname === '/profiles';

  return (
    <div className="sidebar">
      <NavLink to="/dashboard" className="nav-link">
        <DashboardOutlined className="dashboard-icon" />
        Dashboard
      </NavLink>
      <NavLink to="/profiles" className="nav-link">
        <TeamOutlined className="profiles-icon" />
        Profiles
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className="nav-link">
          <SettingOutlined className="admin-icon" />
          Admin
        </NavLink>
      )}
      {showNewMatchButton && (
        <button onClick={handleNewMatch} className="nav-link nav-button">
          <PlusOutlined className="new-match-icon" />
          New Match
        </button>
      )}
    </div>
  );
};

export default Sidebar;
