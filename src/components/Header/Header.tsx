import {
  BellOutlined,
  SearchOutlined,
  UserOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import { Avatar, Badge, Typography } from 'antd';
import header from '../../assets/global-header.png';
import avatar from '../../assets/avatar.png';
import './Header.scss';

const { Text } = Typography;

const Header = () => {
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
        <div className="avatar">
          <Avatar src={avatar} />
          <Text className="text">John Doe</Text>
        </div>
      </div>
    </header>
  );
};

export default Header;
