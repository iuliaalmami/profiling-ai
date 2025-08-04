import { Breadcrumb, Button, Typography, Card, Avatar, Row, Col } from 'antd';
import './ProfileDetails.scss';
import AiSideChat from '../../components/AiSideChat/AiSideChat';
import { UserOutlined } from '@ant-design/icons';
import avatar from '../../assets/avatar.png';
const ProfileDetails = () => {
  const handleExportProfile = () => {
    console.log('Exporting profile as PDF...');
  };

  return (
    <div className="profile-details">
      {/* Header */}
      <div className="profile-details-header">
        <Breadcrumb
          items={[
            { title: 'Home' },
            { title: 'Talent Searches' },
            { title: 'Senior Data Engineers in Clinical Trials' },
            { title: 'Profile Details' },
          ]}
        />
        <div className="profile-details-header-row">
          <div className="profile-info">
            <Avatar size={64} src={avatar} />
            <div>
              <Typography.Title level={4} className="candidate-name">
                Mircea Dinu – Senior Data Engineer
              </Typography.Title>
              <Typography.Paragraph className="candidate-meta">
                User interaction expert | ant financial service – business group – platform
                department – technology department -UED
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
          {/* Job Match Section */}
          <Card className="job-match-card">
            <div className="job-match-info">
              <div>
                <Typography.Text className="job-title">Job Match:</Typography.Text>
                <Typography.Text className="job-role">
                  Senior Data Engineers in Clinical Trials
                </Typography.Text>
              </div>
              <Typography.Text className="match-score">
                Match Score: <span>100%</span>
              </Typography.Text>
            </div>
            <Typography.Paragraph className="job-description">
              The score is based on Mircea’s extended experience and his use of required skills in
              practical projects in the latest period.
            </Typography.Paragraph>
          </Card>

          {/* Contact Info */}
          <Card className="contact-info-card">
            <Row gutter={[16, 16]} className="info-grid">
              <Col xs={24} md={8}>
                <Typography.Text className="label">Email</Typography.Text>
                <Typography.Paragraph className="value">mircea@cognizant.com</Typography.Paragraph>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text className="label">Phone</Typography.Text>
                <Typography.Paragraph className="value">0723330088</Typography.Paragraph>
              </Col>
              <Col xs={24} md={8}>
                <Typography.Text className="label">LinkedIn</Typography.Text>
                <Typography.Paragraph className="value">
                  <Typography.Link
                    href="https://www.linkedin.com/in/mirceadinu-68100b38/"
                    target="_blank"
                  >
                    https://www.linkedin.com/in/mirceadinu-68100b38/
                  </Typography.Link>
                </Typography.Paragraph>
              </Col>
            </Row>
          </Card>

          {/* Summary */}
          <Card className="summary-card">
            <Typography.Title level={5}>Summary</Typography.Title>
            <Typography.Paragraph>
              As a passionate and detail-oriented Frontend Developer with over 10 years of
              experience, I specialize in building dynamic, responsive, and user-friendly web
              applications using Angular. My expertise lies in creating seamless user experiences,
              writing clean and maintainable code, and continuously learning and adapting to new
              technologies. I have successfully completed numerous projects, ranging from
              single-page applications to complex enterprise-level solutions. My strong
              problem-solving skills, combined with a deep understanding of Angular and other
              frontend technologies, enable me to tackle challenges head-on and deliver high-quality
              results.
            </Typography.Paragraph>
          </Card>

          {/* Areas of Expertise & Industries */}
          <div className="expertise-industries">
            <Card className="expertise-card">
              <Typography.Title level={5}>Areas of expertise</Typography.Title>
              <ul>
                <li>Frontend Architecture & Component Libraries</li>
                <li>Performance Optimization & SEO</li>
                <li>Full Stack Web Development</li>
              </ul>
            </Card>
            <Card className="industries-card">
              <Typography.Title level={5}>Industries</Typography.Title>
              <ul>
                <li>Healthcare & Medical Technology</li>
                <li>Logistics & Transportation</li>
                <li>SaaS & Productivity Tools</li>
                <li>Accounting and report generation tools</li>
              </ul>
            </Card>
          </div>
        </div>
        <div className="profile-details-content-right">
          <AiSideChat />
        </div>
      </div>
    </div>
  );
};

export default ProfileDetails;
