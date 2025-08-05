import { useEffect, useRef } from 'react';
import { RightOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Typography, Spin } from 'antd';
import Sider from 'antd/es/layout/Sider';
import './AiSideChat.scss';
import { useChat, type Message } from '@ai-sdk/react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { Markdown } from '../Markdown/Markdown';

const { Title, Text, Paragraph } = Typography;

interface AiSideChatProps {
  chatId?: string;
}

const AiSideChat = ({ chatId }: AiSideChatProps) => {
  const inputRef = useRef(null);
  
  // Use chatId if provided, otherwise fallback to generic session
  const sessionId = chatId || 'ai-sidebar-session';
  const shouldLoadHistory = !!chatId; // Only load history if we have a specific chatId
  
  console.log(`[AiSideChat] Initializing with chatId: ${chatId}, sessionId: ${sessionId}`);
  
  // Load chat history if we have a chatId
  const [initialMessages] = useChatHistory(chatId || '', !shouldLoadHistory);

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    id: sessionId,
    api: 'http://127.0.0.1:8000/api/v1/smart-chat/stream',
    initialMessages: initialMessages as Message[],
    experimental_prepareRequestBody({ messages }) {
      const lastMessage = messages[messages.length - 1];
      const body: any = { message: lastMessage?.content ?? '' };

      // Use chatId for API if available
      if (chatId && /^\d+$/.test(chatId)) {
        body.id = parseInt(chatId, 10);
      } else {
        body.id = '';
      }

      console.log(`[AiSideChat] Sending request with body:`, body);
      return body;
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
              onClick={() => handleSuggestionClick('Tell me about the top 3 candidates')}
            >
              Tell me about the top 3 candidates
              <RightOutlined />
            </Button>
            <Button
              className="ai-suggestion-tile"
              block
              onClick={() =>
                handleSuggestionClick(
                  'What skills are missing in the lower-scored candidates?',
                )
              }
            >
              What skills are missing in the lower-scored candidates?
              <RightOutlined />
            </Button>
          </div>
        </div>

        <div className="ai-middle">
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => {
              const bubbleClass = `chat-bubble ${msg.role}`;
              
              return (
                <div key={idx} className={bubbleClass}>
                  {msg.role === 'assistant' ? (
                    <>
                      <div className="assistant-message-content">
                        <RobotOutlined className="chat-icon" />
                        <div className="message-text">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="user-message-content">
                        <span className="message-text">{msg.content}</span>
                        <UserOutlined className="chat-icon" />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {isLoading && (
              <div className="chat-bubble assistant loading">
                <div className="assistant-message-content">
                  <RobotOutlined className="chat-icon" />
                  <div className="message-text">
                    <Spin size="small" /> Thinking...
                  </div>
                </div>
              </div>
            )}
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
