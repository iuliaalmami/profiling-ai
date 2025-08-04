import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Table, Button, Layout, Typography, Space, Spin, Row, Col, Breadcrumb, Input } from 'antd';
import './ProfileMatch.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const ProfileMatch = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const prompt = location.state?.prompt;
  const [matches, setMatches] = useState([]);
  const [jobPrompt, setJobPrompt] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  useEffect(() => {
    if (!prompt) {
      navigate('/chat');
      return;
    }

    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_prompt: prompt,
            session_id: 'default-session',
          }),
        });
        const result = await res.json();
        setJobPrompt(result.job_prompt || '');
        setMatches(result.matches || []);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [prompt, navigate]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (text: string) => <a>{text}</a>,
    },
    {
      title: 'Role',
      dataIndex: 'summary',
      render: (summary: string) => (summary.length > 60 ? summary.slice(0, 60) + '...' : summary),
    },
    {
      title: 'Match',
      dataIndex: 'score',
      render: (score: number) => {
        const color = score >= 90 ? 'green' : score >= 80 ? 'blue' : score >= 70 ? 'orange' : 'red';

        return (
          <div className={`match-dot ${color}`}>
            <span>{score}%</span>
          </div>
        );
      },
    },
    {
      title: 'Profile Last Updated',
      dataIndex: 'last_updated',
    },
    {
      title: 'Actions',
      render: () => (
        <Space>
          <Button type="link" className="details-link">
            Details
          </Button>
          <Button type="link" className="remove-link">
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="matches-layout">
      <Content className="matches-left">
        <div className="matches-left-header">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={4}>{jobPrompt}</Title>
              <Paragraph type="secondary">{jobPrompt}</Paragraph>
            </Col>
            <Col>
              <Space>
                <Button type="default" onClick={() => navigate('/chat')}>
                  New search with this JD
                </Button>
                <Button danger>Delete</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ marginTop: 24 }}>
          {loading ? (
            <Spin />
          ) : (
            <Table
              dataSource={matches}
              columns={columns}
              rowKey="cv_id"
              rowSelection={rowSelection}
              pagination={{ pageSize: 10, showSizeChanger: true }}
              rowClassName={() => 'custom-row-spacing'}
            />
          )}
        </div>
      </Content>
      <AiSideChat />
    </Layout>
  );
};

export default ProfileMatch;
