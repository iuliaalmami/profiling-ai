import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Tooltip,
  DatePicker,
} from 'antd';
import type { ColumnsType, SortOrder } from 'antd/es/table/interface';
import { InboxOutlined, SearchOutlined, ClockCircleOutlined, ExclamationCircleOutlined, CheckCircleOutlined, QuestionCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';
import './Profile.scss';

const { Content } = Layout;
const { Title } = Typography;

interface EmployeeData {
  associate_name?: string;
  grade?: string;
  designation?: string;
  date_of_joining?: string;
  dept_name?: string;
  project_id?: string;
  project_description?: string;
  account_id?: string;
  account_name?: string;
  billability_status?: string;
  city?: string;
  assignment_start_date?: string;
  assignment_end_date?: string;
  percentage_allocation?: string;
}

interface ProfileData {
  id: string;
  cv_id?: number | string;
  name: string;
  cognizant_id?: string;
  role?: string;
  last_updated?: string;
  skills?: string[];
  experience?: Array<{
    role?: string;
    title?: string;
    company?: string;
    duration?: string;
  }>;
  employee_data?: EmployeeData | null;
}

const ProfilePage = () => {
  const { } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ProfileData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilterDate, setAvailabilityFilterDate] = useState<Dayjs | null>(null);
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
  const [showAllEmployeeInfo, setShowAllEmployeeInfo] = useState(false);
  
  // Bulk upload results state (keeping for backward compatibility)
  const [bulkUploadResults, setBulkUploadResults] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [showBulkResults, setShowBulkResults] = useState(false);
  
  // Confirmation modal state
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    name: string;
    cognizant_id: string;
    filename: string;
    rawData: any;
  } | null>(null);
  
  // Bulk confirmation modal state
  const [isBulkConfirmationModalOpen, setIsBulkConfirmationModalOpen] = useState(false);
  const [bulkExtractedData, setBulkExtractedData] = useState<{
    results: Array<{
      filename: string;
      name: string;
      cognizant_id: string;
      email: string;
      status: 'success' | 'failed';
      error_message?: string;
      extracted_data?: any;
    }>;
    summary: any;
  } | null>(null);
  
  // Edit Cognizant ID modal state
  const [isEditCognizantIdModalOpen, setIsEditCognizantIdModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileData | null>(null);
  const [newCognizantId, setNewCognizantId] = useState('');

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      try {
        // Request profiles with employee data
        const profilesRes = await api.get(`${API_BASE_URL}/api/v1/profiles?include_employee_data=true`);

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
            cognizant_id: profile.cognizant_id,
            role: extractRole(profile),
            last_updated:
              profile.last_update ||
              profile.updated_at ||
              profile.created_at ||
              new Date().toISOString(),
            skills: profile.skills || [],
            experience: profile.experience || [],
            employee_data: profile.employee_data || null,
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

  // Filter profiles based on search term and availability
  useEffect(() => {
    let filtered = profiles;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(profile => {
        const searchLower = searchTerm.toLowerCase();
        
        // Search in name
        const nameMatch = profile.name.toLowerCase().includes(searchLower);
        
        // Search in cognizant_id
        const cognizantIdMatch = profile.cognizant_id?.toLowerCase().includes(searchLower) || false;
        
        // Search in skills
        const skillsMatch = profile.skills?.some(skill => 
          skill.toLowerCase().includes(searchLower)
        ) || false;
        
        // Search in role (optional)
        const roleMatch = profile.role?.toLowerCase().includes(searchLower) || false;
        
        // Search in employee_data fields
        const employeeData = profile.employee_data;
        const employeeDataMatch = employeeData ? (
          // Search in associate_name
          (employeeData.associate_name?.toLowerCase().includes(searchLower)) ||
          // Search in designation (e.g., "Test Analyst")
          (employeeData.designation?.toLowerCase().includes(searchLower)) ||
          // Search in city (e.g., "timisoara")
          (employeeData.city?.toLowerCase().includes(searchLower)) ||
          // Search in department name
          (employeeData.dept_name?.toLowerCase().includes(searchLower)) ||
          // Search in account name
          (employeeData.account_name?.toLowerCase().includes(searchLower)) ||
          // Search in project description
          (employeeData.project_description?.toLowerCase().includes(searchLower))
        ) : false;
        
        return nameMatch || cognizantIdMatch || skillsMatch || roleMatch || employeeDataMatch;
      });
    }

    // Apply availability filter - "Available from" (includes those already available)
    if (availabilityFilterDate) {
      filtered = filtered.filter(profile => {
        const availability = formatAvailability(profile.employee_data || null);
        
        if (availability === 'Now') {
          // Available now - always included in "available from" filter
          return true;
        } else if (availability === 'Unknown') {
          // Unknown availability - don't include in date-based filters
          return false;
        } else {
          // Has a specific availability date - show if available from selected date or earlier
          const availabilityDate = new Date(profile.employee_data?.assignment_end_date || '');
          const filterDate = availabilityFilterDate.toDate();
          return availabilityDate <= filterDate;
        }
      });
    }

    setFilteredProfiles(filtered);
  }, [searchTerm, profiles, availabilityFilterDate]);

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

  const handleAiChat = async (profile: ProfileData) => {
    try {
      // Create a new profile chat
      const response = await api.post(`${API_BASE_URL}/api/v1/profile-chat`, {
        cv_id: parseInt(profile.cv_id!.toString()),
        title: `Chat about ${profile.name}`
      });

      if (response.ok) {
        const chatData = await response.json();
        // Navigate to the profile chat page
        navigate(`/profile-chat/${chatData.id}`);
      } else {
        message.error('Failed to create AI chat. Please try again.');
      }
    } catch (error) {
      console.error('Error creating AI chat:', error);
      message.error('An error occurred while creating AI chat. Please try again.');
    }
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

  // Helper function to get employee data fields to show (first 3)
  const getEmployeeDataFields = (employeeData: EmployeeData) => {
    const fields = [
      { label: 'Employee Name:', value: employeeData.associate_name || 'N/A' },
      { label: 'Grade:', value: employeeData.grade || 'N/A' },
      { label: 'Designation:', value: employeeData.designation || 'N/A' },
      { label: 'Department:', value: employeeData.dept_name || 'N/A' },
      { label: 'Date of Joining:', value: employeeData.date_of_joining 
        ? new Date(employeeData.date_of_joining).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'N/A' },
      { label: 'Location:', value: employeeData.city || 'N/A' },
      { label: 'Billability Status:', value: employeeData.billability_status === 'Y' ? 'Billable' : 'Non-Billable', isTag: true, tagColor: employeeData.billability_status === 'Y' ? 'green' : 'orange' },
      { label: 'Allocation:', value: employeeData.percentage_allocation || 'N/A' },
    ];
    
    return showAllEmployeeInfo ? fields : fields.slice(0, 3);
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

  // Helper function to check if profile is older than 3 months
  const isProfileOutdated = (lastUpdated: string): boolean => {
    if (!lastUpdated) return true; // Consider profiles without update date as outdated
    
    const updateDate = new Date(lastUpdated);
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    return updateDate < threeMonthsAgo;
  };

  // Helper function to format availability display
  const formatAvailability = (employeeData: EmployeeData | null): string => {
    if (!employeeData) {
      return 'Unknown';
    }

    const BENCH_PROJECT_ID = "1000385159.0";
    
    if (employeeData.project_id === BENCH_PROJECT_ID) {
      return 'Now';
    }
    
    if (employeeData.assignment_end_date) {
      const endDate = new Date(employeeData.assignment_end_date);
      return endDate.toLocaleDateString();
    }
    
    return 'Unknown';
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

       // Use bulk process endpoint for multiple files OR if any ZIP files are present (no immediate save)
       // Use process-cv endpoint for single files (no immediate save)
       const endpoint = isBulkUpload
         ? `${API_BASE_URL}/api/v1/process-cv/bulk`
         : `${API_BASE_URL}/api/v1/process-cv`;

      const response = await api.post(endpoint, formData, {
        headers: {
          // Don't set Content-Type for FormData, let browser set it
        },
      });

      if (response.ok) {
        const result = await response.json();
        
                 if (isBulkUpload) {
           // Handle bulk process response - show confirmation modal
           const { summary, results } = result;
           
           // Transform results for confirmation modal
           const transformedResults = results.map((r: any) => ({
             filename: r.filename,
             name: r.extracted_data?.name || 'Unknown',
             cognizant_id: r.extracted_data?.cognizant_id || '',
             email: r.extracted_data?.email || '',
             status: r.status,
             error_message: r.error_message,
             extracted_data: r.extracted_data
           }));
           
           setBulkExtractedData({
             results: transformedResults,
             summary: summary
           });
           
           setIsBulkConfirmationModalOpen(true);
           handleModalClose(); // Close upload modal
         } else {
           // Handle single upload response - show confirmation modal
           const extractedName = result.name || 'Unknown';
           const extractedCognizantId = result.cognizant_id || '';
           const filename = fileList[0]?.name || 'Unknown file';
           
           setExtractedData({
             name: extractedName,
             cognizant_id: extractedCognizantId,
             filename: filename,
             rawData: result
           });
           
           setIsConfirmationModalOpen(true);
           handleModalClose(); // Close upload modal
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

  const handleConfirmationConfirm = async (confirmedData: { name: string; cognizant_id: string }) => {
    if (!extractedData) return;
    
    try {
      // Prepare data for saving to database
      const cvDataToSave = {
        ...extractedData.rawData,
        name: confirmedData.name,
        cognizant_id: confirmedData.cognizant_id
      };

      // Save to database via API
      const response = await api.post(`${API_BASE_URL}/api/v1/confirm-cv`, cvDataToSave);
      
      if (response.ok) {
        const savedCvData = await response.json();
        
        // Create a new profile with the saved data
        const newProfile: ProfileData = {
          id: savedCvData.id?.toString() || 'new',
          cv_id: savedCvData.id,
          name: savedCvData.name,
          cognizant_id: savedCvData.cognizant_id,
          role: extractRole(savedCvData),
          last_updated: savedCvData.last_update || new Date().toISOString(),
          skills: savedCvData.skills || [],
          experience: savedCvData.experience || [],
        };

        // Add to profiles list
        setProfiles(prev => [newProfile, ...prev]);
        setFilteredProfiles(prev => [newProfile, ...prev]);
        
        message.success('Profile added successfully!');
        setIsConfirmationModalOpen(false);
        setExtractedData(null);
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Error confirming profile:', error);
      message.error('Failed to save profile. Please try again.');
    }
  };

  const handleConfirmationCancel = () => {
    setIsConfirmationModalOpen(false);
    setExtractedData(null);
    message.info('Upload cancelled');
  };

  const handleBulkConfirmationConfirm = async (confirmedData: Array<{ filename: string; name: string; cognizant_id: string }>) => {
    if (!bulkExtractedData) return;
    
    try {
      // Prepare data for saving to database
      const bulkDataToSave = {
        ...bulkExtractedData,
        results: bulkExtractedData.results.map(result => {
          if (result.status === 'success') {
            const confirmed = confirmedData.find(c => c.filename === result.filename);
            if (confirmed && result.extracted_data) {
              return {
                ...result,
                extracted_data: {
                  ...result.extracted_data,
                  name: confirmed.name,
                  cognizant_id: confirmed.cognizant_id
                }
              };
            }
          }
          return result;
        })
      };

      // Save to database via API
      const response = await api.post(`${API_BASE_URL}/api/v1/confirm-cv/bulk`, bulkDataToSave);
      
      if (response.ok) {
        const savedData = await response.json();
        
        message.success(`Successfully saved ${savedData.summary.successful_saves} profiles!`);
        setIsBulkConfirmationModalOpen(false);
        setBulkExtractedData(null);
        handleModalClose(); // Close upload modal
        
        // Refresh the profiles list to get updated data from database
        window.location.reload();
      } else {
        throw new Error('Failed to save to database');
      }
    } catch (error) {
      console.error('Error confirming bulk profiles:', error);
      message.error('Failed to save profiles. Please try again.');
    }
  };

  const handleBulkConfirmationCancel = () => {
    setIsBulkConfirmationModalOpen(false);
    setBulkExtractedData(null);
    message.info('Bulk upload cancelled');
  };

  const handleEditCognizantId = (profile: ProfileData) => {
    setEditingProfile(profile);
    setNewCognizantId(profile.cognizant_id || '');
    setIsEditCognizantIdModalOpen(true);
  };

  const handleUpdateCognizantId = async () => {
    if (!editingProfile || !newCognizantId.trim()) {
      message.error('Please enter a valid Cognizant ID');
      return;
    }

    try {
      const response = await api.patch(`${API_BASE_URL}/api/v1/cv/${editingProfile.cv_id}/cognizant-id`, {
        cognizant_id: newCognizantId.trim()
      });

      if (response.ok) {
        message.success('Cognizant ID updated successfully!');
        setIsEditCognizantIdModalOpen(false);
        setEditingProfile(null);
        setNewCognizantId('');
        
        // Refresh the profiles list to show updated data
        window.location.reload();
      } else {
        throw new Error('Failed to update Cognizant ID');
      }
    } catch (error) {
      console.error('Error updating Cognizant ID:', error);
      message.error('Failed to update Cognizant ID. Please try again.');
    }
  };

  const handleCancelEditCognizantId = () => {
    setIsEditCognizantIdModalOpen(false);
    setEditingProfile(null);
    setNewCognizantId('');
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
      dataIndex: 'employee_data',
      key: 'name',
      sorter: (a: ProfileData, b: ProfileData) => {
        const nameA = a.employee_data?.associate_name || a.name || '';
        const nameB = b.employee_data?.associate_name || b.name || '';
        return nameA.localeCompare(nameB);
      },
      sortDirections: ['ascend', 'descend', 'ascend'] as SortOrder[],
      render: (employeeData: EmployeeData | null | undefined, record: ProfileData) => {
        const displayName = employeeData?.associate_name || record.name || 'N/A';
        return <span className="profile-page__table-name">{displayName}</span>;
      },
    },
    {
      title: 'Cognizant ID',
      dataIndex: 'cognizant_id',
      key: 'cognizant_id',
      render: (cognizantId: string, record: ProfileData) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#1890ff', fontWeight: '500' }}>
            {cognizantId || 'N/A'}
          </span>
          {(!cognizantId || cognizantId === 'N/A') && (
            <Button
              type="link"
              size="small"
              onClick={() => handleEditCognizantId(record)}
              style={{ 
                padding: '0 4px',
                height: 'auto',
                fontSize: '12px',
                color: '#1890ff'
              }}
              title="Add Cognizant ID"
            >
              +
            </Button>
          )}
        </div>
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
      title: 'Availability',
      dataIndex: 'employee_data',
      key: 'availability',
      render: (employeeData: EmployeeData | null) => {
        const availability = formatAvailability(employeeData);
        const isAvailableNow = availability === 'Now';
        const isUnknown = availability === 'Unknown';
        
        let icon, color, text, className, tooltipTitle;
        
        if (isAvailableNow) {
          icon = <CheckCircleOutlined />;
          color = 'green';
          text = 'Available Now';
          className = 'availability-tag availability-tag--now';
          tooltipTitle = employeeData?.project_description ? `Current Project: ${employeeData.project_description}` : 'Available for new assignments';
        } else if (isUnknown) {
          icon = <QuestionCircleOutlined />;
          color = 'default';
          text = 'Unknown';
          className = 'availability-tag availability-tag--unknown';
          tooltipTitle = 'Project information not available';
        } else {
          icon = <ClockCircleOutlined />;
          color = 'orange';
          text = `Available ${availability}`;
          className = 'availability-tag availability-tag--future';
          tooltipTitle = employeeData?.project_description ? `Current Project: ${employeeData.project_description}` : `Available from ${availability}`;
        }
        
        return (
          <Tooltip 
            title={tooltipTitle}
            placement="top"
            className="availability-tooltip"
          >
            <Tag icon={icon} color={color} className={className}>
              {text}
            </Tag>
          </Tooltip>
        );
      },
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
        const isOutdated = isProfileOutdated(dateString);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{date.toLocaleDateString()}</span>
            {isOutdated && (
              <ExclamationCircleOutlined 
                style={{ color: '#ff4d4f', fontSize: '14px' }} 
                title="Profile hasn't been updated in over 3 months"
              />
            )}
          </div>
        );
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
            className="ai-chat-link"
            onClick={() => handleAiChat(record)}
          >
            aiChat
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
              <Space size="middle">
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
                  placeholder="Search by name, cognizant ID, skills, role, designation, city, department..."
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  style={{ width: 300 }}
                  onSearch={handleSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  value={searchTerm}
                />
              </Space>
            </Col>
          </Row>
          
          {(searchTerm || availabilityFilterDate) && (
            <div style={{ marginBottom: 16 }}>
              <Typography.Text type="secondary">
                Showing {filteredProfiles.length} of {profiles.length} profiles
                {searchTerm && ` for "${searchTerm}"`}
                {availabilityFilterDate && (
                  <span>
                    {searchTerm && ' and '}
                    available from {availabilityFilterDate.format('MMM DD, YYYY')}
                  </span>
                )}
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
                <div className="label">Profile ID:</div>
                <div className="value">{selectedProfile.id}</div>
                
                <div className="label">Cognizant ID:</div>
                <div className="value">{selectedProfile.cognizant_id || 'Not assigned'}</div>
                
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

            {/* Employee Information */}
            {selectedProfile.employee_data && (
              <div className="section">
                <div className="section-title">Employee Information</div>
                <div className="info-grid">
                  {getEmployeeDataFields(selectedProfile.employee_data).map((field, index) => (
                    <React.Fragment key={index}>
                      <div className="label">{field.label}</div>
                      <div className="value">
                        {field.isTag ? (
                          <Tag color={field.tagColor}>{field.value}</Tag>
                        ) : (
                          field.value
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                {(() => {
                  const totalFields = 8; // Total number of employee data fields
                  
                  if (totalFields <= 3) return null;
                  
                  return (
                    <button 
                      className="show-more-btn"
                      onClick={() => setShowAllEmployeeInfo(!showAllEmployeeInfo)}
                    >
                      {showAllEmployeeInfo ? 'Show Less' : `Show More (${totalFields - 3} more)`}
                    </button>
                  );
                })()}
              </div>
            )}

            {/* Current Assignment */}
            {selectedProfile.employee_data && (selectedProfile.employee_data.project_description || selectedProfile.employee_data.account_name) && (
              <div className="section">
                <div className="section-title">Current Assignment</div>
                <div className="info-grid">
                  <div className="label">Project:</div>
                  <div className="value">{selectedProfile.employee_data.project_description || 'N/A'}</div>
                  
                  <div className="label">Client Account:</div>
                  <div className="value">{selectedProfile.employee_data.account_name || 'N/A'}</div>
                  
                  <div className="label">Project ID:</div>
                  <div className="value">{selectedProfile.employee_data.project_id || 'N/A'}</div>
                  
                  <div className="label">Assignment Period:</div>
                  <div className="value">
                    {selectedProfile.employee_data.assignment_start_date && selectedProfile.employee_data.assignment_end_date
                      ? `${new Date(selectedProfile.employee_data.assignment_start_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })} - ${new Date(selectedProfile.employee_data.assignment_end_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            )}

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
                {selectedProfile.employee_data && (
                  <>
                    <div className="summary-card">
                      <span className="summary-label">Employee Status</span>
                      <span className="summary-value">
                        <Tag color={selectedProfile.employee_data.billability_status === 'Y' ? 'green' : 'orange'}>
                          {selectedProfile.employee_data.billability_status === 'Y' ? 'Billable' : 'Non-Billable'}
                        </Tag>
                      </span>
                    </div>
                    <div className="summary-card">
                      <span className="summary-label">Current Allocation</span>
                      <span className="summary-value">{selectedProfile.employee_data.percentage_allocation || 'N/A'}</span>
                    </div>
                    <div className="summary-card">
                      <span className="summary-label">Department</span>
                      <span className="summary-value">{selectedProfile.employee_data.dept_name || 'N/A'}</span>
                    </div>
                  </>
                )}
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

      {/* Confirmation Modal */}
      <Modal
        title="Confirm Profile Information"
        open={isConfirmationModalOpen}
        onCancel={handleConfirmationCancel}
        footer={null}
        width={500}
        className="confirmation-modal"
      >
        {extractedData && (
          <div className="confirmation-content">
            <div className="confirmation-header">
              <Typography.Text type="secondary">
                Please review and confirm the extracted information from: <strong>{extractedData.filename}</strong>
              </Typography.Text>
            </div>
            
            <div className="confirmation-fields">
              <div className="field-group">
                <Typography.Text strong>Name:</Typography.Text>
                <Input
                  value={extractedData.name}
                  onChange={(e) => setExtractedData(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="Enter name"
                  style={{ marginTop: 8 }}
                />
              </div>
              
              <div className="field-group">
                <Typography.Text strong>Cognizant ID:</Typography.Text>
                <Input
                  value={extractedData.cognizant_id}
                  onChange={(e) => setExtractedData(prev => prev ? { ...prev, cognizant_id: e.target.value } : null)}
                  placeholder="Enter Cognizant ID"
                  style={{ marginTop: 8 }}
                />
              </div>
            </div>
            
            <div className="confirmation-actions">
              <Space>
                <Button onClick={handleConfirmationCancel}>
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => handleConfirmationConfirm({
                    name: extractedData.name,
                    cognizant_id: extractedData.cognizant_id
                  })}
                >
                  Done
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Confirmation Modal */}
      <Modal
        title="Confirm Bulk Upload Information"
        open={isBulkConfirmationModalOpen}
        onCancel={handleBulkConfirmationCancel}
        footer={null}
        width={800}
        className="bulk-confirmation-modal"
      >
        {bulkExtractedData && (
          <div className="bulk-confirmation-content">
            <div className="bulk-confirmation-header">
              <Typography.Text type="secondary">
                Please review and confirm the extracted information for {bulkExtractedData.results.length} files:
              </Typography.Text>
            </div>
            
            <div className="bulk-confirmation-table">
              <Table
                dataSource={bulkExtractedData.results}
                columns={[
                  {
                    title: 'Filename',
                    dataIndex: 'filename',
                    key: 'filename',
                    width: 200,
                    render: (filename: string) => (
                      <Typography.Text strong>{filename}</Typography.Text>
                    ),
                  },
                  {
                    title: 'Status',
                    dataIndex: 'status',
                    key: 'status',
                    width: 100,
                    render: (status: string) => (
                      <Tag color={status === 'success' ? 'success' : 'error'}>
                        {status === 'success' ? '✅' : '❌'}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                    width: 150,
                    render: (name: string, record: any) => (
                      record.status === 'success' ? (
                        <Input
                          value={name}
                          onChange={(e) => {
                            const newResults = bulkExtractedData.results.map(r => 
                              r.filename === record.filename 
                                ? { ...r, name: e.target.value }
                                : r
                            );
                            setBulkExtractedData(prev => prev ? { ...prev, results: newResults } : null);
                          }}
                          placeholder="Enter name"
                          size="small"
                        />
                      ) : (
                        <Typography.Text type="secondary">-</Typography.Text>
                      )
                    ),
                  },
                  {
                    title: 'Cognizant ID',
                    dataIndex: 'cognizant_id',
                    key: 'cognizant_id',
                    width: 150,
                    render: (cognizantId: string, record: any) => (
                      record.status === 'success' ? (
                        <Input
                          value={cognizantId}
                          onChange={(e) => {
                            const newResults = bulkExtractedData.results.map(r => 
                              r.filename === record.filename 
                                ? { ...r, cognizant_id: e.target.value }
                                : r
                            );
                            setBulkExtractedData(prev => prev ? { ...prev, results: newResults } : null);
                          }}
                          placeholder="Enter Cognizant ID"
                          size="small"
                        />
                      ) : (
                        <Typography.Text type="secondary">-</Typography.Text>
                      )
                    ),
                  },
                  {
                    title: 'Error',
                    dataIndex: 'error_message',
                    key: 'error_message',
                    render: (error: string) => (
                      error ? (
                        <Typography.Text type="danger" style={{ fontSize: '12px' }}>
                          {error}
                        </Typography.Text>
                      ) : (
                        <Typography.Text type="secondary">-</Typography.Text>
                      )
                    ),
                  },
                ]}
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
              />
            </div>
            
            <div className="bulk-confirmation-summary">
              <Typography.Text>
                <strong>Summary:</strong> {bulkExtractedData.summary.successful_uploads} successful, {bulkExtractedData.summary.failed_uploads} failed
              </Typography.Text>
            </div>
            
            <div className="bulk-confirmation-actions">
              <Space>
                <Button onClick={handleBulkConfirmationCancel}>
                  Cancel All
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => {
                    const successfulResults = bulkExtractedData.results.filter(r => r.status === 'success');
                    const confirmedData = successfulResults.map(r => ({
                      filename: r.filename,
                      name: r.name,
                      cognizant_id: r.cognizant_id
                    }));
                    handleBulkConfirmationConfirm(confirmedData);
                  }}
                  disabled={bulkExtractedData.summary.successful_uploads === 0}
                >
                  Confirm All ({bulkExtractedData.summary.successful_uploads})
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Cognizant ID Modal */}
      <Modal
        title="Edit Cognizant ID"
        open={isEditCognizantIdModalOpen}
        onCancel={handleCancelEditCognizantId}
        footer={null}
        width={400}
        className="edit-cognizant-id-modal"
      >
        {editingProfile && (
          <div className="edit-cognizant-id-content">
            <div className="edit-cognizant-id-header">
              <Typography.Text type="secondary">
                Update Cognizant ID for: <strong>{editingProfile.name}</strong>
              </Typography.Text>
            </div>
            
            <div className="edit-cognizant-id-field">
              <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
                Cognizant ID:
              </Typography.Text>
              <Input
                value={newCognizantId}
                onChange={(e) => setNewCognizantId(e.target.value)}
                placeholder="Enter Cognizant ID"
                style={{ marginBottom: 16 }}
              />
            </div>
            
            <div className="edit-cognizant-id-actions">
              <Space>
                <Button onClick={handleCancelEditCognizantId}>
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  onClick={handleUpdateCognizantId}
                  disabled={!newCognizantId.trim()}
                >
                  Update
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default ProfilePage;
