import './JobDescription.scss';
import { useState, useEffect } from 'react';
import JobCard from '../JobCard/JobCard';
import { Typography, Spin, message, Input } from 'antd';
import { useAuth } from '../../contexts/AuthContext';

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



  // Fetch matches data for the authenticated user using new endpoint
  useEffect(() => {
    const fetchMatches = async () => {
      if (!token) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://127.0.0.1:8000/api/v1/user/matches`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

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

  return (
    <div className="job-description-wrapper">
      <div className="job-description-content">
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px' 
        }}>
          <Typography.Text strong>Search Jobs:</Typography.Text>
          <Input.Search
            placeholder="Search by job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '300px' }}
            allowClear
          />
        </div>

        <div className="job-description-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <Spin size="large" />
              <Typography.Text style={{ display: 'block', marginTop: '16px' }}>
                Loading your chats...
              </Typography.Text>
            </div>
          ) : filteredData.length ? (
            filteredData.map(job => <JobCard key={job.id} job={{
              id: job.id,
              title: job.title,
              skills: job.skills || [],
              description: job.description,
              postedDate: job.postedDate || '',
              matches: job.matches || 0
            }} />)
          ) : (
            <div style={{ textAlign: 'center', padding: '50px' }}>
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
