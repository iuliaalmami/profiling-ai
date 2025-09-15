import React, { useState, useEffect } from 'react';
import { Upload, Table, Card, Button, message, Spin, Tag, Space, Typography, Divider, Modal, Tabs } from 'antd';
import { UploadOutlined, HistoryOutlined, FileExcelOutlined, ExclamationCircleOutlined, TeamOutlined } from '@ant-design/icons';
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

const AdminActions: React.FC = () => {
  const [activeTab, setActiveTab] = useState('availability');
  const [uploading, setUploading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [employeeData, setEmployeeData] = useState<EmployeeData[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<number | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

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

  const handleFileSelection = (file: File) => {
    setPendingFile(file);
    setShowConfirmModal(true);
    return false; // Prevent automatic upload
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    
    setUploading(true);
    setShowConfirmModal(false);
    
    try {
      const formData = new FormData();
      formData.append('file', pendingFile);

      console.log('Uploading file:', pendingFile.name, 'Size:', pendingFile.size);

      const response = await api.post('/admin/excel/upload', formData);

      const result = await response.json();
      console.log('Upload response:', result);
      
      if (result.success) {
        message.success(
          `File uploaded successfully! ${result.successful_records} records processed, ${result.failed_records} failed.`
        );
        loadUploadHistory();
        loadEmployeeData(result.upload_id);
      } else {
        message.error('Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.detail || 'Upload failed';
      message.error(errorMessage);
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const handleCancelUpload = () => {
    setShowConfirmModal(false);
    setPendingFile(null);
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
          onClick={() => loadEmployeeData(record.id)}
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
          <div className="upload-info">
            <Text type="secondary">
              <strong>Required columns:</strong> Associate Id, Associate Name, Grade, Designation, 
              Date of Joining, Dept Name, Project ID, Project Description, Account ID, 
              Account Name, Billability Status, City, Assignment Start Date, Assignment End Date, 
              Percent Allocation
            </Text>
            <br />
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
    // Future tabs can be added here
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
            Confirm Excel Upload
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
          <ul style={{ marginTop: '8px', marginBottom: '0' }}>
            <li>Delete ALL existing employee data</li>
            <li>Replace it with data from the uploaded file</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
        
        <Text>Are you sure you want to proceed with this upload?</Text>
      </Modal>
    </div>
  );
};

export default AdminActions;
