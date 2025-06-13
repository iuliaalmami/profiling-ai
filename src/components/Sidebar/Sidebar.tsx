import { NavLink } from 'react-router-dom';
import './Sidebar.scss';
import { DashboardOutlined, TeamOutlined } from '@ant-design/icons';

const Sidebar = () => {
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
    </div>
  );
};

export default Sidebar;
