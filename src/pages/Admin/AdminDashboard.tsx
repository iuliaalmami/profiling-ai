import { useState } from 'react';
import { Tabs } from 'antd';
import UserManagement from '../../components/Admin/UserManagement.tsx';
import SystemStats from '../../components/Admin/SystemStats.tsx';
import UserActivityLogs from '../../components/Admin/UserActivityLogs.tsx';
import AdminActions from '../../components/Admin/AdminActions.tsx';
import Reports from '../../components/Admin/Reports.tsx';
import './AdminDashboard.scss';

const AdminDashboard = () => {
  const [activeKey, setActiveKey] = useState('1');

  const items = [
    { key: '1', label: 'System Stats' },
    { key: '2', label: 'User Management' },
    { key: '3', label: 'Activity Logs' },
    { key: '4', label: 'Actions' },
    { key: '5', label: 'Reports' },
  ];

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-header">
        <div className="admin-dashboard-header-top">
          <h3>Admin Dashboard</h3>
        </div>

        <div className="tabs-container">
          <Tabs
            className="ant-tabs"
            activeKey={activeKey}
            onChange={key => setActiveKey(key)}
            items={items}
            type="line"
          />
        </div>
      </div>

      <div className="tab-content-container">
        {activeKey === '1' && <SystemStats />}
        {activeKey === '2' && <UserManagement />}
        {activeKey === '3' && <UserActivityLogs />}
        {activeKey === '4' && <AdminActions />}
        {activeKey === '5' && <Reports />}
      </div>
    </div>
  );
};

export default AdminDashboard;
