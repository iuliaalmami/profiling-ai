import { useEffect, useRef } from 'react';
import { RightOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Typography, Spin } from 'antd';
import Sider from 'antd/es/layout/Sider';
import './AiSideChat.scss';
import { useChat } from '@ai-sdk/react';

const { Title, Text, Paragraph } = Typography;

const AiSideChat = () => {
  const sessionId = 'ai-sidebar-session';
  const inputRef = useRef(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    id: sessionId,
    api: 'http://127.0.0.1:8000/api/v1/chat',
    initialMessages: [],
    experimental_prepareRequestBody({ messages, id }) {
      return {
        message: messages[messages.length - 1],
        id,
      };
    },
  });

  const handleSuggestionClick = (text: string) => {
    append({ role: 'user', content: text });
    handleSubmit(new Event('submit'), { data: { content: text } });
  };

  return (
    <Sider className="matches-right" width={300} theme="light">
      <div className="ai-assistant-wrapper">
        <div className="ai-top">
          <Title level={5}>AI Assistant</Title>

          <div className="ai-assistant-info">
            <RobotOutlined className="ai-icon" />
            <div>
              <Text strong>Curious about your matches?</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Feel free to ask me for more details about any profile in the current list.
              </Paragraph>
            </div>
          </div>

          <div className="ai-suggestions">
            <Button
              className="ai-suggestion-tile"
              block
              onClick={() => handleSuggestionClick('Why did [name] get a 100% match score?')}
            >
              Why did [name] get a 100% match score?
              <RightOutlined />
            </Button>
            <Button
              className="ai-suggestion-tile"
              block
              onClick={() =>
                handleSuggestionClick(
                  'What does [name] need to do to increase her matching score to 100%?',
                )
              }
            >
              What does [name] need to do to increase her matching score to 100%?
              <RightOutlined />
            </Button>
          </div>
        </div>

        <div className="ai-middle">
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <>
                    <RobotOutlined className="chat-icon" />
                    <Typography.Paragraph>{msg.content}</Typography.Paragraph>
                  </>
                ) : (
                  <>
                    <UserOutlined className="chat-icon" />
                    <Typography.Text>{msg.content}</Typography.Text>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="ai-input">
          <Input
            ref={inputRef}
            placeholder="type your prompt here"
            value={input}
            onChange={handleInputChange}
            onPressEnter={e => handleSubmit(e)}
            suffix={
              <SendOutlined
                onClick={e => handleSubmit(new Event('submit'))}
                style={{ cursor: 'pointer' }}
              />
            }
          />
        </div>
      </div>
    </Sider>
  );
};

export default AiSideChat;
