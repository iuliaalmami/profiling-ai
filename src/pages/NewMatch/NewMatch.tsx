import { Button, Typography, Breadcrumb } from 'antd';
import './NewMatch.scss';
import AiChat from '../../components/AISideBar/AiChat';
import { useNavigate } from 'react-router-dom';

const NewMatchPage = () => {
  const navigate = useNavigate();

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="new-match-wrapper">
      <div className="new-match-header">
        <Breadcrumb items={[{ title: 'Home' }, { title: 'New Talent Search' }]} />
        <div className="new-match-header-row">
          <Typography.Title level={3}>New Talent Search</Typography.Title>
          <Button onClick={handleCancel} type="default">
            Cancel
          </Button>
        </div>
      </div>

      <div className="new-match-content">
        <AiChat chatId="" />
      </div>
    </div>
  );
};

export default NewMatchPage;
