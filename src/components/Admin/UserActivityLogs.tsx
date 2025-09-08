import { useEffect, useState } from 'react';
import { Table, Card, Row, Col, Statistic, Tag, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, MessageOutlined, TrophyOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';

interface UserActivity {
  user_id: number;
  email: string;
  total_matches: number;
  total_chats: number;
  last_login: string | null;
  is_active: boolean;
}

const UserActivityLogs = () => {
  const [activity, setActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserActivity();
  }, []);

  const fetchUserActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/activity');
      const data = await response.json();
      setActivity(data.activity);
    } catch (err) {
      console.error('Error fetching user activity:', err);
      setError('Failed to load user activity');
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<UserActivity> = [
    {
      title: 'User ID',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 80,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <Space>
          <UserOutlined />
          {email}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Total Chats',
      dataIndex: 'total_chats',
      key: 'total_chats',
      width: 120,
      render: (totalChats: number) => (
        <Space>
          <MessageOutlined />
          {totalChats}
        </Space>
      ),
    },
    {
      title: 'Total Matches',
      dataIndex: 'total_matches',
      key: 'total_matches',
      width: 120,
      render: (totalMatches: number) => (
        <Space>
          <TrophyOutlined />
          {totalMatches}
        </Space>
      ),
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (lastLogin: string | null) => {
        if (!lastLogin) return <Tag color="default">Never</Tag>;
        try {
          const date = new Date(lastLogin);
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
          return (
            <Space>
              <ClockCircleOutlined />
              <Tag color="blue">{formattedDate}</Tag>
            </Space>
          );
        } catch {
          return <Tag color="default">Invalid Date</Tag>;
        }
      },
    },
  ];

  // Calculate summary statistics
  const totalUsers = activity.length;
  const activeUsers = activity.filter(user => user.is_active).length;
  const totalChats = activity.reduce((sum, user) => sum + user.total_chats, 0);
  const totalMatches = activity.reduce((sum, user) => sum + user.total_matches, 0);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={fetchUserActivity}>Retry</button>
      </div>
    );
  }

  return (
    <div className="user-activity-logs">
      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={totalUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Chats"
              value={totalChats}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Matches"
              value={totalMatches}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#eb2f96' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Activity Table */}
      <Table
        columns={columns}
        dataSource={activity}
        loading={loading}
        rowKey="user_id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
        }}
        scroll={{ x: 800 }}
      />
    </div>
  );
};

export default UserActivityLogs;
