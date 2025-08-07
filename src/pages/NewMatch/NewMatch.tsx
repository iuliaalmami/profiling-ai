import { Typography, Breadcrumb } from 'antd';
import './NewMatch.scss';
import AiChat from '../../components/AiChat/AiChat';
import { useParams } from 'react-router-dom';

const NewMatchPage = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="new-match-wrapper">
      <div className="new-match-header">
        <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />
        <div className="new-match-header-row">
          <Typography.Title level={3}>New Talent Search</Typography.Title>
        </div>
      </div>

      <div className="new-match-content">
        <AiChat 
          key={id || 'new'} 
          chatId={id === 'new' ? '' : (id || '')} 
        />
      </div>
    </div>
  );
};

export default NewMatchPage;
