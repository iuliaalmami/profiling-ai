import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout,
  Typography,
  Space,
  Breadcrumb,
  Card,
  Tag,
  Button,
  Spin,
  message,
} from 'antd';
import { ArrowLeftOutlined, UserOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';
import AiSideChat from '../../components/AiSideChat/AiSideChat';
import './ProfileChat.scss';

const { Content } = Layout;
const { Title, Text } = Typography;

interface CVData {
  id: number;
  name: string;
  email: string;
  experience: Array<{
    role?: string;
    title?: string;
    company?: string;
    duration?: string;
    description?: string;
  }>;
  skills: string[];
  last_update: string;
}

interface ProfileChatData {
  id: number;
  title: string;
  owner_id: number;
  cv_id: number;
  created_at: string;
}

const ProfileChatPage = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const { } = useAuth();
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [chatData, setChatData] = useState<ProfileChatData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chatId) {
      fetchProfileChatData();
    }
  }, [chatId]);

  const fetchProfileChatData = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/api/v1/profile-chat/${chatId}`);
      
      if (response.ok) {
        const data = await response.json();
        setChatData(data.chat);
        setCvData(data.cv);
      } else {
        message.error('Failed to fetch profile chat data');
        navigate('/profiles');
      }
    } catch (error) {
      console.error('Error fetching profile chat data:', error);
      message.error('An error occurred while fetching data');
      navigate('/profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProfiles = () => {
    navigate('/profiles');
  };

  if (loading) {
    return (
      <Layout className="profile-chat-layout">
        <Content className="profile-chat-content">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Spin size="large" />
            <div style={{ marginTop: '20px' }}>Loading profile chat...</div>
          </div>
        </Content>
      </Layout>
    );
  }

  if (!cvData || !chatData) {
    return (
      <Layout className="profile-chat-layout">
        <Content className="profile-chat-content">
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <Text type="danger">Profile chat not found</Text>
            <br />
            <Button type="primary" onClick={handleBackToProfiles} style={{ marginTop: '20px' }}>
              Back to Profiles
            </Button>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="profile-chat-layout">
      <Content className="profile-chat-content">
        <div className="profile-chat-header">
          <Breadcrumb items={[
            { title: 'Home' }, 
            { title: 'Profiles' }, 
            { title: 'Profile Chat' }
          ]} />
          
          <Space>
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={handleBackToProfiles}
              style={{ marginRight: 16 }}
            >
              Back to Profiles
            </Button>
            <Title level={2} style={{ marginBottom: 0 }}>
              {chatData.title}
            </Title>
          </Space>
        </div>

        <div className="profile-chat-main">
          {/* CV Information Section */}
          <div className="cv-information-section">
            <Title level={3}>CV Information</Title>
            
            {/* Basic Info Card */}
            <Card className="info-card">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div className="basic-info">
                  <div className="info-item">
                    <UserOutlined className="info-icon" />
                    <div className="info-content">
                      <Text strong>Name</Text>
                      <Text>{cvData.name}</Text>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <MailOutlined className="info-icon" />
                    <div className="info-content">
                      <Text strong>Email</Text>
                      <Text>{cvData.email}</Text>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <CalendarOutlined className="info-icon" />
                    <div className="info-content">
                      <Text strong>Last Updated</Text>
                      <Text>
                        {new Date(cvData.last_update).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </div>
                  </div>
                </div>
              </Space>
            </Card>

            {/* Skills Card */}
            <Card className="info-card" title="Skills & Expertise">
              <div className="skills-container">
                {cvData.skills && cvData.skills.length > 0 ? (
                  cvData.skills.map((skill, index) => (
                    <Tag key={index} className="skill-tag">
                      {skill}
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">No skills listed</Text>
                )}
              </div>
            </Card>

            {/* Experience Card */}
            <Card className="info-card" title="Experience">
              <div className="experience-container">
                {cvData.experience && cvData.experience.length > 0 ? (
                  cvData.experience.map((exp, index) => (
                    <div key={index} className="experience-item">
                      <div className="experience-header">
                        <Text strong>{exp.role || exp.title || 'Unknown Role'}</Text>
                        {exp.company && (
                          <Text type="secondary"> at {exp.company}</Text>
                        )}
                      </div>
                      {exp.duration && (
                        <Text type="secondary" className="experience-duration">
                          {exp.duration}
                        </Text>
                      )}
                      {exp.description && (
                        <Text className="experience-description">
                          {exp.description}
                        </Text>
                      )}
                    </div>
                  ))
                ) : (
                  <Text type="secondary">No experience information available</Text>
                )}
              </div>
            </Card>
            
            {/* Add some extra content to test scrolling */}
            <Card className="info-card" title="Additional Information">
              <Text type="secondary">
                This is additional content to test scrolling behavior. 
                The left side should be scrollable when there's more content than fits in the viewport.
              </Text>
            </Card>
          </div>

          {/* AI Chat Section */}
          <div className="ai-chat-section">
            <Title level={3}>AI Chat</Title>
            <div className="chat-container">
              <AiSideChat 
                key={chatId} // Force re-mount when chatId changes to prevent old messages from persisting
                chatId={chatId!}
                isProfileChat={true}
                profileContext={{
                  name: cvData.name,
                  cvData: cvData
                }}
              />
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default ProfileChatPage;
