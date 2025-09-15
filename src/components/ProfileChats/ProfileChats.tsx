import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Typography, Button, Space, Tag, Spin, Empty, message, Pagination } from 'antd';
import { MessageOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';
import './ProfileChats.scss';

const { Title, Text } = Typography;

interface ProfileChat {
  id: number;
  title: string;
  owner_id: number;
  cv_id: number;
  created_at: string;
}

const ProfileChats = () => {
  const navigate = useNavigate();
  const { } = useAuth();
  const [profileChats, setProfileChats] = useState<ProfileChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    fetchProfileChats();
  }, []);

  const fetchProfileChats = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/v1/profile-chats`);
      
      if (response.ok) {
        const data = await response.json();
        setProfileChats(data);
      } else {
        message.error('Failed to fetch profile chats');
      }
    } catch (error) {
      console.error('Error fetching profile chats:', error);
      message.error('An error occurred while fetching profile chats');
    } finally {
      setLoading(false);
    }
  };

  const handleChatClick = (chat: ProfileChat) => {
    navigate(`/profile-chat/${chat.id}`);
  };

  const handleDeleteChat = async (chat: ProfileChat, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await api.delete(`${API_BASE_URL}/api/v1/profile-chat/${chat.id}`);
      
      if (response.ok) {
        message.success('Profile chat deleted successfully');
        // Remove from local state
        setProfileChats(prev => prev.filter(c => c.id !== chat.id));
      } else {
        message.error('Failed to delete profile chat');
      }
    } catch (error) {
      console.error('Error deleting profile chat:', error);
      message.error('An error occurred while deleting the chat');
    }
  };

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate paginated data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = profileChats.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="profile-chats-loading">
        <Spin size="large" />
        <div style={{ marginTop: '20px' }}>Loading profile chats...</div>
      </div>
    );
  }

  if (profileChats.length === 0) {
    return (
      <div className="profile-chats-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No profile chats yet"
        >
          <Text type="secondary">
            Start chatting with AI about specific profiles to see them here.
          </Text>
        </Empty>
      </div>
    );
  }

  return (
    <div className="profile-chats-container">
      <div className="profile-chats-header">
        <Title level={4}>Profile Chats</Title>
        <Text type="secondary">
          Your AI conversations about specific profiles
        </Text>
      </div>

      <List
        className="profile-chats-list"
        itemLayout="horizontal"
        dataSource={paginatedData}
        renderItem={(chat) => (
          <List.Item
            className="profile-chat-item"
            actions={[
              <Button
                key="delete"
                type="text"
                danger
                size="small"
                onClick={(e) => handleDeleteChat(chat, e)}
              >
                Delete
              </Button>
            ]}
            onClick={() => handleChatClick(chat)}
          >
            <List.Item.Meta
              avatar={
                <div className="chat-avatar">
                  <MessageOutlined />
                </div>
              }
              title={
                <Space>
                  <Text strong>{chat.title}</Text>
                  <Tag color="blue">Profile Chat</Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size="small">
                  <Space>
                    <CalendarOutlined />
                    <Text type="secondary">{formatDate(chat.created_at)}</Text>
                  </Space>
                  <Space>
                    <UserOutlined />
                    <Text type="secondary">CV ID: {chat.cv_id}</Text>
                  </Space>
                </Space>
              }
            />
          </List.Item>
        )}
      />
      
      {profileChats.length > pageSize && (
        <div className="pagination-container" style={{ 
          marginTop: '20px', 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={profileChats.length}
            showSizeChanger={true}
            showQuickJumper={true}
            pageSizeOptions={['5', '10', '20', '50']}
            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} chats`}
            onChange={handlePaginationChange}
            onShowSizeChange={handlePaginationChange}
          />
        </div>
      )}
    </div>
  );
};

export default ProfileChats;
