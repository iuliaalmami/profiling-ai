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
import { InboxOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
  
  // Bulk upload results state
  const [bulkUploadResults, setBulkUploadResults] = useState<any>(null);
  const [showBulkResults, setShowBulkResults] = useState(false);

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

  // Helper functions for file type handling
  const hasZipFiles = (): boolean => {
    return fileList.some(file => 
      file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
    );
  };

  const getFileTypeSummary = (): string => {
    const pdfCount = fileList.filter(file => 
      file.type === 'application/pdf'
    ).length;
    const zipCount = fileList.filter(file => 
      file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')
    ).length;
    
    if (pdfCount > 0 && zipCount > 0) {
      return ` (${pdfCount} PDF${pdfCount > 1 ? 's' : ''}, ${zipCount} ZIP${zipCount > 1 ? 's' : ''})`;
    } else if (zipCount > 0) {
      return ` (${zipCount} ZIP file${zipCount > 1 ? 's' : ''})`;
    } else {
      return ` (${pdfCount} PDF file${pdfCount > 1 ? 's' : ''})`;
    }
  };

  // Calculate if this is a bulk upload (multiple files OR any ZIP files)
  const isBulkUpload = fileList.length > 1 || hasZipFiles();

  const handleAddProfile = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFileList([]);
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Please select at least one file to upload');
      return;
    }

    setUploading(true);
    
             // Show appropriate loading message
    const hasZips = hasZipFiles();
    
    if (isBulkUpload) {
      const messageText = hasZips 
        ? `Processing ${fileList.length} files (including ZIP extraction)...`
        : `Processing ${fileList.length} files concurrently...`;
      message.loading(messageText, 0);
    }
    
    try {
      const formData = new FormData();

                    // Use 'files' field name for bulk upload OR if any ZIP files are present
       // Use 'file' field name only for single PDF files
       const fieldName = isBulkUpload ? 'files' : 'file';
       fileList.forEach(file => {
         formData.append(fieldName, file);
       });

       // Use bulk upload endpoint for multiple files OR if any ZIP files are present
       // Single endpoint only for single PDF files
       const endpoint = isBulkUpload
         ? `${API_BASE_URL}/api/v1/upload-cv/bulk`
         : `${API_BASE_URL}/api/v1/upload-cv`;

      const response = await api.post(endpoint, formData, {
        headers: {
          // Don't set Content-Type for FormData, let browser set it
        },
      });

      if (response.ok) {
        const result = await response.json();
        
                 if (isBulkUpload) {
           // Handle bulk upload response
           const { summary } = result;
           
           // Show detailed results
           if (summary.successful_uploads > 0) {
             message.success(
               `Bulk upload completed! ${summary.successful_uploads}/${summary.total_files} files uploaded successfully.`
             );
           }
           
           if (summary.failed_uploads > 0) {
             message.warning(
               `${summary.failed_uploads} file(s) failed to upload. Check details below.`
             );
           }
           
           // Store results and show them in the same modal
           setBulkUploadResults(result);
           // Don't close modal yet - show results inline
         } else {
           // Handle single upload response
           message.success(`Successfully uploaded file`);
           // Close modal and refresh for single upload
           handleModalClose();
           window.location.reload();
         }
      } else {
        const errorText = await response.text();
        console.error('[profiles] Upload failed:', response.status, errorText);
        message.error('Failed to upload files. Please try again.');
      }
    } catch (error) {
      console.error('[profiles] Upload error:', error);
      message.error('An error occurred while uploading. Please try again.');
    } finally {
      setUploading(false);
      // Clear any loading messages
      message.destroy();
    }
  };

  const uploadProps = {
    name: 'file',
    multiple: true,
    fileList,
    beforeUpload: (file: any) => {
      // Validate file type - now supports PDF and ZIP
      const isPDF = file.type === 'application/pdf';
      const isZIP = file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip');
      
      if (!isPDF && !isZIP) {
        message.error(`${file.name} is not a supported file type. Only PDF and ZIP files are allowed.`);
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
                 title={isBulkUpload ? "Add Multiple Files (Bulk Upload)" : "Add New File"}
        open={isModalOpen}
        onCancel={handleModalClose}
                 footer={[
           <Button key="cancel" onClick={handleModalClose}>
             {bulkUploadResults ? 'Close' : 'Cancel'}
           </Button>,
           ...(bulkUploadResults ? [
             <Button
               key="done"
               type="primary"
               onClick={() => {
                 handleModalClose();
                 window.location.reload(); // Refresh profiles after closing
               }}
             >
               Done & Refresh Profiles
             </Button>
           ] : [
             <Button
               key="upload"
               type="primary"
               loading={uploading}
               onClick={handleUpload}
               disabled={fileList.length === 0}
             >
                               {isBulkUpload ? `Upload ${fileList.length} Files (Bulk)` : 'Upload File'}
             </Button>
           ])
         ]}
                 width={bulkUploadResults ? 800 : (isBulkUpload ? 600 : 520)}
        className="add-profile-modal"
      >
        <div className="upload-section">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
            </p>
            <p className="ant-upload-text">Click or drag file(s) to this area to upload</p>
            <p className="ant-upload-hint">
              Support for single or bulk uploads. Multiple files will be processed concurrently for faster uploads.
              <br />
              <strong>New:</strong> ZIP files are automatically extracted and processed!
              <br />
              <strong>Note:</strong> Strictly prohibit from uploading company data or other band files
            </p>
          </Upload.Dragger>

                               {fileList.length > 0 && (
            <div className="file-summary">
              <Row gutter={16} align="middle">
                <Col>
                  <Typography.Text type="secondary">
                    {fileList.length} file(s) selected
                    {getFileTypeSummary()}
                  </Typography.Text>
                </Col>
                <Col>
                                     {isBulkUpload && (
                     <Tag color="blue">
                       <ClockCircleOutlined /> Bulk upload available (3x faster)
                     </Tag>
                   )}
                  {hasZipFiles() && (
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      📦 ZIP files will be auto-extracted
                    </Tag>
                  )}
                </Col>
              </Row>
            </div>
          )}

           {/* Upload Results Display */}
           {bulkUploadResults && (
             <div className="upload-results">
               <div className="results-header">
                 <Title level={4}>Upload Results</Title>
                 <Tag color="green">✓ Upload Complete</Tag>
               </div>
               
               {/* Summary Stats */}
               <div className="results-summary-inline">
                 <Row gutter={16}>
                   <Col span={6}>
                     <div className="summary-stat-inline">
                       <div className="stat-number">{bulkUploadResults.summary.total_files}</div>
                       <div className="stat-label">Total Files</div>
                     </div>
                   </Col>
                   <Col span={6}>
                     <div className="summary-stat-inline success">
                       <div className="stat-number">{bulkUploadResults.summary.successful_uploads}</div>
                       <div className="stat-label">Successful</div>
                     </div>
                   </Col>
                   <Col span={6}>
                     <div className="summary-stat-inline error">
                       <div className="stat-number">{bulkUploadResults.summary.failed_uploads}</div>
                       <div className="stat-label">Failed</div>
                     </div>
                   </Col>
                   <Col span={6}>
                     <div className="summary-stat-inline">
                       <div className="stat-number">{bulkUploadResults.summary.success_rate}%</div>
                       <div className="stat-label">Success Rate</div>
                     </div>
                   </Col>
                 </Row>
                 <div className="processing-time-inline">
                   Total processing time: {bulkUploadResults.summary.total_processing_time}s
                 </div>
               </div>

               {/* File Details Table */}
               <div className="results-details-inline">
                 <Title level={5}>File Details</Title>
                 <Table
                   dataSource={bulkUploadResults.results}
                   columns={[
                     {
                       title: 'Filename',
                       dataIndex: 'filename',
                       key: 'filename',
                       render: (text: string) => <span className="filename">{text}</span>,
                     },
                     {
                       title: 'Status',
                       dataIndex: 'status',
                       key: 'status',
                       render: (status: string) => (
                         <Tag color={status === 'success' ? 'success' : 'error'}>
                           {status === 'success' ? '✅ Success' : '❌ Failed'}
                         </Tag>
                       ),
                     },
                     {
                       title: 'CV ID',
                       dataIndex: 'cv_id',
                       key: 'cv_id',
                       render: (cvId: number) => cvId || '-',
                     },
                     {
                       title: 'Processing Time',
                       dataIndex: 'processing_time',
                       key: 'processing_time',
                       render: (time: number) => time ? `${time}s` : '-',
                     },
                     {
                       title: 'Error Message',
                       dataIndex: 'error_message',
                       key: 'error_message',
                       render: (error: string) => error || '-',
                     },
                   ]}
                   rowKey="filename"
                   pagination={false}
                   size="small"
                   scroll={{ y: 200 }}
                 />
               </div>
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

      {/* Bulk Upload Results Modal */}
      <Modal
        title="Bulk Upload Results"
        open={showBulkResults}
        onCancel={() => setShowBulkResults(false)}
        footer={[
          <Button key="close" onClick={() => setShowBulkResults(false)}>
            Close
          </Button>,
        ]}
        width={800}
        className="bulk-upload-results-modal"
      >
        {bulkUploadResults && (
          <div className="bulk-upload-results">
            {/* Summary Section */}
            <div className="results-summary">
              <Title level={4}>Upload Summary</Title>
              <Row gutter={16}>
                <Col span={6}>
                  <div className="summary-stat">
                    <div className="stat-number">{bulkUploadResults.summary.total_files}</div>
                    <div className="stat-label">Total Files</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="summary-stat success">
                    <div className="stat-number">{bulkUploadResults.summary.successful_uploads}</div>
                    <div className="stat-label">Successful</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="summary-stat error">
                    <div className="stat-number">{bulkUploadResults.summary.failed_uploads}</div>
                    <div className="stat-label">Failed</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div className="summary-stat">
                    <div className="stat-number">{bulkUploadResults.summary.success_rate}%</div>
                    <div className="stat-label">Success Rate</div>
                  </div>
                </Col>
              </Row>
              <div className="processing-time">
                Total processing time: {bulkUploadResults.summary.total_processing_time}s
              </div>
            </div>

            {/* Detailed Results */}
            <div className="results-details">
              <Title level={4}>File Details</Title>
              <Table
                dataSource={bulkUploadResults.results}
                columns={[
                  {
                    title: 'Filename',
                    dataIndex: 'filename',
                    key: 'filename',
                    render: (text: string) => <span className="filename">{text}</span>,
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={status === 'success' ? 'success' : 'error'}>
                        {status === 'success' ? '✅ Success' : '❌ Failed'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'CV ID',
                    dataIndex: 'cv_id',
                    key: 'cv_id',
                    render: (cvId: number) => cvId || '-',
                  },
                  {
                    title: 'Processing Time',
                    dataIndex: 'processing_time',
                    key: 'processing_time',
                    render: (time: number) => time ? `${time}s` : '-',
                  },
                  {
                    title: 'Error Message',
                    dataIndex: 'error_message',
                    key: 'error_message',
                    render: (error: string) => error || '-',
                  },
                ]}
                rowKey="filename"
                pagination={false}
                size="small"
              />
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default ProfilePage;
