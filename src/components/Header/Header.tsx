import {
  BellOutlined,
  SearchOutlined,
  UserOutlined,
  QuestionCircleOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Typography, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import header from '../../assets/global-header.png';
import avatar from '../../assets/avatar.png';
import './Header.scss';

const { Text } = Typography;

const Header = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0', marginBottom: '8px' }}>
          <div style={{ fontWeight: 'bold' }}>{user?.name || 'User'}</div>
          {user?.email && <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>}
        </div>
      ),
      disabled: true,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <img src={header} alt="Logo" className="logo-image" />
        </div>
        <span className="title">Profiling AI</span>
      </div>

      <div className="header-right">
        <SearchOutlined className="icon" />
        <Badge count={11} className="icon">
          <BellOutlined className="badge-icon" />
        </Badge>
        <QuestionCircleOutlined className="icon" />
        <UserOutlined className="icon" />
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="avatar" style={{ cursor: 'pointer' }}>
            <Avatar src={avatar} />
            <Text className="text">{user?.name || user?.email || 'User'}</Text>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export default Header;
