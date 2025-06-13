import Button from 'antd/es/button';
import './Dashboard.scss';

import { Tabs } from 'antd';
import JobDescription from '../../components/JobDescription/JobDescription';

const { TabPane } = Tabs;

const DashboardPage = () => {
  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="dashboard-header-top">
          <h3>Dashboard Header</h3>
          <Button type="primary" className="new-match-btn">
            New match
          </Button>
        </div>
        <div className="dashboard-header-tabs">
          <Tabs className="ant-tabs" defaultActiveKey="1" type="line">
            <TabPane tab="Job Description" key="1">
              <JobDescription />
            </TabPane>
            <TabPane tab="Profiles" key="2">
              <p>profiles content</p>
            </TabPane>
            <TabPane tab="Trends" key="3">
              <p>trends content</p>
            </TabPane>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
