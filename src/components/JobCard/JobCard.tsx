import { Card, Tag, Typography, Space, Tooltip } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Job {
  title: string;
  client: string;
  skills: string[];
  description: string;
  postedDate: string;
  matches: number;
}

const JobCard = ({ job }: { job: Job }) => {
  const { title, client, skills, description, postedDate, matches } = job;

  return (
    <Card title={`${title} - ${client}`}>
      <Space size={[8, 8]} wrap>
        {skills.map(skill => (
          <Tag
            key={skill}
            closable
            onClose={e => {
              e.preventDefault();
            }}
          >
            {skill}
          </Tag>
        ))}
      </Space>

      <Paragraph>{description}</Paragraph>

      <Space size="middle">
        <div
          style={{
            padding: '4px 12px',
            borderRadius: 4,
            minWidth: 100,
            textAlign: 'center',
          }}
        >
          <Text strong>{postedDate}</Text>
        </div>

        <Tooltip title={`${matches} matches`}>
          <div
            style={{
              border: '1px solid #d9d9d9',
              padding: '4px 12px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minWidth: 100,
              justifyContent: 'center',
            }}
          >
            <UserOutlined />
            <Text strong>{matches} matches</Text>
          </div>
        </Tooltip>
      </Space>
    </Card>
  );
};

export default JobCard;
