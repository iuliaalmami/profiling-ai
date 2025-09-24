import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Spin, Alert, Tag } from 'antd';
import { UserOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';
import './Reports.scss';

interface ReportsData {
  total_cvs: number;
  total_people: number;
  availability_percentage: number;
  tracked_departments: string[];
  tracked_departments_count: number;
}

const Reports: React.FC = () => {
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/reports');
      const data = await response.json();
      setReportsData(data.reports);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <Spin size="large" />
        <p>Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Reports"
        description={error}
        type="error"
        showIcon
        action={
          <button onClick={fetchReports} className="retry-button">
            Retry
          </button>
        }
      />
    );
  }

  if (!reportsData) {
    return (
      <Alert
        message="No Data Available"
        description="No reports data available at this time."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h3>Profiles Reports</h3>
        <p>Overview of CV availability across tracked departments</p>
      </div>

      <Row gutter={[16, 16]} className="reports-stats">
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total CVs"
              value={reportsData.total_cvs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total People"
              value={reportsData.total_people}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Availability"
              value={reportsData.availability_percentage}
              suffix="%"
              valueStyle={{ 
                color: reportsData.availability_percentage >= 50 ? '#52c41a' : '#faad14' 
              }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tracked Departments"
              value={reportsData.tracked_departments_count}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Tracked Departments" className="departments-card">
        <div className="departments-list">
          {reportsData.tracked_departments.map((dept, index) => (
            <Tag key={index} color="blue" className="department-tag">
              {dept}
            </Tag>
          ))}
        </div>
      </Card>

      <Card title="Summary" className="summary-card">
        <div className="summary-content">
          <p>
            Out of <strong>{reportsData.total_people}</strong> people across{' '}
            <strong>{reportsData.tracked_departments_count}</strong> tracked departments,
            we have CVs for <strong>{reportsData.total_cvs}</strong> people, 
            representing a <strong>{reportsData.availability_percentage}%</strong> availability rate.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
