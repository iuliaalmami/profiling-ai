import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RightOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Typography, Spin } from 'antd';
import Sider from 'antd/es/layout/Sider';
import './AiSideChat.scss';
import { useChat, type Message } from '@ai-sdk/react';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useAuth } from '../../contexts/AuthContext';
import { handleTokenExpiration, API_BASE_URL } from '../../utils/api';
import { Markdown } from '../Markdown/Markdown';

const { Title, Text, Paragraph } = Typography;

interface AiSideChatProps {
  chatId?: string;
  candidateName?: string;
  autoSendContext?: boolean;
  autoClearContext?: boolean;
}

const AiSideChat = ({
  chatId,
  candidateName,
  autoSendContext = false,
  autoClearContext = false,
}: AiSideChatProps) => {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use chatId if provided, otherwise fallback to generic session
  const sessionId = chatId || 'ai-sidebar-session';
  const shouldLoadHistory = !!chatId; // Only load history if we have a specific chatId

  // Load chat history if we have a chatId
  const [initialMessages] = useChatHistory(chatId || '', !shouldLoadHistory);

  const [contextMessageSent, setContextMessageSent] = useState(false);
  const location = useLocation();
  const previousPropsRef = useRef<{ autoSendContext?: boolean; autoClearContext?: boolean }>({});

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = useChat({
    id: sessionId,
    api: `${API_BASE_URL}/api/v1/smart-chat/stream`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    initialMessages: initialMessages as Message[],
    onError: (error) => {
      console.error('[AiSideChat] Error during streaming:', error);
      // Check if it's a 401 error from the response
      if (error.message && error.message.includes('401')) {
        console.log('[AiSideChat] Token expired during streaming, handling...');
        handleTokenExpiration();
      }
    },
    experimental_prepareRequestBody({ messages }) {
      const lastMessage = messages[messages.length - 1];
      const body: any = { message: lastMessage?.content ?? '' };

      // Use chatId for API if available
      if (chatId && /^\d+$/.test(chatId)) {
        body.id = parseInt(chatId, 10);
      } else {
        body.id = '';
      }

      return body;
    },
  });

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-send context message when component loads with candidate name
  useEffect(() => {
    const shouldSendContext =
      autoSendContext && candidateName && !contextMessageSent && initialMessages.length === 0; // Only if no initial messages (new conversation)

    if (shouldSendContext) {
      const contextMessage = `Now we only discuss about ${candidateName}, please respond according to his cv only`;

      // Use setTimeout to ensure the chat is fully initialized
      setTimeout(() => {
        append({ role: 'user', content: contextMessage });
        setContextMessageSent(true);
      }, 500);
    }
  }, [autoSendContext, candidateName, contextMessageSent, initialMessages.length, append]);

  // Context tracking with sessionStorage for reliability
  useEffect(() => {
    const currentProps = { autoSendContext, autoClearContext };
    const previousProps = previousPropsRef.current;

    // Track context state in sessionStorage for persistence across navigation
    const contextKey = `aiSideChat_context_${chatId}`;
    const storedContext = sessionStorage.getItem(contextKey);

    // Set context when on profile page
    if (autoSendContext && candidateName) {
      sessionStorage.setItem(contextKey, 'profile');
    }

    // Detect transition to matches page and clear if needed
    const wasOnProfile =
      storedContext === 'profile' ||
      (previousProps.autoSendContext && !previousProps.autoClearContext);
    const nowOnMatches = !currentProps.autoSendContext && currentProps.autoClearContext;
    const shouldClearContext = wasOnProfile && nowOnMatches;

    // Also check if we have a candidate context message that needs clearing
    const contextMessage = `Now we only discuss about`;
    const hasContextMessage = messages.some(
      msg => msg.role === 'user' && msg.content.includes(contextMessage),
    );

    if (shouldClearContext && hasContextMessage) {
      // Check if we haven't already sent a clear message recently
      const clearMessage = `We are no longer discussing a specific candidate. Please return to general conversation about all candidates and matches.`;
      const lastMessage = messages[messages.length - 1];
      const recentlyCleared = lastMessage && lastMessage.content === clearMessage;

      if (!recentlyCleared && messages.length > 0) {
        // Clear the stored context
        sessionStorage.setItem(contextKey, 'cleared');

        setTimeout(() => {
          append({ role: 'user', content: clearMessage });
        }, 1000);
      }
    }

    // Update previous props for next comparison
    previousPropsRef.current = currentProps;
  }, [
    autoSendContext,
    autoClearContext,
    candidateName,
    messages,
    append,
    location.pathname,
    chatId,
  ]);

  const handleSuggestionClick = (text: string) => {
    append({ role: 'user', content: text });
    handleSubmit(new Event('submit'), { data: { content: text } });
  };

  return (
    <Sider className="matches-right" width={300} theme="light">
      <div className="ai-assistant-wrapper">
        <div className="ai-middle">
          <div className="ai-chat-messages">
            <div className="ai-top">
              <Title level={5}>AI Assistant</Title>

              <div className="ai-assistant-info">
                <RobotOutlined className="ai-icon" />
                <div>
                  <Text strong>Curious about your matches?</Text>
                  <Paragraph type="secondary" className="ai-chat-summary">
                    Feel free to ask me for more details about any profile in the current list.
                  </Paragraph>
                </div>
              </div>

              <div className="ai-suggestions">
                {autoSendContext && candidateName ? (
                  // Suggestions for individual candidate context
                  <>
                    <Button
                      className="ai-suggestion-tile"
                      block
                      onClick={() =>
                        handleSuggestionClick(`What are ${candidateName}'s strongest skills?`)
                      }
                    >
                      What are {candidateName}'s strongest skills?
                      <RightOutlined />
                    </Button>
                    <Button
                      className="ai-suggestion-tile"
                      block
                      onClick={() => handleSuggestionClick(`How does ${candidateName} fit this role?`)}
                    >
                      How does {candidateName} fit this role?
                      <RightOutlined />
                    </Button>
                  </>
                ) : (
                  // General suggestions for matches overview
                  <>
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
                        handleSuggestionClick('What skills are missing in the lower-scored candidates?')
                      }
                    >
                      What skills are missing in the lower-scored candidates?
                      <RightOutlined />
                    </Button>
                  </>
                )}
              </div>
            </div>
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
                        <UserOutlined className="chat-icon" />
                        <span className="message-text">{msg.content}</span>
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
            <div ref={messagesEndRef} />
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
                onClick={() => handleSubmit(new Event('submit'))}
                className="ai-chat-clickable"
              />
            }
          />
        </div>
      </div>
    </Sider>
  );
};

export default AiSideChat;
