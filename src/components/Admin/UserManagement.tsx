import { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, message, Switch, Checkbox, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { UserOutlined, CrownOutlined, CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';
import './UserManagement.scss';

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [includeInactive]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = includeInactive ? '/admin/users?include_inactive=true' : '/admin/users';
      const response = await api.get(url);
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/toggle-admin`);
      message.success('Admin status updated successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error toggling admin status:', err);
      message.error('Failed to update admin status');
    }
  };

  const toggleActive = async (userId: number) => {
    try {
      await api.post(`/admin/users/${userId}/toggle-active`);
      message.success('User status updated successfully');
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('Error toggling active status:', err);
      message.error('Failed to update user status');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string, record: User) => (
        <Space>
          <UserOutlined />
          <span style={{ 
            color: record.is_active ? 'inherit' : '#999',
            fontStyle: record.is_active ? 'normal' : 'italic'
          }}>
            {email}
          </span>
        </Space>
      ),
    },
    {
      title: 'Admin',
      dataIndex: 'is_admin',
      key: 'is_admin',
      width: 100,
      render: (isAdmin: boolean, record: User) => (
        <Switch
          checked={isAdmin}
          onChange={() => toggleAdmin(record.id)}
          checkedChildren={<CrownOutlined />}
          unCheckedChildren={<UserOutlined />}
        />
      ),
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (isActive: boolean, record: User) => (
        <Switch
          checked={isActive}
          onChange={() => toggleActive(record.id)}
          checkedChildren={<CheckCircleOutlined />}
          unCheckedChildren={<CloseCircleOutlined />}
        />
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
          return <Tag color="blue">{formattedDate}</Tag>;
        } catch {
          return <Tag color="default">Invalid Date</Tag>;
        }
      },
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => {
        const date = new Date(createdAt);
        return <Tag color="green">{date.toLocaleDateString()}</Tag>;
      },
    },
  ];

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <Button onClick={fetchUsers}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="user-management">
      <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
        <Col>
          <Checkbox
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          >
            <Space>
              <EyeOutlined />
              Show inactive users
            </Space>
          </Checkbox>
        </Col>
        <Col>
          <Tag color="blue">
            {users.length} user{users.length !== 1 ? 's' : ''} total
          </Tag>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        rowClassName={(record) => record.is_active ? '' : 'inactive-user-row'}
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

export default UserManagement;
