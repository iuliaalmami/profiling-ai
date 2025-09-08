import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Spin, Alert } from 'antd';
import { UserOutlined, FileTextOutlined, MessageOutlined, TrophyOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';

interface SystemStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_cvs: number;
  total_chats: number;
  total_matches: number;
}

const SystemStats = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <button onClick={fetchSystemStats} style={{ marginLeft: '10px' }}>
            Retry
          </button>
        }
      />
    );
  }

  if (!stats) {
    return <div>No data available</div>;
  }

  return (
    <div className="system-stats">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={stats.total_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={stats.active_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Admin Users"
              value={stats.admin_users}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total CVs"
              value={stats.total_cvs}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Chats"
              value={stats.total_chats}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic
              title="Total Matches"
              value={stats.total_matches}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemStats;
