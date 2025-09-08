import { useEffect, useState, useMemo, memo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Table, Button, Layout, Typography, Space, Row, Col, Breadcrumb, Alert, Input, message } from 'antd';
import { SearchOutlined, CopyOutlined } from '@ant-design/icons';
// import { useAuth } from '../../contexts/AuthContext'; // Not needed for this component
import { api, API_BASE_URL } from '../../utils/api';
import './ProfileMatch.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const ProfileMatch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();
  // const { token } = useAuth(); // Not needed since api utility handles auth

  const prompt = location.state?.prompt;
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [jobPrompt, setJobPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  interface MatchData {
    cv_id: string;
    match_id?: string | number;
    score: number;
    name?: string;
    role?: string;
    last_updated?: string;
    summary?: string; // Include summary from match data
    job_prompt?: string; // NEW: Job description from backend
    skills?: string[]; // Add skills for search functionality
    experience?: Array<{
      role?: string;
      title?: string;
      company?: string;
      duration?: string;
    }>;
  }

  interface CvData {
    id: number;
    cv_id?: number;
    name: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    summary?: string;
    skills?: string[];
    experience?: Array<{
      role?: string;
      title?: string;
      company?: string;
      duration?: string;
    }>;
    last_job_title?: string;
    role?: string;
    last_update?: string; // Added to match new API response (no embeddings)
  }

  interface MatchWithCvsResponse {
    matches: Array<{
      id?: string | number;
      match_id?: string | number;
      cv_id: number;
      score: number;
      job_prompt?: string;
      created_at?: string;
      last_updated?: string;
      summary?: string;
      name?: string;
    }>;
    cvs: CvData[];
    job_prompt?: string;
  }

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  useEffect(() => {
    if (!chatId) {
      navigate('/chat/new');
      return;
    }

      const fetchMatches = async () => {
    setLoading(true);
    try {
      // Enhanced endpoint: Get both matches and CV data in a single call
      const matchesRes = await api.get(`${API_BASE_URL}/api/v1/matches/${chatId}`);

      if (matchesRes.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!matchesRes.ok) {
        console.error('[ProfileMatch] API error:', matchesRes.status, matchesRes.statusText);
        throw new Error(`Failed to fetch matches: ${matchesRes.status}`);
      }

      const responseData = await matchesRes.json();

      // Handle new response structure: { "matches": [], "cvs": [] }
      let matchesData: MatchWithCvsResponse['matches'];
      let cvsData: CvData[];

      if (responseData.matches && responseData.cvs) {
        // New enhanced structure
        matchesData = responseData.matches;
        cvsData = responseData.cvs;
      } else if (Array.isArray(responseData)) {
        // Fallback: old structure (direct array)
        matchesData = responseData;
        cvsData = [];
      } else {
        // Unknown structure
        console.error('[ProfileMatch] Unexpected response structure:', responseData);
        throw new Error('Unexpected API response structure');
      }

      // Extract job prompt from first match (since all matches have the same job_prompt)
      if (Array.isArray(matchesData) && matchesData.length > 0 && matchesData[0].job_prompt) {
        setJobPrompt(matchesData[0].job_prompt);
      } else if (responseData.job_prompt) {
        setJobPrompt(responseData.job_prompt);
      }

      // Create a lookup map for CV data by cv_id
      const cvDataMap = new Map<number, CvData>();
      if (Array.isArray(cvsData)) {
        cvsData.forEach((cvData: CvData) => {
          const key = cvData.id || cvData.cv_id;
          if (key) {
            cvDataMap.set(key, cvData);
          }
        });
      }

      // Process matches with CV data
      const enrichedMatches: MatchData[] = [];
      if (Array.isArray(matchesData)) {
        const processedMatches = matchesData.map(match => {
          const cvData = cvDataMap.get(match.cv_id);

          let candidateName = 'Unknown';
          let candidateRole = 'No role available';

          if (cvData) {
            // Extract name
            candidateName = cvData.name || candidateName;

            // Extract role from first experience entry
            if (
              cvData.experience &&
              Array.isArray(cvData.experience) &&
              cvData.experience.length > 0
            ) {
              const firstExperience = cvData.experience[0];
              candidateRole = firstExperience.role || firstExperience.title || candidateRole;
            } else {
              // Fallback to other possible role fields
              candidateRole = cvData.last_job_title || cvData.role || candidateRole;
            }
          }

          const result = {
            cv_id: match.cv_id.toString(),
            match_id: match.id || match.match_id || `${chatId}_${match.cv_id}`, // Use actual match_id if available, or create one
            score: match.score || 0,
            name: candidateName,
            role: candidateRole,
            last_updated: match.created_at || match.last_updated || new Date().toISOString(),
            summary: match.summary, // Include the summary from the match data
            job_prompt: match.job_prompt, // NEW: Include job prompt from backend
            skills: cvData?.skills || [], // Include skills for search
            experience: cvData?.experience || [], // Include experience for search
          };
          return result;
        });

        // Sort by score (highest first)
        const sortedMatches = processedMatches.sort((a, b) => b.score - a.score);
        enrichedMatches.push(...sortedMatches);
      }

        setMatches(enrichedMatches);
        setFilteredMatches(enrichedMatches); // Initialize filtered matches
      } catch (error) {
        console.error('[ProfileMatch] Error fetching matches:', error);
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [chatId, prompt, navigate]);

  // Filter matches based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMatches(matches);
      return;
    }

    const filtered = matches.filter(match => {
      const searchLower = searchTerm.toLowerCase();
      
      // Search in name
      const nameMatch = match.name?.toLowerCase().includes(searchLower) || false;
      
      // Search in role
      const roleMatch = match.role?.toLowerCase().includes(searchLower) || false;
      
      // Search in skills
      const skillsMatch = match.skills?.some(skill => 
        skill.toLowerCase().includes(searchLower)
      ) || false;
      
      // Search in experience roles and companies
      const experienceMatch = match.experience?.some(exp => 
        exp.role?.toLowerCase().includes(searchLower) ||
        exp.title?.toLowerCase().includes(searchLower) ||
        exp.company?.toLowerCase().includes(searchLower)
      ) || false;
      
      // Search in summary
      const summaryMatch = match.summary?.toLowerCase().includes(searchLower) || false;
      
      return nameMatch || roleMatch || skillsMatch || experienceMatch || summaryMatch;
    });

    setFilteredMatches(filtered);
  }, [searchTerm, matches]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const columns = useMemo(() => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MatchData) => (
        <a
          href="#"
          className="profile-match__link"
          onClick={e => {
            e.preventDefault();
            navigate(`/profile/${record.cv_id}`, {
              state: {
                score: record.score,
                jobTitle: jobPrompt,
                chatId: chatId,
                matchId: record.match_id,
                matchSummary: record.summary, // Pass the summary directly
              },
            });
          }}
        >
          {text}
        </a>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (role && role.length > 60 ? role.slice(0, 60) + '...' : role),
    },
    {
      title: 'Match',
      dataIndex: 'score',
      key: 'score',
      render: (score: number) => {
        const percentage = Math.round(score);
        const color =
          percentage >= 90
            ? 'green'
            : percentage >= 80
              ? 'blue'
              : percentage >= 70
                ? 'orange'
                : 'red';

        return (
          <div className={`match-dot ${color}`}>
            <span>{percentage}%</span>
          </div>
        );
      },
    },
    {
      title: 'Profile Last Updated',
      dataIndex: 'last_updated',
      key: 'last_updated',
      render: (dateString: string) => {
        try {
          const date = new Date(dateString);
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return dateString;
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: MatchData) => (
        <Button
          type="link"
          className="details-link"
          onClick={() => {
            navigate(`/profile/${record.cv_id}`, {
              state: {
                score: record.score,
                jobTitle: jobPrompt,
                chatId: chatId,
                matchId: record.match_id,
                matchSummary: record.summary, // Pass the summary directly
              },
            });
          }}
        >
          Details
        </Button>
      ),
    },
  ], [jobPrompt, chatId, navigate]);

  // Show access denied message if user doesn't own this match
  if (accessDenied) {
    return (
      <Layout className="profile-match-layout">
        <Content className="profile-match-content">
          <div className="profile-match-header">
            <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />
            
            <div className="profile-match__results-section">
              <Alert
                message="Access Denied"
                description="You don't have permission to view this match. This match belongs to another user or doesn't exist."
                type="error"
                showIcon
                action={
                  <Space>
                    <Button size="small" danger onClick={() => navigate('/dashboard')}>
                      Go to Dashboard
                    </Button>
                    <Button size="small" type="primary" onClick={() => navigate('/chat/new')}>
                      Create New Search
                    </Button>
                  </Space>
                }
              />
            </div>
          </div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="profile-match-layout">
      <Content className="profile-match-content">
        <div className="profile-match-header">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />

          <Row justify="space-between" align="middle" className="profile-match__header-row">
            <Col>
              <Title level={4} className="profile-match__header-title">
                {jobPrompt || 'Job Search Results'}
              </Title>
            </Col>
            <Col>
              <Space>
                {jobPrompt && (
                  <Button 
                    type="primary" 
                    icon={<CopyOutlined />}
                    className="new-match-same-jd-btn"
                    onClick={() => {
                      // Show success message
                      message.success('Job description copied! Starting new search...');
                      
                      // Navigate to new match with pre-filled job description
                      sessionStorage.removeItem('chatId');
                      navigate('/chat/new', {
                        state: {
                          preFilledJobDescription: jobPrompt
                        }
                      });
                    }}
                  >
                    New Match with Same JD
                  </Button>
                )}
                <Button 
                  type="default" 
                  className="new-search-btn"
                  onClick={() => {
                    sessionStorage.removeItem('chatId');
                    navigate('/chat/new');
                  }}
                >
                  New Search
                </Button>
              </Space>
            </Col>
          </Row>

          {jobPrompt && (
            <div className="job-description-section profile-match__job-description-section">
              <Paragraph type="secondary"></Paragraph>
            </div>
          )}
        </div>

        <div className="profile-match-main">
          {/* Matches Section */}
          <div className="matches-section">
            <Title level={3}>Profile Matches</Title>
            
            {/* Search Section */}
            <Row justify="space-between" align="middle" className="profile-match__search-section">
              <Col>
                <Input.Search
                  placeholder="Search by name, skills, role, company, or summary..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  onSearch={handleSearch}
                  onChange={handleSearchChange}
                  value={searchTerm}
                />
                <div style={{ marginTop: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Try searching for: "banking", "React", "senior developer", "Google", etc.
                  </Typography.Text>
                </div>
              </Col>
              <Col>
                {searchTerm && (
                  <Typography.Text type="secondary">
                    Showing {filteredMatches.length} of {matches.length} matches
                    {searchTerm && ` for "${searchTerm}"`}
                  </Typography.Text>
                )}
              </Col>
            </Row>
            
            <Table
              dataSource={filteredMatches}
              columns={columns}
              rowKey="cv_id"
              rowSelection={rowSelection}
              pagination={{
                pageSize: 10,
                showSizeChanger: false, // Remove the dropdown
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
                showQuickJumper: true,
              }}
              rowClassName={() => 'custom-row-spacing'}
              loading={loading}
              locale={{
                emptyText: loading 
                  ? 'Loading matches...' 
                  : searchTerm 
                    ? `No matches found for "${searchTerm}"` 
                    : 'No matches found',
              }}
            />
          </div>
          
          {/* AI Assistant Section */}
          <div className="ai-assistant-section">
            <AiSideChat chatId={chatId} autoClearContext={true} />
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default memo(ProfileMatch);
