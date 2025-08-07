import { Breadcrumb, Button, Typography, Card, Avatar, Row, Col, Spin, Tag, message } from 'antd';
import './ProfileDetails.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';

import avatar from '../../assets/avatar.png';
import { useParams, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
interface CVData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    role: string;
    company: string;
    duration?: string;
  }>;
  last_update?: string;
}





const ProfileDetails = () => {
  const { } = useAuth();
  const { cvId } = useParams<{ cvId: string }>();
  const location = useLocation();

  // Get match data from navigation state (if coming from matches page)
  const matchData = location.state as {
    score?: number;
    jobTitle?: string;
    chatId?: string;
    matchId?: string | number;
    matchSummary?: string; // Summary passed directly from matches page
  } | null;

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [matchSummary, setMatchSummary] = useState<string>('');
  const [jobPrompt, setJobPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllExperience, setShowAllExperience] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!cvId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // If we have a match_id, use the complete match endpoint (Step 3 of data flow)
        if (matchData?.matchId) {
          const matchResponse = await api.get(`${API_BASE_URL}/api/v1/match/${matchData.matchId}`);
          
          if (matchResponse.ok) {
            const completeMatchData = await matchResponse.json();
            
            // Set CV data from the complete match response
            if (completeMatchData.cv) {
              setCvData(completeMatchData.cv);
            }
            
            // Set match summary from the complete match response
            const summary = completeMatchData.summary || 
                           completeMatchData.match_summary || 
                           completeMatchData.description || 
                           completeMatchData.explanation || 
                           completeMatchData.reasoning || '';
            
            if (summary) {
              setMatchSummary(summary);
            }
            
            // Set job prompt from the complete match response
            const jobPromptFromApi = completeMatchData.job_prompt || 
                                   completeMatchData.job_title || 
                                   completeMatchData.job_description || '';
            
            if (jobPromptFromApi) {
              setJobPrompt(jobPromptFromApi);
            }
            
            return; // Successfully got complete data, no need for fallback
          } else {
            console.error('[ProfileDetails] Failed to fetch complete match data:', matchResponse.status);
            // Fall back to CV-only endpoint
          }
        }
        
        // Fallback: Use CV-only endpoint if no match_id or if match endpoint failed
        await fetchCvOnly();
        
        // Set match summary from navigation state as fallback
        if (matchData?.matchSummary) {
          setMatchSummary(matchData.matchSummary);
        }
        
        // Set job prompt from navigation state as fallback
        if (matchData?.jobTitle) {
          setJobPrompt(matchData.jobTitle);
        }
      } catch (error) {
        console.error('[ProfileDetails] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCvOnly = async () => {
      try {
        // Fetch CV data only (no embeddings as per new API)
        const cvResponse = await api.get(`${API_BASE_URL}/api/v1/cv/${cvId}`);

        if (cvResponse.ok) {
          const cvDataResponse = await cvResponse.json();
          setCvData(cvDataResponse);
        } else {
          console.error('[ProfileDetails] Failed to fetch CV data:', cvResponse.status);
        }
      } catch (error) {
        console.error('[ProfileDetails] Error fetching CV-only data:', error);
      }
    };

    fetchData();
  }, [cvId, matchData?.matchId]);

  const handleExportProfile = async () => {
    if (!cvId) {
      console.error('[ProfileDetails] No CV ID available for export');
      return;
    }

    setExportLoading(true);

    try {
      console.log('[ProfileDetails] Starting PDF export for CV ID:', cvId);
      
      // Make API request to download PDF
      const response = await api.get(`${API_BASE_URL}/api/v1/download-pdf/${cvId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
      }
      
      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename - use CV name if available, otherwise use CV ID
      const filename = cvData?.name 
        ? `${cvData.name.replace(/[^a-zA-Z0-9]/g, '_')}_CV.pdf`
        : `CV_${cvId}.pdf`;
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('[ProfileDetails] PDF export completed successfully');
      message.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('[ProfileDetails] Error exporting PDF:', error);
      message.error('Failed to export PDF. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-details profile-details__loading-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!cvData) {
    return (
      <div className="profile-details">
        <Typography.Title level={3}>Profile not found</Typography.Title>
        <Typography.Paragraph>The requested profile could not be loaded.</Typography.Paragraph>
      </div>
    );
  }

  // Extract current role from first experience entry
  const currentRole =
    cvData.experience && cvData.experience.length > 0 ? cvData.experience[0].role : 'Professional';

  return (
    <div className="profile-details">
      {/* Header */}
      <div className="profile-details-header">
        <Breadcrumb
          items={[
            { title: 'Home' },
            { title: 'Talent Searches' },
            { title: jobPrompt || matchData?.jobTitle || 'Job Search' },
            { title: 'Profile Details' },
          ]}
        />
        <div className="profile-details-header-row">
          <div className="profile-info">
            <Avatar size={64} src={avatar} />
            <div>
              <Typography.Title level={4} className="candidate-name">
                {cvData.name} – {currentRole}
              </Typography.Title>
              <Typography.Paragraph className="candidate-meta">
                {cvData.summary ? cvData.summary.substring(0, 100) + '...' : 'Professional profile'}
              </Typography.Paragraph>
            </div>
          </div>
          <Button 
            onClick={handleExportProfile} 
            type="default" 
            className="export-cv-btn"
            loading={exportLoading}
            disabled={exportLoading}
          >
            Export profile (PDF)
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="profile-details-content">
        <div className="profile-details-content-left">
          {/* Job Match Section - only show if we have match data */}
          {matchData && (
            <Card className="job-match-card">
              <div className="job-match-info">
                <div>
                  <Typography.Text className="job-title">Job Match:</Typography.Text>
                  <Typography.Text className="job-role">
                    {jobPrompt || matchData?.jobTitle || 'Job Position'}
                  </Typography.Text>
                </div>
                <Typography.Text className="match-score">
                  Match Score: <span>{matchData.score}%</span>
                </Typography.Text>
              </div>
              <Typography.Paragraph className="job-description">
                The score is based on {cvData.name}'s experience and skills alignment with the job
                requirements.
              </Typography.Paragraph>
            </Card>
          )}

          {/* Contact Info */}
          <Card className="contact-info-card">
            <Row gutter={[16, 16]} className="info-grid">
              <Col xs={24} md={8}>
                <Typography.Text className="label">Email</Typography.Text>
                <Typography.Paragraph className="value">
                  {cvData.email || 'Not provided'}
                </Typography.Paragraph>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text className="label">Phone</Typography.Text>
                <Typography.Paragraph className="value">
                  {cvData.phone || 'Not provided'}
                </Typography.Paragraph>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text className="label">LinkedIn</Typography.Text>
                <Typography.Paragraph className="value">
                  {cvData.linkedin ? (
                    <Typography.Link href={cvData.linkedin} target="_blank">
                      {cvData.linkedin}
                    </Typography.Link>
                  ) : (
                    'Not provided'
                  )}
                </Typography.Paragraph>
              </Col>
            </Row>
          </Card>

          {/* Summary */}
          <Card className="summary-card">
            <Typography.Title level={5}>Summary</Typography.Title>
            <Typography.Paragraph>
              {matchSummary || cvData.summary || 'No summary available for this profile.'}
            </Typography.Paragraph>
          </Card>

          {/* Skills and Experience - Side by Side */}
          <Row gutter={[16, 16]} className="skills-experience-row">
            <Col xs={24} lg={12}>
              <Card className="expertise-card">
                <Typography.Title level={5}>Skills</Typography.Title>
                {cvData.skills && cvData.skills.length > 0 ? (
                  <div className="skills-container">
                    <div className="skills-tags">
                      {(showAllSkills ? cvData.skills : cvData.skills.slice(0, 12)).map((skill, index) => (
                        <Tag 
                          key={index} 
                          className="skill-tag"
                          color="blue"
                        >
                          {skill}
                        </Tag>
                      ))}
                    </div>
                    {cvData.skills.length > 12 && (
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => setShowAllSkills(!showAllSkills)}
                        className="profile-details__export-actions"
                      >
                        {showAllSkills 
                          ? `Show less` 
                          : `Show ${cvData.skills.length - 12} more skills`
                        }
                      </Button>
                    )}
                  </div>
                ) : (
                  <Typography.Paragraph>No skills information available.</Typography.Paragraph>
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="experience-card">
                <Typography.Title level={5}>Experience</Typography.Title>
                {cvData.experience && cvData.experience.length > 0 ? (
                  <div className="experience-list">
                    {(showAllExperience ? cvData.experience : cvData.experience.slice(0, 2)).map((exp, index) => (
                      <div key={index} className="experience-item">
                        <div className="experience-header">
                          <Typography.Text className="experience-role">
                            {exp.role}
                          </Typography.Text>
                          {exp.duration && (
                            <Typography.Text className="experience-duration">
                              {exp.duration}
                            </Typography.Text>
                          )}
                        </div>
                        {exp.company && (
                          <Typography.Text className="experience-company">
                            {exp.company}
                          </Typography.Text>
                        )}
                      </div>
                    ))}
                    {cvData.experience.length > 2 && (
                      <Button 
                        type="link" 
                        onClick={() => setShowAllExperience(!showAllExperience)}
                        style={{ padding: 0, marginTop: '8px', height: 'auto' }}
                      >
                        {showAllExperience ? 'Show Less' : `Show More (${cvData.experience.length - 2} more)`}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Typography.Paragraph>No experience information available.</Typography.Paragraph>
                )}
              </Card>
            </Col>
          </Row>
        </div>
        <div className="profile-details-content-right">
          <AiSideChat
            chatId={matchData?.chatId}
            candidateName={cvData.name}
            autoSendContext={!!matchData?.chatId} // Only auto-send if coming from matches page
          />
        </div>
      </div>
    </div>
  );
};

export default ProfileDetails;
