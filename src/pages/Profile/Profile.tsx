import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Layout,
  Typography,
  Space,
  Row,
  Col,
  Breadcrumb,
  Modal,
  Upload,
  message,
  Input,
  Tag,
} from 'antd';
import type { ColumnsType, SortOrder } from 'antd/es/table/interface';
import { InboxOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';
import './Profile.scss';

const { Content } = Layout;
const { Title } = Typography;

interface ProfileData {
  id: string;
  cv_id?: number | string;
  name: string;
  role?: string;
  last_updated?: string;
  skills?: string[];
  experience?: Array<{
    role?: string;
    title?: string;
    company?: string;
    duration?: string;
  }>;
}

const ProfilePage = () => {
  const { } = useAuth();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileData | null>(null);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [showAllExperience, setShowAllExperience] = useState(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        const profilesRes = await api.get(`${API_BASE_URL}/api/v1/profiles`);

        if (!profilesRes.ok) {
          throw new Error(`Failed to fetch profiles: ${profilesRes.status}`);
        }

        const profilesData = await profilesRes.json();

        // Process profiles data - assuming it's an array of profile objects
        if (Array.isArray(profilesData)) {
          const processedProfiles = profilesData.map(profile => ({
            id: profile.id?.toString() || profile.cv_id?.toString() || 'unknown',
            cv_id: profile.cv_id || profile.id, // Use profile.id as cv_id if cv_id is not available
            name: profile.name || 'Unknown',
            role: extractRole(profile),
            last_updated:
              profile.last_update ||
              profile.updated_at ||
              profile.created_at ||
              new Date().toISOString(),
            skills: profile.skills || [],
            experience: profile.experience || [],
          }));

          setProfiles(processedProfiles);
          setFilteredProfiles(processedProfiles);
        } else {
          console.error('[profiles] Expected array but got:', typeof profilesData);
        }
      } catch (error) {
        console.error('[profiles] Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  // Filter profiles based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const filtered = profiles.filter(profile => {
      const searchLower = searchTerm.toLowerCase();
      
      // Search in name
      const nameMatch = profile.name.toLowerCase().includes(searchLower);
      
      // Search in skills
      const skillsMatch = profile.skills?.some(skill => 
        skill.toLowerCase().includes(searchLower)
      ) || false;
      
      // Search in role (optional)
      const roleMatch = profile.role?.toLowerCase().includes(searchLower) || false;
      
      return nameMatch || skillsMatch || roleMatch;
    });

    setFilteredProfiles(filtered);
  }, [searchTerm, profiles]);

  const extractRole = (profile: any): string => {
    // Similar role extraction logic as in matches page
    if (profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0) {
      const firstExperience = profile.experience[0];
      return firstExperience.role || firstExperience.title || 'No role available';
    }
    return profile.last_job_title || profile.role || 'No role available';
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleRemoveProfile = async (profile: ProfileData) => {
    if (!profile.cv_id) {
      message.error(`Unable to remove profile "${profile.name}": Missing CV ID`);
      return;
    }

    // Use native confirm for React 19 compatibility
    const confirmed = window.confirm(`Are you sure you want to remove "${profile.name}"? This action cannot be undone.`);
    
    if (confirmed) {
      await removeProfileConfirmed(profile);
    }
  };

  const removeProfileConfirmed = async (profile: ProfileData) => {
    try {
      const cvId = parseInt(profile.cv_id!.toString());
      
      const response = await api.delete(`${API_BASE_URL}/api/v1/cvs`, {
        body: JSON.stringify({ cv_ids: [cvId] }),
      });

      if (response.ok) {
        message.success(`Profile "${profile.name}" removed successfully`);
        // Remove from state
        const updatedProfiles = profiles.filter(p => 
          p.cv_id?.toString() !== profile.cv_id?.toString()
        );
        
        setProfiles(updatedProfiles);
        setFilteredProfiles(updatedProfiles.filter(p => {
          if (!searchTerm.trim()) return true;
          const searchLower = searchTerm.toLowerCase();
          return p.name.toLowerCase().includes(searchLower) ||
                 p.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
                 p.role?.toLowerCase().includes(searchLower);
        }));
        // Clear selection if deleted profile was selected
        setSelectedRowKeys(prev => prev.filter(key => key !== profile.id));
      } else {
        await response.text();
        message.error('Failed to remove profile. Please try again.');
      }
    } catch (error) {
      message.error('An error occurred while removing profile. Please try again.');
    }
  };

  const handleBatchDelete = async () => {
    const selectedProfiles = profiles.filter(profile => 
      selectedRowKeys.includes(profile.id)
    );
    
    const cvIds = selectedProfiles
      .filter(profile => profile.cv_id)
      .map(profile => parseInt(profile.cv_id!.toString()));

    if (cvIds.length === 0) {
      message.error('Unable to delete profiles: Missing CV IDs');
      return;
    }

    if (cvIds.length !== selectedRowKeys.length) {
      message.warning('Some profiles cannot be deleted due to missing CV IDs');
    }

    // Use native confirm for React 19 compatibility
    const confirmed = window.confirm(`Are you sure you want to delete ${cvIds.length} profile(s)? This action cannot be undone.`);
    
    if (confirmed) {
      await batchDeleteConfirmed(cvIds);
    }
  };

  const batchDeleteConfirmed = async (cvIds: number[]) => {
    try {
      const response = await api.delete(`${API_BASE_URL}/api/v1/cvs`, {
        body: JSON.stringify({ cv_ids: cvIds }),
      });

      if (response.ok) {
        message.success(`${cvIds.length} profile(s) deleted successfully`);
        // Remove from state
        const updatedProfiles = profiles.filter(p => !cvIds.includes(parseInt(p.cv_id!.toString())));
        setProfiles(updatedProfiles);
        setFilteredProfiles(updatedProfiles.filter(p => {
          if (!searchTerm.trim()) return true;
          const searchLower = searchTerm.toLowerCase();
          return p.name.toLowerCase().includes(searchLower) ||
                 p.skills?.some(skill => skill.toLowerCase().includes(searchLower)) ||
                 p.role?.toLowerCase().includes(searchLower);
        }));
        // Clear selection
        setSelectedRowKeys([]);
      } else {
        message.error('Failed to delete profiles. Please try again.');
      }
    } catch (error) {
      message.error('An error occurred while deleting profiles. Please try again.');
    }
  };

  const handleShowDetails = (profile: ProfileData) => {
    setSelectedProfile(profile);
    setIsDetailsModalOpen(true);
    // Reset collapse states when opening modal
    setShowAllSkills(false);
    setShowAllExperience(false);
  };

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false);
    setSelectedProfile(null);
  };

  // Helper function to calculate how many skills to show for 2 rows
  const getSkillsToShow = (skills: string[]) => {
    if (showAllSkills) return skills;
    // Assume roughly 4-5 skills per row, so 8-10 for 2 rows
    return skills.slice(0, 8);
  };

  // Helper function to get experiences to show (first 2)
  const getExperiencesToShow = (experiences: any[]) => {
    if (showAllExperience) return experiences;
    return experiences.slice(0, 2); // Get first 2 experiences
  };

  const getExperienceLevel = (profile: ProfileData): string => {
    const role = profile.role?.toLowerCase() || '';
    
    // Check for Senior level indicators
    if (role.includes('senior') || role.includes('sr.') || role.includes('lead') || 
        role.includes('principal') || role.includes('architect') || role.includes('manager') ||
        role.includes('director') || role.includes('head of') || role.includes('chief')) {
      return 'Senior';
    }
    
    // Check for Junior level indicators
    if (role.includes('junior') || role.includes('jr.') || role.includes('trainee') || 
        role.includes('intern') || role.includes('entry') || role.includes('graduate') ||
        role.includes('associate') || role.includes('assistant')) {
      return 'Junior';
    }
    
    // Default to Mid-level for all other cases
    return 'Mid-level';
  };

  const handleAddProfile = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFileList([]);
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Please select at least one PDF file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();

      // Add all files to FormData
      fileList.forEach(file => {
        formData.append('file', file);
      });

      const response = await api.post(`${API_BASE_URL}/api/v1/upload-cv`, formData, {
        headers: {
          // Don't set Content-Type for FormData, let browser set it
        },
      });

      if (response.ok) {
        await response.json();
        message.success(`Successfully uploaded ${fileList.length} CV file(s)`);

        // Close modal and refresh profiles
        handleModalClose();
        // Refresh the profiles list
        window.location.reload(); // Simple refresh, could be optimized
      } else {
        const errorText = await response.text();
        console.error('[profiles] Upload failed:', response.status, errorText);
        message.error('Failed to upload CV files. Please try again.');
      }
    } catch (error) {
      console.error('[profiles] Upload error:', error);
      message.error('An error occurred while uploading. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file: any) => {
      // Validate file type
      const isPDF = file.type === 'application/pdf';
      if (!isPDF) {
        message.error(`${file.name} is not a PDF file. Only PDF files are allowed.`);
        return false;
      }

      // Add to file list
      setFileList(prev => [...prev, file]);
      return false; // Prevent automatic upload
    },
    onRemove: (file: any) => {
      setFileList(prev => prev.filter(item => item.uid !== file.uid));
    },
    showUploadList: {
      showRemoveIcon: true,
    },
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys);
    },
    getCheckboxProps: (record: ProfileData) => ({
      name: record.name,
    }),
  };

  const columns: ColumnsType<ProfileData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: ProfileData, b: ProfileData) => a.name.localeCompare(b.name),
      sortDirections: ['ascend', 'descend', 'ascend'] as SortOrder[],
              render: (text: string) => <span className="profile-page__table-name">{text}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <span style={{ color: '#666' }}>
          {role.length > 50 ? `${role.substring(0, 50)}...` : role}
        </span>
      ),
    },
    {
      title: 'Skills',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills: string[]) => (
        <span style={{ color: '#666' }}>
          {skills && skills.length > 0
            ? skills.slice(0, 3).join(', ') + (skills.length > 3 ? '...' : '')
            : 'No skills listed'}
        </span>
      ),
    },
    {
      title: 'Profile Last Updated',
      dataIndex: 'last_updated',
      key: 'last_updated',
      sorter: (a: ProfileData, b: ProfileData) => {
        const dateA = new Date(a.last_updated || 0).getTime();
        const dateB = new Date(b.last_updated || 0).getTime();
        return dateA - dateB;
      },
      sortDirections: ['ascend', 'descend', 'ascend'] as SortOrder[],
      defaultSortOrder: 'descend' as SortOrder,
      render: (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ProfileData) => (
        <Space>
          <Button
            type="link"
            className="view-link"
            onClick={() => handleShowDetails(record)}
          >
            Details
          </Button>
          <Button
            type="link"
            className="remove-link"
            onClick={() => handleRemoveProfile(record)}
          >
            Remove
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Layout className="profiles-layout">
      <Content className="profiles-content">
        <div className="profiles-page-header">
          <Breadcrumb items={[{ title: 'Home' }, { title: 'Profiles' }]} />

          <Row justify="space-between" align="middle" style={{ marginTop: 16 }}>
            <Col>
              <Title level={2} style={{ marginBottom: 0 }}>
                Profiles
              </Title>
            </Col>
            <Col>
              <Space>
                <Button type="primary" onClick={handleAddProfile}>
                  Add Profile
                </Button>
                {selectedRowKeys.length > 0 && (
                  <Button
                    danger
                    onClick={handleBatchDelete}
                  >
                    Delete Selected ({selectedRowKeys.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <div className="profiles-section">
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={4} style={{ marginBottom: 0 }}>
                Available Profiles
              </Title>
            </Col>
            <Col>
              <Input.Search
                placeholder="Search by name, skills, or role..."
                allowClear
                enterButton={<SearchOutlined />}
                size="middle"
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => handleSearch(e.target.value)}
                value={searchTerm}
              />
            </Col>
          </Row>
          
          {searchTerm && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">
                Showing {filteredProfiles.length} of {profiles.length} profiles
                {searchTerm && ` for "${searchTerm}"`}
              </Typography.Text>
            </div>
          )}
          
          <Table
            dataSource={filteredProfiles}
            columns={columns}
            rowKey="id"
            rowSelection={rowSelection}
            pagination={{
              current: currentPage,
              pageSize: pageSize,
              total: filteredProfiles.length,
              showSizeChanger: true,
              showQuickJumper: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} profiles`,
              position: ['bottomCenter'],
              onChange: handlePaginationChange,
              onShowSizeChange: handlePaginationChange,
            }}
            rowClassName={() => 'custom-row-spacing'}
            loading={loading}
            locale={{
              emptyText: loading 
                ? 'Loading profiles...' 
                : searchTerm 
                  ? `No profiles found for "${searchTerm}"` 
                  : 'No profiles found',
            }}
          />
        </div>
      </Content>

      {/* Add Profile Modal */}
      <Modal
        title="Add new profile"
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={[
          <Button key="cancel" onClick={handleModalClose}>
            Cancel
          </Button>,
          <Button
            key="upload"
            type="primary"
            loading={uploading}
            onClick={handleUpload}
            disabled={fileList.length === 0}
          >
            Add profiles
          </Button>,
        ]}
        width={520}
        className="add-profile-modal"
      >
        <div className="upload-section">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for a single or bulk upload. Strictly prohibit from uploading company data or
              other band files
            </p>
          </Upload.Dragger>

          {fileList.length > 0 && (
            <div className="file-summary">
              <Typography.Text type="secondary">
                {fileList.length} PDF file(s) selected
              </Typography.Text>
            </div>
          )}
        </div>
      </Modal>

      {/* Profile Details Modal */}
      <Modal
        title={
          <div className="profile-page__modal-title">
            <Typography.Title level={4} className="profile-page__modal-title-text">
              Profile Details
            </Typography.Title>
            {selectedProfile && (
              <Tag color="blue">{selectedProfile.name}</Tag>
            )}
          </div>
        }
        open={isDetailsModalOpen}
        onCancel={handleCloseDetails}
        footer={[
          <Button key="close" onClick={handleCloseDetails}>
            Close
          </Button>,
        ]}
        width={1000}
        className="profile-details-modal"
      >
        {selectedProfile && (
          <div className="profile-modal-content">
            {/* Basic Information */}
            <div className="section">
              <div className="section-title">Basic Information</div>
              <div className="info-grid">
                <div className="label">Full Name:</div>
                <div className="value">{selectedProfile.name}</div>
                
                <div className="label">Role/Position:</div>
                <div className="value">{selectedProfile.role || 'No role specified'}</div>
                
                <div className="label">Profile ID:</div>
                <div className="value">{selectedProfile.id}</div>
                
                <div className="label">Last Updated:</div>
                <div className="value">
                  {selectedProfile.last_updated 
                    ? new Date(selectedProfile.last_updated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="section">
              <div className="section-title">Skills & Expertise</div>
              {selectedProfile.skills && selectedProfile.skills.length > 0 ? (
                <div>
                  <div className="skills-grid">
                    {getSkillsToShow(selectedProfile.skills).map((skill, index) => (
                      <div key={index} className="skill-tag">
                        {skill}
                      </div>
                    ))}
                  </div>
                  {selectedProfile.skills.length > 8 && (
                    <button 
                      className="show-more-btn"
                      onClick={() => setShowAllSkills(!showAllSkills)}
                    >
                      {showAllSkills ? `Show Less` : `Show More (${selectedProfile.skills.length - 8} more)`}
                    </button>
                  )}
                </div>
              ) : (
                <div>No skills listed for this profile</div>
              )}
            </div>

            {/* Experience */}
            <div className="section">
              <div className="section-title">Experience</div>
              {selectedProfile.experience && selectedProfile.experience.length > 0 ? (
                <div>
                  <div className="experience-list">
                    {getExperiencesToShow(selectedProfile.experience).map((exp, index) => (
                      <div key={index} className="experience-item">
                        <div className="experience-left">
                          <span className="role">{exp.role}</span>
                          {exp.company && <span className="company">at {exp.company}</span>}
                        </div>
                        {exp.duration && (
                          <div className="experience-right">
                            <span className="duration">{exp.duration}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedProfile.experience.length > 2 && (
                    <button 
                      className="show-more-btn"
                      onClick={() => setShowAllExperience(!showAllExperience)}
                    >
                      {showAllExperience ? `Show Less` : `Show More (${selectedProfile.experience.length - 2} more)`}
                    </button>
                  )}
                </div>
              ) : (
                <div>No experience information available</div>
              )}
            </div>

            {/* Summary */}
            <div className="section">
              <div className="section-title">Profile Summary</div>
              <div className="summary-grid">
                <div className="summary-card">
                  <span className="summary-label">Total Skills</span>
                  <span className="summary-value">{selectedProfile.skills?.length || 0}</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Profile Status</span>
                  <span className="summary-value">Active</span>
                </div>
                <div className="summary-card">
                  <span className="summary-label">Experience Level</span>
                  <span className="summary-value">{getExperienceLevel(selectedProfile)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default ProfilePage;
