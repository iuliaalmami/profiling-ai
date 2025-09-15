import './JobDescription.scss';
import { useState, useEffect } from 'react';
import JobCard from '../JobCard/JobCard';
import { Typography, Spin, message, Input, Pagination } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_BASE_URL } from '../../utils/api';

interface JobMatch {
  id: number;
  title: string;
  skills?: string[];
  description: string;
  postedDate?: string;
  matches?: number;
  created_at?: string;
  job_description?: string;
  job_title?: string;
}

const JobDescription = () => {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [data, setData] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);



  // Fetch matches data for the authenticated user using new endpoint
  useEffect(() => {
    const fetchMatches = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await api.get(`${API_BASE_URL}/api/v1/user/matches`);

        if (response.ok) {
          const matches = await response.json();
          
          // Group matches by job_prompt and count them
          const jobGroups = matches.reduce((groups: any, match: any) => {
            const jobTitle = match.job_prompt || 'Untitled Job';
            const jobKey = `${jobTitle}_${match.chat_id || 'unknown'}`;
            
            if (!groups[jobKey]) {
              groups[jobKey] = {
                id: match.chat_id || match.id,
                title: jobTitle,
                skills: match.skills || [],
                description: match.job_description || '',
                postedDate: match.created_at ? new Date(match.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                matches: 0,
                created_at: match.created_at,
                matchList: []
              };
            }
            
            groups[jobKey].matches += 1;
            groups[jobKey].matchList.push(match);
            return groups;
          }, {});
          
          const transformedMatches = Object.values(jobGroups) as JobMatch[];
          
          // Filter out jobs with 0 matches and sort by latest first
          const filteredAndSorted = transformedMatches
            .filter((job: JobMatch) => job.matches! > 0)
            .sort((a: JobMatch, b: JobMatch) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
          
          setData(filteredAndSorted);
        } else {
          message.error('Failed to fetch matches');
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        message.error('Error loading matches');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [token]);

  const filteredData = data.filter(item => {
    const searchTarget = item.title.toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handlePaginationChange = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Calculate paginated data
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return (
    <div className="job-description-wrapper">
      <div className="job-description-content">
        <div className="search-section">
          <Typography.Text strong>Search Jobs:</Typography.Text>
          <Input.Search
            placeholder="Search by job title..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-section__input"
            allowClear
          />
        </div>

        <div className="job-description-list">
          {loading ? (
            <div className="loading-container">
              <Spin size="large" />
              <Typography.Text className="loading-container__text">
                Loading your history...
              </Typography.Text>
            </div>
          ) : filteredData.length ? (
            <>
              {paginatedData.map(job => <JobCard key={job.id} job={{
                id: job.id,
                title: job.title,
                skills: job.skills || [],
                description: job.description,
                postedDate: job.postedDate || '',
                matches: job.matches || 0
              }} />)}
              
              {filteredData.length > pageSize && (
                <div className="pagination-container" style={{ 
                  marginTop: '20px', 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={filteredData.length}
                    showSizeChanger={true}
                    showQuickJumper={true}
                    pageSizeOptions={['10', '20', '50', '100']}
                    showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} jobs`}
                    onChange={handlePaginationChange}
                    onShowSizeChange={handlePaginationChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="empty-container">
              <Typography.Text>
                {data.length === 0 ? 'No chats found. Start a new chat to create your first job match!' : 'No jobs match your current filters.'}
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDescription;
