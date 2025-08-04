import './JobDescription.scss';
import { useState } from 'react';
import FiltersBar from '../Filter/Filter';
import JobCard from '../JobCard/JobCard';
import { Typography } from 'antd';

const data = [
  {
    id: 1,
    client: 'GSK',
    title: 'Senior Frontend Developer',
    skills: ['Ant Design', 'React', 'Figma'],
    description:
      'We supply a series of design principles, practical patterns and high quality design resources (Sketch and Axure), to help people create their product prototypes beautifully and efficiently.',
    postedDate: '2025-06-30',
    matches: 20,
  },
  {
    id: 2,
    client: 'Client B',
    title: 'Junior Backend Developer',
    skills: ['Node.js', 'Express', 'MongoDB'],
    description: 'Backend API development and database management.',
    postedDate: '2025-06-25',
    matches: 15,
  },
];

const JobDescription = () => {
  const [selectedClient, setSelectedClient] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = data.filter(item => {
    const matchesClient = selectedClient === 'all' || item.client === selectedClient;
    const searchTarget = `${item.title} - ${item.client}`.toLowerCase();
    const matchesSearch = searchTarget.includes(searchQuery.toLowerCase());
    return matchesClient && matchesSearch;
  });

  return (
    <div className="job-description-wrapper">
      <div className="job-description-content">
        <FiltersBar
          selectedClient={selectedClient}
          setSelectedClient={setSelectedClient}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="job-description-list">
          {filteredData.length ? (
            filteredData.map(job => <JobCard key={job.id} job={job} />)
          ) : (
            <Typography.Text>No jobs found.</Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDescription;
