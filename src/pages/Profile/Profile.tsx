import { useEffect, useState } from 'react';
import { Table, Button, Layout, Typography, Space, Row, Col, Breadcrumb, Modal, Upload, message } from 'antd';
import type { ColumnsType, SortOrder } from 'antd/es/table/interface';
import { InboxOutlined } from '@ant-design/icons';
import './Profile.scss';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

interface ProfileData {
  id: string;
  name: string;
  role?: string;
  last_updated?: string;
  skills?: string[];
}

const ProfilePage = () => {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        console.log(`[profiles] Fetching all profiles from /api/v1/profiles`);
        
        const profilesRes = await fetch(`http://127.0.0.1:8000/api/v1/profiles`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!profilesRes.ok) {
          throw new Error(`Failed to fetch profiles: ${profilesRes.status}`);
        }
        
        const profilesData = await profilesRes.json();
        console.log('[profiles] ===== RAW PROFILES DATA =====');
        console.log('[profiles] Full response:', JSON.stringify(profilesData, null, 2));
        
        // Process profiles data - assuming it's an array of profile objects
        if (Array.isArray(profilesData)) {
          const processedProfiles = profilesData.map(profile => ({
            id: profile.id?.toString() || profile.cv_id?.toString() || 'unknown',
            name: profile.name || 'Unknown',
            role: extractRole(profile),
            last_updated: profile.last_update || profile.updated_at || profile.created_at || new Date().toISOString(),
            skills: profile.skills || []
          }));
          
          console.log('[profiles] Processed profiles:', processedProfiles);
          setProfiles(processedProfiles);
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

  const extractRole = (profile: any): string => {
    // Similar role extraction logic as in matches page
    if (profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0) {
      const firstExperience = profile.experience[0];
      return firstExperience.role || firstExperience.title || 'No role available';
    }
    return profile.last_job_title || profile.role || 'No role available';
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
      fileList.forEach((file) => {
        formData.append('file', file);
      });

      console.log(`[profiles] Uploading ${fileList.length} CV files to /api/v1/upload-cv`);

      const response = await fetch('http://127.0.0.1:8000/api/v1/upload-cv', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[profiles] Upload successful:', result);
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
      console.log(`[profiles] Selected ${selectedKeys.length} profiles:`, selectedKeys);
    },
  };

  const columns: ColumnsType<ProfileData> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: ProfileData, b: ProfileData) => a.name.localeCompare(b.name),
      sortDirections: ['ascend', 'descend', 'ascend'] as SortOrder[],
      render: (text: string) => (
        <span style={{ fontWeight: 500 }}>{text}</span>
      ),
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
            : 'No skills listed'
          }
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
            onClick={() => {
              console.log(`[profiles] View profile: ${record.id}`);
              // Could navigate to profile details if needed in the future
            }}
          >
            Details
          </Button>
          <Button 
            type="link" 
            className="remove-link"
            onClick={() => {
              console.log(`[profiles] Remove profile: ${record.id}`);
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
                    onClick={() => {
                      console.log(`[profiles] Delete ${selectedRowKeys.length} selected profiles:`, selectedRowKeys);
                      // TODO: Implement batch delete functionality
                      message.info(`Selected ${selectedRowKeys.length} profiles for deletion`);
                    }}
                  >
                    Delete Selected ({selectedRowKeys.length})
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        
        </div>

        <div className="profiles-section">
          <Title level={4} style={{ marginBottom: 16 }}>Available Profiles</Title>
          <Table
            dataSource={profiles}
            columns={columns}
            rowKey="id"
            rowSelection={rowSelection}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} profiles`
            }}
            rowClassName={() => 'custom-row-spacing'}
            loading={loading}
            locale={{
              emptyText: loading ? 'Loading profiles...' : 'No profiles found'
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
              Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files
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
    </Layout>
  );
};

export default ProfilePage;
