import React, { useState, useEffect } from 'react';
import { Upload, Table, Card, Button, message, Spin, Tag, Space, Typography, Divider, Modal, Tabs } from 'antd';
import { UploadOutlined, HistoryOutlined, FileExcelOutlined, ExclamationCircleOutlined, TeamOutlined, StarOutlined, CloseOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';
import './AdminActions.scss';

const { Title, Text } = Typography;

interface UploadHistory {
  id: number;
  filename: string;
  uploaded_by: number;
  total_records: number;
  successful_records: number;
  failed_records: number;
  upload_status: 'success' | 'partial' | 'failed';
  error_message?: string;
  created_at: string;
}

interface EmployeeData {
  id: number;
  upload_id: number;
  associated_id: string;
  associate_name: string;
  grade: string;
  designation: string;
  date_of_joining: string;
  dept_name: string;
  project_id: string;
  project_description: string;
  account_id: string;
  account_name: string;
  billability_status: string;
  city: string;
  assignment_start_date: string;
  assignment_end_date: string;
  percentage_allocation: string;
  created_at: string;
}

interface MySkillsData {
  id: number;
  upload_id: number;
  cognizant_id: string;
  skill_category: string;
  skill_name: string;
  proficiency: string;
  last_used: string;
  experience: string;
  created_at: string;
}

const AdminActions: React.FC = () => {
  const [activeTab, setActiveTab] = useState('availability');
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [mySkillsData, setMySkillsData] = useState<MySkillsData[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadUploadHistory();
  }, []);

  const loadUploadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await api.get('/admin/excel/history');
      const data = await response.json();
      console.log('Upload history response:', data);
      setUploadHistory(data.history || []);
    } catch (error) {
      console.error('Error loading upload history:', error);
      message.error('Failed to load upload history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadEmployeeData = async (uploadId?: number) => {
    setLoadingData(true);
    try {
      const url = uploadId ? `/admin/excel/employee-data?upload_id=${uploadId}` : '/admin/excel/employee-data';
      const response = await api.get(url);
      const data = await response.json();
      setEmployeeData(data.data);
      setSelectedUploadId(uploadId || null);
    } catch (error) {
      console.error('Error loading employee data:', error);
      message.error('Failed to load employee data');
    } finally {
      setLoadingData(false);
    }
  };

  const loadMySkillsData = async (uploadId?: number) => {
    setLoadingData(true);
    try {
      const url = uploadId ? `/admin/myskills/data?upload_id=${uploadId}` : '/admin/myskills/data';
      const response = await api.get(url);
      const data = await response.json();
      setMySkillsData(data.data);
      setSelectedUploadId(uploadId || null);
    } catch (error) {
      console.error('Error loading MySkills data:', error);
      message.error('Failed to load MySkills data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleFileSelection = (file: File) => {
    setPendingFile(file);
    setShowConfirmModal(true);
    return false; // Prevent automatic upload
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    
    setUploading(true);
    setShowConfirmModal(false);
    setUploadError(null); // Clear any previous errors
    
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);

      console.log('Uploading file:', pendingFile.name, 'Size:', pendingFile.size);

      // Determine which endpoint to use based on active tab
      const endpoint = activeTab === 'myskills' ? '/admin/myskills/upload' : '/admin/excel/upload';
      const response = await api.post(endpoint, formData);

      // Check if the response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw {
          response: {
            data: {
              detail: errorData.detail || 'Upload failed'
            }
          }
        };
      }

      const result = await response.json();
      console.log('Upload response:', result);
      
      if (result.success) {
        const additionalInfo = activeTab === 'myskills' 
          ? ` Valid CVs found: ${result.valid_cognizant_ids_found}, Endorsed records: ${result.endorsed_records_found}`
          : '';
        
        message.success(
          `File uploaded successfully! ${result.successful_records} records processed, ${result.failed_records} failed.${additionalInfo}`
        );
        setUploadError(null); // Clear any previous errors
        loadUploadHistory();
        
        // Load appropriate data based on tab
        if (activeTab === 'myskills') {
          loadMySkillsData(result.upload_id);
        } else {
          loadEmployeeData(result.upload_id);
        }
      } else {
        message.error('Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      let errorMessage = 'Upload failed';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Check if it's a missing columns error
        if (detail.includes('Missing required columns')) {
          const missingColumns = detail.replace('Missing required columns: ', '');
          const columnsList = missingColumns.split(', ').map((col: string) => `• ${col}`).join('\n');
          errorMessage = `Excel Format Error:\n\nYour file is missing the following required columns:\n\n${columnsList}\n\nPlease check the format requirements above and try again.`;
        } else if (detail.includes('Only Excel files')) {
          errorMessage = 'File Type Error: Please upload an Excel file (.xlsx, .xls, or .xlsb format).';
        } else {
          errorMessage = `Upload Error: ${detail}`;
        }
      } else if (error.message) {
        errorMessage = `❌ Upload Error: ${error.message}`;
      }
      
      setUploadError(errorMessage); // Set error state for persistent display
      
      message.error({
        content: errorMessage,
        duration: 8, // Show error message for 8 seconds
        style: {
          marginTop: '20px',
        },
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleCancelUpload = () => {
    setShowConfirmModal(false);
    setPendingFile(null);
  };

  const clearUploadError = () => {
    setUploadError(null);
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                     file.type === 'application/vnd.ms-excel' ||
                     file.name.endsWith('.xlsx') ||
                     file.name.endsWith('.xls') ||
                     file.name.endsWith('.xlsb');
      
      if (!isExcel) {
        message.error('You can only upload Excel files (.xlsx, .xls, .xlsb)!');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return false;
      }

      handleFileSelection(file);
      return false; // Prevent automatic upload
    },
    showUploadList: false,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'green';
      case 'partial': return 'orange';
      case 'failed': return 'red';
      default: return 'default';
    }
  };

  const getDisplayedHistory = () => {
    if (showAllHistory) {
      return uploadHistory.slice(0, 10);
    }
    return uploadHistory.slice(0, 3);
  };

  const toggleHistoryView = () => {
    setShowAllHistory(!showAllHistory);
  };

  const historyColumns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileExcelOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'upload_status',
      key: 'upload_status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Records',
      key: 'records',
      render: (record: UploadHistory) => (
        <Text>
          {record.successful_records}/{record.total_records}
          {record.failed_records > 0 && (
            <Text type="danger"> ({record.failed_records} failed)</Text>
          )}
        </Text>
      ),
    },
    {
      title: 'Uploaded',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: UploadHistory) => (
        <Button
          size="small"
          onClick={() => {
            // Load data based on current active tab
            if (activeTab === 'myskills') {
              loadMySkillsData(record.id);
            } else {
              loadEmployeeData(record.id);
            }
          }}
          disabled={record.successful_records === 0}
        >
          View Data
        </Button>
      ),
    },
  ];

  const employeeColumns = [
    {
      title: 'Associated ID',
      dataIndex: 'associated_id',
      key: 'associated_id',
    },
    {
      title: 'Associate Name',
      dataIndex: 'associate_name',
      key: 'associate_name',
    },
    {
      title: 'Grade',
      dataIndex: 'grade',
      key: 'grade',
    },
    {
      title: 'Designation',
      dataIndex: 'designation',
      key: 'designation',
    },
    {
      title: 'Department',
      dataIndex: 'dept_name',
      key: 'dept_name',
    },
    {
      title: 'Project',
      dataIndex: 'project_description',
      key: 'project_description',
      ellipsis: true,
    },
    {
      title: 'Account',
      dataIndex: 'account_name',
      key: 'account_name',
    },
    {
      title: 'Billability',
      dataIndex: 'billability_status',
      key: 'billability_status',
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
    },
  ];

  const mySkillsColumns = [
    {
      title: 'Cognizant ID',
      dataIndex: 'cognizant_id',
      key: 'cognizant_id',
    },
    {
      title: 'Skill Category',
      dataIndex: 'skill_category',
      key: 'skill_category',
    },
    {
      title: 'Skill Name',
      dataIndex: 'skill_name',
      key: 'skill_name',
    },
    {
      title: 'Proficiency',
      dataIndex: 'proficiency',
      key: 'proficiency',
    },
    {
      title: 'Last Used',
      dataIndex: 'last_used',
      key: 'last_used',
    },
    {
      title: 'Experience',
      dataIndex: 'experience',
      key: 'experience',
    },
  ];

  const AvailabilityContent: React.FC = () => (
    <div className="admin-actions-content">
      {/* Upload Section */}
      <Card title="Upload Excel File" className="upload-card">
        <div className="upload-section">
          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              size="large"
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Click to Upload Excel File'}
            </Button>
          </Upload>
          
          {/* Error Display */}
          {uploadError && (
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '16px',
              marginTop: '12px',
              position: 'relative'
            }}>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={clearUploadError}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  color: '#ff4d4f',
                  padding: '4px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
              />
              <div style={{ 
                whiteSpace: 'pre-line',
                fontSize: '13px',
                lineHeight: '1.5',
                paddingRight: '24px' // Make room for close button
              }}>
                <Text type="danger">
                  {uploadError}
                </Text>
              </div>
            </div>
          )}
          <div className="upload-info">
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '12px'
            }}>
              <Text type="success">
                <strong>📋 Required Excel Format:</strong>
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Column Headers:</strong> Associate Id, Associate Name, Grade, Designation, 
                  Date of Joining, Dept Name, Project ID, Project Description, Account ID, 
                  Account Name, Billability Status, City, Assignment Start Date, Assignment End Date, 
                  Percent Allocation
                </Text>
              </div>
            </div>
            <Text type="warning" style={{ marginTop: '8px', display: 'block' }}>
              <strong>⚠️ Warning:</strong> This will completely replace all existing employee data with the new file data.
            </Text>
          </div>
        </div>
      </Card>

      <Divider />

      {/* Upload History Section */}
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            Upload History
            {uploadHistory.length > 3 && (
              <Tag color="blue">
                {showAllHistory ? 'Showing 10' : 'Showing 3'} of {uploadHistory.length}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {uploadHistory.length > 3 && (
              <Button 
                onClick={toggleHistoryView}
                size="small"
                type={showAllHistory ? 'default' : 'primary'}
              >
                {showAllHistory ? 'Show Less' : 'Show More'}
              </Button>
            )}
            <Button onClick={loadUploadHistory} loading={loadingHistory}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Spin spinning={loadingHistory}>
          <Table
            columns={historyColumns}
            dataSource={getDisplayedHistory()}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>

      {/* Employee Data Section */}
      {employeeData.length > 0 && (
        <>
          <Divider />
          <Card 
            title={`Employee Data ${selectedUploadId ? `(Upload #${selectedUploadId})` : ''}`}
            extra={
              <Button onClick={() => loadEmployeeData()} loading={loadingData}>
                View All Data
              </Button>
            }
          >
            <Spin spinning={loadingData}>
              <Table
                columns={employeeColumns}
                dataSource={employeeData}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1200 }}
                size="small"
              />
            </Spin>
          </Card>
        </>
      )}
    </div>
  );

  const MySkillsContent: React.FC = () => (
    <div className="admin-actions-content">
      {/* Upload Section */}
      <Card title="Upload MySkills Excel File" className="upload-card">
        <div className="upload-section">
          <Upload {...uploadProps}>
            <Button 
              icon={<UploadOutlined />} 
              size="large"
              loading={uploading}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Click to Upload MySkills Excel File'}
            </Button>
          </Upload>
          
          {/* Error Display */}
          {uploadError && (
            <div style={{ 
              background: '#fff2f0', 
              border: '1px solid #ffccc7', 
              borderRadius: '6px', 
              padding: '16px',
              marginTop: '12px',
              position: 'relative'
            }}>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={clearUploadError}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  color: '#ff4d4f',
                  padding: '4px',
                  minWidth: 'auto',
                  height: 'auto'
                }}
              />
              <div style={{ 
                whiteSpace: 'pre-line',
                fontSize: '13px',
                lineHeight: '1.5',
                paddingRight: '24px' // Make room for close button
              }}>
                <Text type="danger">
                  {uploadError}
                </Text>
              </div>
            </div>
          )}
          <div className="upload-info">
            <div style={{ 
              background: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '12px'
            }}>
              <Text type="success">
                <strong>📋 Required Excel Format:</strong>
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  <strong>Column Headers:</strong> Employee ID, Skill Category, Skill Name, 
                  Proficiency (Current), Last Used, Experience, Endorsement Status
                </Text>
              </div>
            </div>
            <div style={{ 
              background: '#e6f7ff', 
              border: '1px solid #91d5ff', 
              borderRadius: '6px', 
              padding: '12px',
              marginBottom: '12px'
            }}>
              <Text type="secondary">
                <strong>ℹ️ Processing Rules:</strong>
              </Text>
              <ul style={{ 
                marginTop: '8px', 
                marginBottom: '0',
                paddingLeft: '20px',
                marginLeft: '0'
              }}>
                <li>Only records with "Endorsed" status will be processed</li>
                <li>Only employees with Cognizant IDs that exist in the CVs database will be included</li>
              </ul>
            </div>
            <Text type="warning" style={{ marginTop: '8px', display: 'block' }}>
              <strong>⚠️ Warning:</strong> This will completely replace all existing MySkills data with the new file data.
            </Text>
          </div>
        </div>
      </Card>

      <Divider />

      {/* Upload History Section */}
      <Card 
        title={
          <Space>
            <HistoryOutlined />
            Upload History
            {uploadHistory.length > 3 && (
              <Tag color="blue">
                {showAllHistory ? 'Showing 10' : 'Showing 3'} of {uploadHistory.length}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            {uploadHistory.length > 3 && (
              <Button 
                onClick={toggleHistoryView}
                size="small"
                type={showAllHistory ? 'default' : 'primary'}
              >
                {showAllHistory ? 'Show Less' : 'Show More'}
              </Button>
            )}
            <Button onClick={loadUploadHistory} loading={loadingHistory}>
              Refresh
            </Button>
          </Space>
        }
      >
        <Spin spinning={loadingHistory}>
          <Table
            columns={historyColumns}
            dataSource={getDisplayedHistory()}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Spin>
      </Card>

      {/* MySkills Data Section */}
      {mySkillsData.length > 0 && (
        <>
          <Divider />
          <Card 
            title={`MySkills Data ${selectedUploadId ? `(Upload #${selectedUploadId})` : ''}`}
            extra={
              <Button onClick={() => loadMySkillsData()} loading={loadingData}>
                View All Data
              </Button>
            }
          >
            <Spin spinning={loadingData}>
              <Table
                columns={mySkillsColumns}
                dataSource={mySkillsData}
                rowKey="id"
                pagination={{ pageSize: 20 }}
                scroll={{ x: 1000 }}
                size="small"
              />
            </Spin>
          </Card>
        </>
      )}
    </div>
  );

  const tabItems = [
    {
      key: 'availability',
      label: (
        <Space>
          <TeamOutlined />
          Availability
        </Space>
      ),
      children: <AvailabilityContent />,
    },
    {
      key: 'myskills',
      label: (
        <Space>
          <StarOutlined />
          MySkills
        </Space>
      ),
      children: <MySkillsContent />,
    },
  ];

  return (
    <div className="admin-actions">
      <div className="admin-actions-header">
        <Title level={3}>Admin Actions</Title>
        <Text type="secondary">
          Manage system data and perform administrative tasks
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="admin-actions-tabs"
      />

      {/* Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            Confirm {activeTab === 'myskills' ? 'MySkills' : 'Excel'} Upload
          </Space>
        }
        open={showConfirmModal}
        onOk={handleConfirmUpload}
        onCancel={handleCancelUpload}
        okText="Yes, Replace All Data"
        cancelText="Cancel"
        okButtonProps={{ 
          danger: true,
          loading: uploading
        }}
        cancelButtonProps={{ disabled: uploading }}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text strong>File: {pendingFile?.name}</Text>
          <br />
          <Text type="secondary">Size: {(pendingFile?.size! / 1024 / 1024).toFixed(2)} MB</Text>
        </div>
        
        <div style={{ 
          background: '#fff7e6', 
          border: '1px solid #ffd591', 
          borderRadius: '6px', 
          padding: '12px',
          marginBottom: '16px'
        }}>
          <Text type="warning">
            <strong>⚠️ This action will:</strong>
          </Text>
          <ul style={{ 
            marginTop: '8px', 
            marginBottom: '0',
            paddingLeft: '20px',
            marginLeft: '0'
          }}>
            {activeTab === 'myskills' ? (
              <>
                <li>Delete ALL existing MySkills data</li>
                <li>Replace it with endorsed skills data from the uploaded file</li>
                <li>Only process employees with Cognizant IDs in the CVs database</li>
              </>
            ) : (
              <>
                <li>Delete ALL existing employee data</li>
                <li>Replace it with data from the uploaded file</li>
              </>
            )}
            <li>This action cannot be undone</li>
          </ul>
        </div>
        
        <Text>Are you sure you want to proceed with this upload?</Text>
      </Modal>
    </div>
  );
};

export default AdminActions;
