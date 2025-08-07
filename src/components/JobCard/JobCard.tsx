import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import './JobCard.scss';

const { Text } = Typography;

interface Job {
  id: number;
  title: string;
  skills: string[];
  description: string;
  postedDate: string;
  matches: number;
}

const JobCard = ({ job }: { job: Job }) => {
  const { id, title, skills, postedDate, matches } = job;

  return (
    <Card 
      size="small"
      className="job-card"
      styles={{ body: { padding: '12px 16px' } }}
    >
      {/* Horizontal layout: Left section (title + metadata) | Right section (skills) */}
      <div className="job-card__content">
        {/* Left: Title with match count and date below */}
        <div className="job-card__left-section">
          <div className="job-card__title-container">
            <Link 
              to={`/matches/${id}`} 
              className="job-card__title-link"
            >
              {title}
            </Link>
          </div>
          
          <div className="job-card__metadata">
            <Tooltip title={`${matches} matches`}>
              <div className="job-card__match-info">
                <UserOutlined style={{ fontSize: '12px' }} />
                <Text strong style={{ fontSize: '12px' }}>{matches} matches</Text>
              </div>
            </Tooltip>
            
            <Text type="secondary" className="job-card__date">
              {postedDate}
            </Text>
          </div>
        </div>

        {/* Right: Skills */}
        <div className="job-card__right-section">
          {skills.length > 0 && (
            <Space size={[4, 4]} wrap>
              {skills.slice(0, 4).map(skill => (
                <Tag key={skill} color="blue">
                  {skill}
                </Tag>
              ))}
              {skills.length > 4 && (
                <Text type="secondary" className="job-card__skills-more">
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
