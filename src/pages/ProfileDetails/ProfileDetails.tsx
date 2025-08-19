import { Breadcrumb, Button, Typography, Card, Avatar, Row, Col, Spin, Tag, message, Modal } from 'antd';
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
  const [rewriteLoading, setRewriteLoading] = useState(false);
  const [rewriteResult, setRewriteResult] = useState<any>(null);
  const [showRewriteModal, setShowRewriteModal] = useState(false);

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
        ? `${cvData.name.replace(/[^a-zA-Z0-0]/g, '_')}_CV.pdf`
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

  const handleRewriteCv = async () => {
    if (!cvId) {
      message.error('No CV ID available for rewrite');
      return;
    }

    if (!jobPrompt) {
      message.error('No job description available. Please ensure you came from a match page.');
      return;
    }

    setRewriteLoading(true);

    try {
      console.log('[ProfileDetails] Starting CV rewrite for CV ID:', cvId);
      
      // Call the CV rewrite API
      const response = await api.post(`${API_BASE_URL}/api/v1/cv/${cvId}/rewrite`, {
        job_description: jobPrompt,
        rewrite_instructions: "Focus on highlighting relevant skills and experience for this specific job"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to rewrite CV: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setRewriteResult(result);
      setShowRewriteModal(true);
      
      console.log('[ProfileDetails] CV rewrite completed successfully');
      message.success('CV rewritten successfully!');
      
    } catch (error) {
      console.error('[ProfileDetails] Error rewriting CV:', error);
      message.error('Failed to rewrite CV. Please try again.');
    } finally {
      setRewriteLoading(false);
    }
  };

  const handleDownloadRewrittenCv = async (optimizationId: string) => {
    if (!optimizationId || !cvId || !rewriteResult) {
      message.error('No optimization data available for download.');
      return;
    }

    try {
      // Use the new download endpoint that receives the optimized CV data directly
      const response = await api.post(`${API_BASE_URL}/api/v1/cv/${cvId}/download-optimized`, {
        optimized_cv: rewriteResult.rewritten_cv
      });

      if (!response.ok) {
        throw new Error(`Failed to download optimized CV: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `optimized_cv_${cvId}_${cvData?.name?.replace(' ', '_') || 'profile'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('Optimized CV downloaded successfully!');
    } catch (error) {
      console.error('[ProfileDetails] Error downloading optimized CV:', error);
      message.error('Failed to download optimized CV. Please try again.');
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
          {jobPrompt && (
            <Button 
              onClick={handleRewriteCv} 
              type="primary" 
              className="rewrite-cv-btn"
              loading={rewriteLoading}
              disabled={rewriteLoading}
            >
              Rewrite CV for Job
            </Button>
          )}
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

      {/* CV Rewrite Results Modal */}
      {showRewriteModal && rewriteResult && (
        <Modal
          title={
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginBottom: '8px' }}>
                ✨ CV Optimization Complete
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Professional CV rewrite for maximum job alignment
              </div>
            </div>
          }
          open={showRewriteModal}
          onCancel={() => setShowRewriteModal(false)}
          footer={[
            <Button key="close" onClick={() => setShowRewriteModal(false)}>
              Close
            </Button>,
            rewriteResult.rewritten_cv.optimization_id && (
                <Button
                    key="download"
                    type="primary"
                    icon={<span>📥</span>}
                    onClick={() => handleDownloadRewrittenCv(rewriteResult.rewritten_cv.optimization_id)}
                    style={{ marginLeft: '8px' }}
                >
                    Download Optimized CV
                </Button>
            )
          ]}
          width={1200}
          className="cv-rewrite-modal"
          styles={{ body: { padding: '24px' } }}
        >
          <div className="rewrite-results">
            {/* Premium Summary Section */}
            <div className="rewrite-summary">
                <div style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    color: 'white',
                    marginBottom: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                        <span style={{ fontSize: '24px', marginRight: '12px' }}>
                            {rewriteResult.rewritten_cv.ai_enhanced ? '🤖' : '⚡'}
                        </span>
                        <Typography.Title level={3} style={{ color: 'white', margin: 0 }}>
                            {rewriteResult.rewritten_cv.ai_enhanced ? 'AI-Powered CV Enhancement' : 'Smart CV Optimization'}
                        </Typography.Title>
                    </div>
                    <Typography.Paragraph style={{ color: 'white', fontSize: '16px', margin: 0 }}>
                        {rewriteResult.changes_summary}
                    </Typography.Paragraph>
                    {rewriteResult.rewritten_cv.enhancement_note && (
                        <div style={{ 
                            marginTop: '16px', 
                            padding: '12px', 
                            background: 'rgba(255,255,255,0.2)', 
                            borderRadius: '8px',
                            fontSize: '14px'
                        }}>
                            📝 {rewriteResult.rewritten_cv.enhancement_note}
                        </div>
                    )}
                </div>
            </div>

            {/* CV Comparison - Focus on Experience Only */}
            <div className="cv-comparison" style={{ marginBottom: '32px' }}>
                <Typography.Title level={4} style={{ 
                    textAlign: 'center', 
                    marginBottom: '24px',
                    color: '#1890ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <span style={{ marginRight: '8px' }}>📊</span>
                    Experience Optimization Comparison
                </Typography.Title>
                <Row gutter={[24, 24]}>
                    <Col span={12}>
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ marginRight: '8px' }}>📋</span>
                                    Original Experience
                                </div>
                            } 
                            size="small"
                            style={{ border: '2px solid #f0f0f0' }}
                        >
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {rewriteResult.original_cv.experience && rewriteResult.original_cv.experience.length > 0 ? (
                                    rewriteResult.original_cv.experience.map((exp: any, index: number) => (
                                        <div key={index} style={{ 
                                            padding: '12px', 
                                            border: '1px solid #e8e8e8', 
                                            borderRadius: '6px', 
                                            marginBottom: '12px',
                                            background: '#fafafa'
                                        }}>
                                            <div style={{ fontWeight: 'bold', color: '#1890ff', marginBottom: '4px' }}>
                                                {exp.role || 'Role not specified'}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                                {exp.company || 'Company not specified'}
                                            </div>
                                            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                                {exp.description || 'No description available'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                        No experience data available
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card 
                            title={
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ marginRight: '8px' }}>
                                        {rewriteResult.rewritten_cv.ai_enhanced ? '🚀' : '⚡'}
                                    </span>
                                    {rewriteResult.rewritten_cv.ai_enhanced ? 'AI-Enhanced Experience' : 'Optimized Experience'}
                                </div>
                            } 
                            size="small"
                            style={{ 
                                border: rewriteResult.rewritten_cv.ai_enhanced ? '2px solid #52c41a' : '2px solid #faad14',
                                background: rewriteResult.rewritten_cv.ai_enhanced ? '#f6ffed' : '#fffbe6'
                            }}
                        >
                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                {rewriteResult.rewritten_cv.experience && rewriteResult.rewritten_cv.experience.length > 0 ? (
                                    rewriteResult.rewritten_cv.experience.map((exp: any, index: number) => (
                                        <div key={index} style={{ 
                                            padding: '12px', 
                                            border: '1px solid #d9f7be', 
                                            borderRadius: '6px', 
                                            marginBottom: '12px',
                                            background: '#f6ffed',
                                            position: 'relative'
                                        }}>
                                            {index === 0 && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '8px',
                                                    background: '#52c41a',
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold'
                                                }}>
                                                    TOP PRIORITY
                                                </div>
                                            )}
                                            <div style={{ fontWeight: 'bold', color: '#52c41a', marginBottom: '4px' }}>
                                                {exp.role || 'Role not specified'}
                                            </div>
                                            <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                                                {exp.company || 'Company not specified'}
                                            </div>
                                            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>
                                                {exp.description || 'No description available'}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                                        No experience data available
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* Key Benefits Section */}
            <div style={{ 
                marginTop: '32px', 
                padding: '24px', 
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                borderRadius: '12px',
                color: 'white'
            }}>
                <Typography.Title level={4} style={{ color: 'white', textAlign: 'center', marginBottom: '20px' }}>
                    🎯 Key Benefits of This Optimization
                </Typography.Title>
                <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Increased Relevance</div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                Skills and experience prioritized by job requirements
                            </div>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Enhanced Descriptions</div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                More impactful and professional language
                            </div>
                        </div>
                    </Col>
                    <Col span={8}>
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚀</div>
                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Better Positioning</div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                Strategic organization for maximum impact
                            </div>
                        </div>
                    </Col>
                </Row>
                {rewriteResult.rewritten_cv.ai_enhanced && (
                    <div style={{ 
                        marginTop: '20px', 
                        textAlign: 'center', 
                        padding: '16px', 
                        background: 'rgba(255,255,255,0.2)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>
                            🤖 AI-Powered Enhancement
                        </div>
                        <div style={{ fontSize: '14px', opacity: 0.9 }}>
                            This CV was intelligently optimized using advanced AI algorithms to maximize your chances of getting hired for this specific role.
                        </div>
                    </div>
                )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProfileDetails;
