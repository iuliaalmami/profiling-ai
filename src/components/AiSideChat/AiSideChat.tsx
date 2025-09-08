import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { RightOutlined, RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Typography, Spin } from 'antd';
import Sider from 'antd/es/layout/Sider';
import './AiSideChat.scss';
import { useChat, type Message } from '@ai-sdk/react';
import { useProfileChat } from '../../hooks/useProfileChat';
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
  isProfileChat?: boolean;
  profileContext?: {
    name: string;
    cvData: any;
  };
}


const AiSideChat = ({
  chatId,
  candidateName,
  autoSendContext = false,
  autoClearContext = false,
  isProfileChat = false,
  profileContext,
}: AiSideChatProps) => {
  const { token } = useAuth();
  const inputRef = useRef(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  // Use chatId if provided, otherwise fallback to generic session
  // Make sessionId unique by adding a component mount identifier to prevent caching issues when chats are deleted/recreated
  const [sessionId] = useState(() => {
    if (chatId) {
      return isProfileChat 
        ? `profile-chat-${chatId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        : `chat-${chatId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return 'ai-sidebar-session';
  });
  const shouldLoadHistory = !!chatId; // Only load history if we have a specific chatId

  // CONDITIONAL HOOK USAGE TO PREVENT DUPLICATE API CALLS
  // For profile chats: only use useProfileChat (skip useChatHistory)
  // For regular chats: only use useChatHistory (skip useProfileChat)
  const [initialMessages] = useChatHistory(
    chatId || '', 
    !shouldLoadHistory || isProfileChat, // Disable useChatHistory for profile chats
    isProfileChat
  );

  // Log the hook usage to verify the fix
  useEffect(() => {
    // Chat initialization logic
  }, [chatId, isProfileChat, shouldLoadHistory]);

  const [contextMessageSent, setContextMessageSent] = useState(false);
  const location = useLocation();
  const previousPropsRef = useRef<{ autoSendContext?: boolean; autoClearContext?: boolean }>({});
  const previousChatIdRef = useRef<string | undefined>(chatId);

  // Clear messages when chatId changes to prevent old messages from showing
  useEffect(() => {
    if (previousChatIdRef.current !== chatId) {
      // Chat ID changed, clear any cached messages
      previousChatIdRef.current = chatId;
      // The useChat hook will automatically clear messages when sessionId changes
      
      // Force clear any cached messages by updating the sessionId
    }
  }, [chatId]);

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Use different hooks based on chat type
  let chatHook;
  
  if (isProfileChat) {
    // For profile chats, use our custom hook with simulated streaming
    // Pass initialMessages to avoid duplicate API calls
    chatHook = useProfileChat(chatId || '', initialMessages);
  } else {
    // For regular chats, use the streaming useChat hook
    chatHook = useChat({
      id: sessionId,
      api: `${API_BASE_URL}/api/v1/smart-chat/stream`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      initialMessages: initialMessages as Message[],
      onError: (error) => {
        // Check if it's a 401 error from the response
        if (error.message && error.message.includes('401')) {
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
  }

  // Destructure the appropriate values - both hooks are now useChat
  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = chatHook;

  // Limit messages to prevent performance issues with very long chats
  const displayMessages = useMemo(() => {
    return messages.slice(-30); // Only show last 30 messages
  }, [messages]);


  // Create a unified sendMessage function that works with both hooks
  const sendMessage = useCallback((content: string) => {
    if (isProfileChat) {
      // For profile chats, use the sendMessage from useProfileChat
      const profileChatHook = chatHook as ReturnType<typeof useProfileChat>;
      profileChatHook.sendMessage(content);
    } else {
      // For regular chats, use append
      append({ id: Date.now().toString(), role: 'user', content });
    }
  }, [isProfileChat, chatHook, append]);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isLoading]);

  // Auto-send context message when component loads with candidate name
  useEffect(() => {
    const shouldSendContext =
      autoSendContext && candidateName && !contextMessageSent && initialMessages.length === 0; // Only if no initial messages (new conversation)

    if (shouldSendContext) {
      const contextMessage = `Now we only discuss about ${candidateName}, please respond according to his cv only`;

      // Use setTimeout to ensure the chat is fully initialized
      setTimeout(() => {
        append({ id: Date.now().toString(), role: 'user', content: contextMessage });
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
          append({ id: Date.now().toString(), role: 'user', content: clearMessage });
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
    if (isProfileChat && chatId) {
      // For profile chats, use the sendMessage method from useProfileChat
      const profileChatHook = chatHook as ReturnType<typeof useProfileChat>;
      profileChatHook.sendMessage(text);
    } else {
      // For regular chats, append to local state
      append({ id: Date.now().toString(), role: 'user', content: text });
    }
  };

  return (
    <>
      {isProfileChat ? (
        <div className="ai-side-chat-profile">
          <div className="ai-assistant-wrapper">
            {/* AI Assistant title - outside scrolling area */}
            <Title level={5} className="ai-assistant-title">AI Assistant</Title>
            
            <div className="ai-middle">
              {/* Chat messages area - scrollable (includes info, suggestions, and messages) */}
              <div className="ai-chat-messages">
                <div className="ai-top">
                  <div className="ai-assistant-info">
                    <RobotOutlined className="ai-icon" />
                    <div>
                      <Text strong>
                        {isProfileChat && profileContext 
                          ? `Ask me about ${profileContext.name}`
                          : 'Curious about your matches?'
                        }
                      </Text>
                      <Paragraph type="secondary" className="ai-chat-summary">
                        {isProfileChat && profileContext
                          ? `I have access to ${profileContext.name}'s CV information. Ask me anything about their skills, experience, or background.`
                          : 'Feel free to ask me for more details about any profile in the current list.'
                        }
                      </Paragraph>
                    </div>
                  </div>

                  <div className="ai-suggestions">
                    {isProfileChat && profileContext ? (
                      // Suggestions for profile chat context
                      <>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`What are ${profileContext.name}'s strongest skills?`)}
                        >
                          What are {profileContext.name}'s strongest skills?
                          <RightOutlined />
                        </Button>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`Tell me about ${profileContext.name}'s experience`)}
                        >
                          Tell me about {profileContext.name}'s experience
                          <RightOutlined />
                        </Button>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`What makes ${profileContext.name} unique?`)}
                        >
                          What makes {profileContext.name} unique?
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
                {displayMessages.map((msg, idx) => {
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
                    onClick={() => {
                      if (input.trim() && !isLoading) {
                        sendMessage(input);
                      }
                    }}
                    className="ai-chat-clickable"
                  />
                }
              />
            </div>
          </div>
        </div>
      ) : (
        <Sider
          className="matches-right"
          width={600}
          theme="light"
        >
          <div className="ai-assistant-wrapper">
            {/* AI Assistant title - outside scrolling area */}
            <Title level={5} className="ai-assistant-title">AI Assistant</Title>
            
            <div className="ai-middle">
              {/* Chat messages area - scrollable (includes info, suggestions, and messages) */}
              <div className="ai-chat-messages">
                <div className="ai-top">
                  <div className="ai-assistant-info">
                    <RobotOutlined className="ai-icon" />
                    <div>
                      <Text strong>
                        {isProfileChat && profileContext 
                          ? `Ask me about ${profileContext.name}`
                          : 'Curious about your matches?'
                        }
                      </Text>
                      <Paragraph type="secondary" className="ai-chat-summary">
                        {isProfileChat && profileContext
                          ? `I have access to ${profileContext.name}'s CV information. Ask me anything about their skills, experience, or background.`
                          : 'Feel free to ask me for more details about any profile in the current list.'
                        }
                      </Paragraph>
                    </div>
                  </div>

                  <div className="ai-suggestions">
                    {isProfileChat && profileContext ? (
                      // Suggestions for profile chat context
                      <>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`What are ${profileContext.name}'s strongest skills?`)}
                        >
                          What are {profileContext.name}'s strongest skills?
                          <RightOutlined />
                        </Button>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`Tell me about ${profileContext.name}'s experience`)}
                        >
                          Tell me about {profileContext.name}'s experience
                          <RightOutlined />
                        </Button>
                        <Button
                          className="ai-suggestion-tile"
                          block
                          onClick={() => handleSuggestionClick(`What makes ${profileContext.name} unique?`)}
                        >
                          What makes {profileContext.name} unique?
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
                {displayMessages.map((msg, idx) => {
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
                    onClick={() => {
                      if (input.trim() && !isLoading) {
                        sendMessage(input);
                      }
                    }}
                    className="ai-chat-clickable"
                  />
                }
              />
            </div>
          </div>
        </Sider>
      )}
    </>
  );
};

// Wrap the entire component in memo to prevent unnecessary re-renders
export default memo(AiSideChat);
