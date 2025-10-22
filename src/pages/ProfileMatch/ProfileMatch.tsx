import { useEffect, useState, useMemo, memo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Table, Button, Layout, Typography, Space, Row, Col, Breadcrumb, Alert, Input, message, Tag, Tooltip, DatePicker, Modal } from 'antd';
import { SearchOutlined, CopyOutlined, ExclamationCircleOutlined, ClockCircleOutlined, CheckCircleOutlined, QuestionCircleOutlined, DownloadOutlined, FilterOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
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
  const [availabilityFilterDate, setAvailabilityFilterDate] = useState<Dayjs | null>(null);
  const [jobPrompt, setJobPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isStaffingModalOpen, setIsStaffingModalOpen] = useState(false);
  const [selectedStaffingData, setSelectedStaffingData] = useState<StaffingData | null>(null);

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
    availability?: AvailabilityInfo; // NEW: Employee availability data
    staffing_data?: StaffingData | null; // NEW: Staffing solution data
  }

  interface AvailabilityInfo {
    status: string; // "available_now", "assigned", "unknown"
    message: string;
    available_from?: string;
    current_project?: string;
  }

  interface StaffingData {
    employee_id: string;
    name: string;
    community?: string;
    technology?: string;
    location?: string;
    reserved?: string;
    client?: string;
    reserved_start_date?: string;
    tentative_billable_date?: string;
    delivery_director?: string;
    comments?: string;
    previous_project?: string;
  }

  interface CvData {
    id: number;
    cv_id?: number;
    name: string;
    email?: string;
    cognizant_id?: string;
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
    availability?: AvailabilityInfo; // NEW: Employee availability data
    staffing_data?: StaffingData | null; // NEW: Staffing solution data
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
            availability: cvData?.availability, // NEW: Include availability data
            staffing_data: cvData?.staffing_data || null, // NEW: Include staffing data
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

  // Download CSV function
  const handleDownloadCSV = async () => {
    if (!chatId || selectedRowKeys.length === 0) {
      message.warning('Please select profiles to download');
      return;
    }

    setDownloading(true);
    try {
      const response = await api.post(`/matches/${chatId}/download-csv`, selectedRowKeys);
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `matches_chat_${chatId}_${selectedRowKeys.length}_profiles.csv`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      message.success(`CSV downloaded successfully! (${selectedRowKeys.length} profiles)`);
    } catch (error) {
      console.error('Download error:', error);
      message.error('Failed to download CSV. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Filter matches based on search term and availability
  useEffect(() => {
    let filtered = matches;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(match => {
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
        
        // Search in availability status and project
        const availabilityMatch = match.availability ? (
          match.availability.message?.toLowerCase().includes(searchLower) ||
          match.availability.current_project?.toLowerCase().includes(searchLower) ||
          match.availability.status?.toLowerCase().includes(searchLower)
        ) : false;
        
        return nameMatch || roleMatch || skillsMatch || experienceMatch || summaryMatch || availabilityMatch;
      });
    }

    // Apply availability filter - "Available from" (includes those already available)
    if (availabilityFilterDate) {
      filtered = filtered.filter(match => {
        if (!match.availability) {
          return false; // Don't include matches with unknown availability
        }

        const { status, available_from } = match.availability;
        
        if (status === 'available_now') {
          // Available now - always included in "available from" filter
          return true;
        } else if (status === 'assigned' && available_from) {
          // Check if the available_from date is in the past or today
          const availabilityDate = new Date(available_from);
          const today = new Date();
          
          if (availabilityDate <= today) {
            // Assignment has ended - treat as available now
            return true;
          } else {
            // Assignment ends in the future - show if available from selected date or earlier
            const filterDate = availabilityFilterDate.toDate();
            return availabilityDate <= filterDate;
          }
        } else {
          // Unknown availability - don't include in date-based filters
          return false;
        }
      });
    }

    setFilteredMatches(filtered);
  }, [searchTerm, availabilityFilterDate, matches]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Helper function to check if profile is older than 3 months
  const isProfileOutdated = (lastUpdated: string): boolean => {
    if (!lastUpdated) return true; // Consider profiles without update date as outdated
    
    const updateDate = new Date(lastUpdated);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return updateDate < threeMonthsAgo;
  };

  // Helper function to format date as MM/DD/YYYY
  const formatDate = (dateString: string): string => {
    if (!dateString || dateString.trim() === '') {
      return '';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if parsing fails
      }
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const year = date.getFullYear();
      
      return `${month}/${day}/${year}`;
    } catch {
      return dateString; // Return original if any error
    }
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
                availability: record.availability, // NEW: Pass availability data
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
      title: 'Availability',
      dataIndex: 'availability',
      key: 'availability',
      render: (availability: AvailabilityInfo, record: MatchData) => {
        const staffingData = record.staffing_data;
        
        let icon, color, displayText, className, tooltipTitle;
        let showInfoIcon = false;
        
        // First check staffing_data for availability status
        if (staffingData && staffingData.reserved) {
          const reserved = staffingData.reserved.trim();
          
          if (reserved === 'NO') {
            icon = <CheckCircleOutlined />;
            color = 'green';
            displayText = 'Available Now';
            className = 'availability-tag availability-tag--now';
            tooltipTitle = staffingData.client ? `Client: ${staffingData.client}` : 'Available for new assignments';
          } else if (reserved === 'Tentatively') {
            icon = <ExclamationCircleOutlined />;
            color = 'orange';
            displayText = 'Tentatively Reserved';
            className = 'availability-tag availability-tag--tentative';
            tooltipTitle = staffingData.client ? `Tentatively reserved for: ${staffingData.client}` : 'Tentatively reserved';
            showInfoIcon = true;
          } else if (reserved === 'YES') {
            icon = <ExclamationCircleOutlined />;
            color = 'blue';
            displayText = 'Reserved';
            className = 'availability-tag availability-tag--reserved';
            tooltipTitle = staffingData.client ? `Reserved for: ${staffingData.client}` : 'Reserved for client';
            showInfoIcon = true;
          } else if (reserved === 'Future Billable') {
            icon = <ExclamationCircleOutlined />;
            color = 'red';
            displayText = 'Future Billable';
            className = 'availability-tag availability-tag--future-billable';
            tooltipTitle = staffingData.tentative_billable_date 
              ? `Future billable from ${formatDate(staffingData.tentative_billable_date)}` 
              : 'Future billable';
            showInfoIcon = true;
          } else if (reserved === 'Maternity' || reserved === 'EXIT') {
            icon = <ExclamationCircleOutlined />;
            color = 'default';
            displayText = 'Unavailable';
            className = 'availability-tag availability-tag--unavailable';
            tooltipTitle = reserved === 'Maternity' 
              ? 'On maternity leave' 
              : reserved === 'EXIT' 
                ? 'Exiting organization' 
                : 'Currently unavailable';
            showInfoIcon = true;
          } else {
            icon = <QuestionCircleOutlined />;
            color = 'default';
            displayText = 'Unknown';
            className = 'availability-tag availability-tag--unknown';
            tooltipTitle = 'Staffing information not available';
          }
        } else if (availability) {
          // Fall back to availability data from employee_data
          const { status, message, available_from, current_project } = availability;
          
          switch (status) {
            case 'available_now':
              icon = <CheckCircleOutlined />;
              color = 'green';
              displayText = 'Available Now';
              className = 'availability-tag availability-tag--now';
              tooltipTitle = current_project ? `Current Project: ${current_project}` : message;
              break;
            case 'assigned':
              // Check if the available_from date is in the past or today
              if (available_from) {
                const availabilityDate = new Date(available_from);
                const today = new Date();
                
                if (availabilityDate <= today) {
                  // Assignment has ended - show as available now
                  icon = <CheckCircleOutlined />;
                  color = 'green';
                  displayText = 'Available Now';
                  className = 'availability-tag availability-tag--now';
                  tooltipTitle = 'Assignment ended';
                } else {
                  // Assignment ends in the future
                  icon = <ClockCircleOutlined />;
                  color = 'orange';
                  displayText = `From ${available_from}`;
                  className = 'availability-tag availability-tag--assigned';
                  tooltipTitle = current_project ? `Current Project: ${current_project}` : message;
                }
              } else {
                icon = <ClockCircleOutlined />;
                color = 'orange';
                displayText = 'Assigned';
                className = 'availability-tag availability-tag--assigned';
                tooltipTitle = message;
              }
              break;
            default:
              icon = <QuestionCircleOutlined />;
              color = 'default';
              displayText = 'Unknown';
              className = 'availability-tag availability-tag--unknown';
              tooltipTitle = 'Availability information not available';
          }
        } else {
          // No availability or staffing data
          icon = <QuestionCircleOutlined />;
          color = 'default';
          displayText = 'Unknown';
          className = 'availability-tag availability-tag--unknown';
          tooltipTitle = 'Availability information not available';
        }

        return (
          <Space size="small">
            <Tooltip title={tooltipTitle} placement="top" className="availability-tooltip">
              <Tag icon={icon} color={color} className={className}>
                {displayText}
              </Tag>
            </Tooltip>
            {showInfoIcon && (
              <Tooltip title="View staffing details">
                <Button
                  type="text"
                  size="small"
                  icon={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedStaffingData(staffingData!);
                    setIsStaffingModalOpen(true);
                  }}
                  style={{ padding: '0 4px' }}
                />
              </Tooltip>
            )}
          </Space>
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
          const isOutdated = isProfileOutdated(dateString);
          const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{formattedDate}</span>
              {isOutdated && (
                <ExclamationCircleOutlined 
                  style={{ color: '#ff4d4f', fontSize: '14px' }} 
                  title="Profile hasn't been updated in over 3 months"
                />
              )}
            </div>
          );
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
                availability: record.availability, // NEW: Pass availability data
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
              <Col flex="auto">
                <Space size="middle" style={{ width: '100%' }}>
                  {/* Availability Filter */}
                  <Space.Compact>
                    <span style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0 12px', 
                      background: '#f5f5f5', 
                      border: '1px solid #d9d9d9',
                      borderRight: 'none',
                      borderRadius: '6px 0 0 6px',
                      fontSize: '14px',
                      color: '#666',
                      fontWeight: '500'
                    }}>
                      <FilterOutlined style={{ marginRight: '6px' }} />
                      Available from
                    </span>
                    <DatePicker
                      placeholder="Select date"
                      value={availabilityFilterDate}
                      onChange={setAvailabilityFilterDate}
                      style={{ width: 160 }}
                      allowClear
                    />
                  </Space.Compact>
                  
                  {/* Search Input */}
                  <Input.Search
                    placeholder="Search by name, skills, role, company, availability, or summary..."
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="middle"
                    style={{ flex: 1 }}
                    onSearch={handleSearch}
                    onChange={handleSearchChange}
                    value={searchTerm}
                  />
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                    Try searching for: "banking", "Python", "senior developer", "Google", "bench", etc.
                  </Typography.Text>
                </div>
              </Col>
              <Col>
                <Space>
                  {selectedRowKeys.length > 0 && (
                    <Button
                      className="download-btn"
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadCSV}
                      loading={downloading}
                      size="small"
                    >
                      Download CSV ({selectedRowKeys.length})
                    </Button>
                  )}
                  {(searchTerm || availabilityFilterDate) && (
                    <Typography.Text type="secondary">
                      Showing {filteredMatches.length} of {matches.length} matches
                      {searchTerm && ` for "${searchTerm}"`}
                      {availabilityFilterDate && (
                        <span>
                          {searchTerm && ' and '}
                          available from {availabilityFilterDate.format('MMM DD, YYYY')}
                        </span>
                      )}
                    </Typography.Text>
                  )}
                </Space>
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

      {/* Staffing Data Details Modal */}
      <Modal
        title="Staffing Solution Details"
        open={isStaffingModalOpen}
        onCancel={() => {
          setIsStaffingModalOpen(false);
          setSelectedStaffingData(null);
        }}
        footer={[
          <Button key="close" type="primary" onClick={() => {
            setIsStaffingModalOpen(false);
            setSelectedStaffingData(null);
          }}>
            Close
          </Button>
        ]}
        width={700}
        className="staffing-details-modal"
      >
        {selectedStaffingData && (
          <div className="staffing-details-content">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Employee ID:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.employee_id}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Name:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.name}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Community:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.community || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Technology:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.technology || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Location:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.location || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Reserved Status:</Typography.Text>
                  <Tag color={
                    selectedStaffingData.reserved === 'NO' ? 'green' :
                    selectedStaffingData.reserved === 'Tentatively' ? 'orange' :
                    selectedStaffingData.reserved === 'YES' ? 'blue' :
                    selectedStaffingData.reserved === 'Future Billable' ? 'red' :
                    selectedStaffingData.reserved === 'Maternity' ? 'default' :
                    selectedStaffingData.reserved === 'EXIT' ? 'default' :
                    'default'
                  }>
                    {selectedStaffingData.reserved}
                  </Tag>
                </div>
              </Col>
              <Col span={24}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Client:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.client || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Reserved Start Date:</Typography.Text>
                  <Typography.Text>
                    {selectedStaffingData.reserved_start_date 
                      ? formatDate(selectedStaffingData.reserved_start_date) 
                      : 'N/A'}
                  </Typography.Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Tentative Billable Date:</Typography.Text>
                  <Typography.Text>
                    {selectedStaffingData.tentative_billable_date 
                      ? formatDate(selectedStaffingData.tentative_billable_date) 
                      : 'N/A'}
                  </Typography.Text>
                </div>
              </Col>
              <Col span={24}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Delivery Director:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.delivery_director || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={24}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Previous Project:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.previous_project || 'N/A'}</Typography.Text>
                </div>
              </Col>
              <Col span={24}>
                <div className="staffing-detail-item">
                  <Typography.Text strong>Comments:</Typography.Text>
                  <Typography.Text>{selectedStaffingData.comments || 'N/A'}</Typography.Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default memo(ProfileMatch);
