import { Breadcrumb, Button, Typography, Card, Avatar, Row, Col, Spin, Tag } from 'antd';
import './ProfileDetails.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';
import { useAuth } from '../../contexts/AuthContext';

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
}

const ProfileDetails = () => {
  const { token } = useAuth();
  const { cvId } = useParams<{ cvId: string }>();
  const location = useLocation();

  // Get match data from navigation state (if coming from matches page)
  const matchData = location.state as {
    score?: number;
    jobTitle?: string;
    chatId?: string;
    matchId?: string | number;
  } | null;

  const [cvData, setCvData] = useState<CVData | null>(null);
  const [matchSummary, setMatchSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAllSkills, setShowAllSkills] = useState(false);

  useEffect(() => {
    if (!cvId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch CV data
        const cvResponse = await fetch(`http://127.0.0.1:8000/api/v1/cv/${cvId}`, {
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (cvResponse.ok) {
          const cvDataResponse = await cvResponse.json();
          setCvData(cvDataResponse);
        } else {
          console.error('[ProfileDetails] Failed to fetch CV data:', cvResponse.status);
        }

        // Fetch match summary if matchId is available
        if (matchData?.matchId) {
          try {
            const matchResponse = await fetch(
              `http://127.0.0.1:8000/api/v1/match/${matchData.matchId}`,
              {
                method: 'GET',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
              },
            );

            if (matchResponse.ok) {
              const matchDataResponse = await matchResponse.json();
              // Extract summary from match data (the structure might vary, so we'll be flexible)
              const summary =
                matchDataResponse.summary ||
                matchDataResponse.match_summary ||
                matchDataResponse.description ||
                matchDataResponse.explanation ||
                matchDataResponse.reasoning ||
                '';

              if (summary) {
                setMatchSummary(summary);
              } else {
                console.log(
                  '[ProfileDetails] ❌ No summary found in match data - all fields were empty',
                );
              }
            } else {
              const errorText = await matchResponse.text();
              console.error('[ProfileDetails] Failed to fetch match data:', {
                status: matchResponse.status,
                statusText: matchResponse.statusText,
                error: errorText,
              });
            }
          } catch (matchError) {
            console.error('[ProfileDetails] Error fetching match data:', matchError);
          }
        } else {
          console.log('[ProfileDetails] ❌ No match ID provided, skipping match summary fetch');
          console.log('[ProfileDetails] matchData exists:', !!matchData);
          console.log('[ProfileDetails] matchData.matchId exists:', !!matchData?.matchId);
        }
      } catch (error) {
        console.error('[ProfileDetails] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [cvId, matchData?.matchId]);

  const handleExportProfile = () => {
    console.log('Exporting profile as PDF...');
  };

  if (loading) {
    return (
      <div
        className="profile-details"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}
      >
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
            { title: matchData?.jobTitle || 'Job Search' },
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
          <Button onClick={handleExportProfile} type="default" className="export-cv-btn">
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
                    {matchData.jobTitle || 'Job Position'}
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

          {/* Skills Section */}
          <div className="expertise-industries">
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
                      style={{ marginTop: '8px', padding: 0 }}
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
            <Card className="industries-card">
              <Typography.Title level={5}>Experience</Typography.Title>
              {cvData.experience && cvData.experience.length > 0 ? (
                <ul>
                  {cvData.experience.slice(0, 4).map((exp, index) => (
                    <li key={index}>
                      <strong>{exp.role}</strong>
                      {exp.company && ` at ${exp.company}`}
                      {exp.duration && ` (${exp.duration})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <Typography.Paragraph>No experience information available.</Typography.Paragraph>
              )}
            </Card>
          </div>
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
