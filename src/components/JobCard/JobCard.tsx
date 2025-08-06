import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface Job {
  id: number;
  title: string;
  skills: string[];
  description: string;
  postedDate: string;
  matches: number;
}

const JobCard = ({ job }: { job: Job }) => {
  const { id, title, skills, description, postedDate, matches } = job;

  return (
    <Card 
      size="small"
      style={{ 
        marginBottom: '8px',
        border: '1px solid #f0f0f0',
        borderRadius: '6px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
      }}
      styles={{ body: { padding: '12px 16px' } }}
    >
      {/* Horizontal layout: Left section (title + metadata) | Right section (skills) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        {/* Left: Title with match count and date below */}
        <div style={{ flex: '0 0 auto', minWidth: '250px' }}>
          <div style={{ marginBottom: '6px' }}>
            <Link 
              to={`/matches/${id}`} 
              style={{ 
                textDecoration: 'none',
                color: '#1890ff',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textDecoration = 'underline';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {title}
            </Link>
          </div>
          
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Tooltip title={`${matches} matches`}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <UserOutlined style={{ fontSize: '12px' }} />
                <Text strong style={{ fontSize: '12px' }}>{matches} matches</Text>
              </div>
            </Tooltip>
            
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {postedDate}
            </Text>
          </div>
        </div>

        {/* Right: Skills */}
        <div style={{ flex: '1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          {skills.length > 0 && (
            <Space size={[4, 4]} wrap>
              {skills.slice(0, 4).map(skill => (
                <Tag key={skill} size="small" color="blue">
                  {skill}
                </Tag>
              ))}
              {skills.length > 4 && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  +{skills.length - 4} more
                </Text>
              )}
            </Space>
          )}
        </div>
      </div>
    </Card>
  );
};

export default JobCard;
