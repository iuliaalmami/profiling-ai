import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Table, Button, Layout, Typography, Space, Row, Col, Breadcrumb } from 'antd';
import './ProfileMatch.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

const ProfileMatch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { chatId } = useParams<{ chatId: string }>();

  const prompt = location.state?.prompt;
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [jobPrompt, setJobPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  
  interface MatchData {
  cv_id: string;
  match_id?: string | number;
  score: number;
  name?: string;
  role?: string;
  last_updated?: string;
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
        console.log(`[matches] Fetching matches for chat ID: ${chatId}`);
        
        // Step 1: Get match scores and cv_ids
        const matchesRes = await fetch(`http://127.0.0.1:8000/api/v1/matches/${chatId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!matchesRes.ok) {
          throw new Error(`Failed to fetch matches: ${matchesRes.status}`);
        }
        
        const matchesData = await matchesRes.json();
        console.log('[matches] ===== RAW MATCHES DATA =====');
        console.log('[matches] Full response:', JSON.stringify(matchesData, null, 2));
        console.log('[matches] Type of response:', typeof matchesData);
        if (Array.isArray(matchesData)) {
          console.log('[matches] Array length:', matchesData.length);
          if (matchesData.length > 0) {
            console.log('[matches] First match keys:', Object.keys(matchesData[0]));
            console.log('[matches] First match sample:', matchesData[0]);
            console.log('[matches] Match ID field check:', {
              'id': matchesData[0].id,
              'match_id': matchesData[0].match_id,
              '_id': matchesData[0]._id,
            });
          }
        } else {
          console.log('[matches] Keys in response:', Object.keys(matchesData));
        }
        
        // Extract job prompt from first match (since all matches have the same job_prompt)
        if (Array.isArray(matchesData) && matchesData.length > 0 && matchesData[0].job_prompt) {
          setJobPrompt(matchesData[0].job_prompt);
          console.log('[matches] Job prompt set from first match:', matchesData[0].job_prompt);
        } else if (matchesData.job_prompt) {
          setJobPrompt(matchesData.job_prompt);
          console.log('[matches] Job prompt set:', matchesData.job_prompt);
        } else {
          console.log('[matches] No job_prompt found in response');
        }
        
        // Step 2: For each match, fetch candidate details
        const enrichedMatches: MatchData[] = [];
        
        // The response is directly an array - process it
        if (Array.isArray(matchesData)) {
          console.log('[matches] Response is directly an array, processing', matchesData.length, 'matches...');
          
          // Step 1: Extract all cv_ids from matches
          const cvIds = matchesData.map(match => match.cv_id);
          console.log('[matches] Collected CV IDs for batch request:', cvIds);
          
          // Step 2: Make single batch request for all CV details
          try {
            const cvBatchRes = await fetch('http://127.0.0.1:8000/api/v1/cvs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cv_ids: cvIds }),
            });
            
            if (cvBatchRes.ok) {
              const cvBatchData = await cvBatchRes.json();
              console.log('[matches] Batch CV response:', cvBatchData);
              
              // Step 3: Create a lookup map for CV data by cv_id
              const cvDataMap = new Map<number, any>();
              if (Array.isArray(cvBatchData)) {
                cvBatchData.forEach((cvData: any) => {
                  if (cvData.id || cvData.cv_id) {
                    cvDataMap.set(cvData.id || cvData.cv_id, cvData);
                  }
                });
              } else if (cvBatchData.cvs && Array.isArray(cvBatchData.cvs)) {
                cvBatchData.cvs.forEach((cvData: any) => {
                  if (cvData.id || cvData.cv_id) {
                    cvDataMap.set(cvData.id || cvData.cv_id, cvData);
                  }
                });
              }
              
              console.log('[matches] Created CV data map with', cvDataMap.size, 'entries');
              
              // Step 4: Process matches with CV data
              const processedMatches = matchesData.map(match => {
                const cvData = cvDataMap.get(match.cv_id);
                
                let candidateName = 'Unknown';
                let candidateRole = 'No role available';
                
                if (cvData) {
                  console.log(`[matches] Processing CV data for ${match.cv_id}:`, cvData);
                  
                  // Extract name
                  candidateName = cvData.name || candidateName;
                  
                  // Extract role from first experience entry
                  if (cvData.experience && Array.isArray(cvData.experience) && cvData.experience.length > 0) {
                    const firstExperience = cvData.experience[0];
                    candidateRole = firstExperience.role || firstExperience.title || candidateRole;
                    console.log(`[matches] Found role from experience for ${match.cv_id}: ${candidateRole}`);
                  } else {
                    // Fallback to other possible role fields
                    candidateRole = cvData.last_job_title || cvData.role || candidateRole;
                    console.log(`[matches] Using fallback role for ${match.cv_id}: ${candidateRole}`);
                  }
                } else {
                  console.warn(`[matches] No CV data found for ${match.cv_id}`);
                }
                
                console.log(`[matches] Processing match for CV ${match.cv_id}:`, {
                  raw_match: match,
                  extracted_match_id: match.id || match.match_id || null,
                  available_keys: Object.keys(match)
                });
                
                return {
                  cv_id: match.cv_id.toString(),
                  match_id: match.id || match.match_id || null,
                  score: match.score || 0,
                  name: candidateName,
                  role: candidateRole,
                  last_updated: match.created_at || new Date().toISOString(),
                };
              });
              
              // Sort by score (highest first) and then add to enrichedMatches
              const sortedMatches = processedMatches.sort((a, b) => b.score - a.score);
              enrichedMatches.push(...sortedMatches);
              
            } else {
              console.error('[matches] Batch CV request failed:', cvBatchRes.status);
              // Fallback: create matches without CV details
              const fallbackMatches = matchesData.map(match => {
                console.log(`[matches] FALLBACK: Processing match for CV ${match.cv_id}:`, {
                  raw_match: match,
                  extracted_match_id: match.id || match.match_id || null,
                  available_keys: Object.keys(match)
                });
                
                return {
                  cv_id: match.cv_id.toString(),
                  match_id: match.id || match.match_id || null,
                  score: match.score || 0,
                  name: 'Unknown',
                  role: 'No role available',
                  last_updated: match.created_at || new Date().toISOString(),
                };
              });
              const sortedFallback = fallbackMatches.sort((a, b) => b.score - a.score);
              enrichedMatches.push(...sortedFallback);
            }
          } catch (cvBatchErr) {
            console.error('[matches] Error in batch CV request:', cvBatchErr);
            // Fallback: create matches without CV details
            const fallbackMatches = matchesData.map(match => ({
              cv_id: match.cv_id.toString(),
              score: match.score || 0,
              name: 'Unknown',
              role: 'No role available',
              last_updated: match.created_at || new Date().toISOString(),
            }));
            const sortedFallback = fallbackMatches.sort((a, b) => b.score - a.score);
            enrichedMatches.push(...sortedFallback);
          }
        } else {
          console.log('[matches] Response is not an array. Available keys:', Object.keys(matchesData));
        }
        
        console.log('[matches] ===== FINAL RESULTS =====');
        console.log('[matches] Total enriched matches:', enrichedMatches.length);
        console.log('[matches] Final enriched matches:', enrichedMatches);
        console.log('[matches] About to set state with:', enrichedMatches);
        
        setMatches(enrichedMatches);
        
      } catch (err: any) {
        console.error('[matches] ===== ERROR =====');
        console.error('[matches] Error fetching matches:', err);
        console.error('[matches] Error details:', {
          message: err?.message,
          stack: err?.stack
        });
        setMatches([]);
      } finally {
        console.log('[matches] ===== FETCH COMPLETE =====');
        setLoading(false);
      }
    };

    fetchMatches();
  }, [chatId, prompt, navigate]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: MatchData) => (
        <a 
          href="#" 
          style={{ color: '#1890ff' }}
          onClick={(e) => {
            e.preventDefault();
            console.log(`[matches] Navigate to profile details for CV: ${record.cv_id}`);
            // TODO: Navigate to profile details page
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
        const color = percentage >= 90 ? 'green' : percentage >= 80 ? 'blue' : percentage >= 70 ? 'orange' : 'red';

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
            minute: '2-digit'
          });
        } catch {
          return dateString;
        }
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: MatchData) => (
        <Space>
          <Button 
            type="link" 
            className="details-link"
            onClick={() => {
              console.log(`[matches] View details for CV: ${record.cv_id}, Match ID: ${record.match_id}`);
              navigate(`/profile/${record.cv_id}`, {
                state: {
                  score: record.score,
                  jobTitle: jobPrompt,
                  chatId: chatId,
                  matchId: record.match_id
                }
              });
            }}
          >
            Details
          </Button>
          <Button 
            type="link" 
            className="remove-link"
            onClick={() => {
              console.log(`[matches] Remove CV: ${record.cv_id}`);
              // TODO: Implement remove functionality
            }}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="matches-layout">
      <Content className="matches-left">
        <div className="matches-page-header">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />
          
          <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
            <Col>
              <Title level={2} style={{ marginBottom: 0 }}>
                {jobPrompt || 'Job Search Results'}
              </Title>
            </Col>
            <Col>
              <Space>
                <Button type="default" onClick={() => navigate('/chat/new')}>
                  New search with this JD
                </Button>
                <Button danger>Delete</Button>
              </Space>
            </Col>
          </Row>
          
          {jobPrompt && (
            <div className="job-description-section" style={{ marginTop: 16, marginBottom: 24 }}>
              <Paragraph type="secondary">
                {jobPrompt}
              </Paragraph>
            </div>
          )}
        </div>

        <div className="profile-matches-section">
          <Title level={4} style={{ marginBottom: 16 }}>Profile Matches</Title>
          <Table
            dataSource={matches}
            columns={columns}
            rowKey="cv_id"
            rowSelection={rowSelection}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
            }}
            rowClassName={() => 'custom-row-spacing'}
            loading={loading}
            locale={{
              emptyText: loading ? 'Loading matches...' : 'No matches found'
            }}
          />
        </div>
      </Content>
      <AiSideChat chatId={chatId} autoClearContext={true} />
    </Layout>
  );
};

export default ProfileMatch;
