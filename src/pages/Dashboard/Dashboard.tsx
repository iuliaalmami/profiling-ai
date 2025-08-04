import { useState } from 'react';
import { Button, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import JobDescription from '../../components/JobDescription/JobDescription';
import './Dashboard.scss';

const DashboardPage = () => {
  const [activeKey, setActiveKey] = useState('1');
  const navigate = useNavigate();

  const items = [
    { key: '1', label: 'Job Description' },
    { key: '2', label: 'Profiles' },
    { key: '3', label: 'Trends' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <h3>Dashboard</h3>
          <Button type="primary" className="new-match-btn" onClick={() => navigate('/chat/:id')}>
            New match
          </Button>
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
        {activeKey === '1' && <JobDescription />}
        {activeKey === '2' && <p>profiles content</p>}
        {activeKey === '3' && <p>trends content</p>}
      </div>
    </div>
  );
};

export default DashboardPage;
