import { useState, useEffect, useRef } from 'react';
import { Input, Button, Spin, type InputRef } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, RightOutlined } from '@ant-design/icons';
import { useChat, type Message } from '@ai-sdk/react';
import './AiChat.scss';
import { Markdown } from '../Markdown/Markdown';
import { useNavigate } from 'react-router-dom';
import { useChatHistory } from '../../hooks/useChatHistory';
import { useAuth } from '../../contexts/AuthContext';

const suggestions = [
  'Find 2 Data Engineers with availability from May 1',
  'Find 4 QA Engineers with >85% skill score available next month',
  'Find 1 DevOps Engineer with AWS skills available within 2 weeks',
  'Find 2 Project Managers with Agile certification starting May 15',
];

interface AIChatProps {
  chatId?: string;
}

const AIChat = ({ chatId: initialChatId = '' }: AIChatProps) => {
  const { token } = useAuth();
  const inputRef = useRef<InputRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const isChatFromUrl = !!initialChatId;
  const [chatId, setChatId] = useState<string | null>(() => {
    return isChatFromUrl ? initialChatId : sessionStorage.getItem('chatId');
  });
  const [isStartingFresh, setIsStartingFresh] = useState(!isChatFromUrl);

  // Match processing states
  const [isProcessingMatch, setIsProcessingMatch] = useState(false);
  const [matchProcessingStarted, setMatchProcessingStarted] = useState(false);
  const [matchCompleted, setMatchCompleted] = useState(false);

  const [initialMessages] = useChatHistory(chatId ?? '', isStartingFresh);

  const { messages, input, handleInputChange, handleSubmit, setMessages, setInput } = useChat({
    id: chatId ?? undefined,
    api: 'http://127.0.0.1:8000/api/v1/smart-chat/stream',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    initialMessages: initialMessages as Message[],
    onResponse: async response => {
      const newChatId = response.headers.get('x-chat-id');
      if (newChatId && !chatId) {
        setChatId(newChatId);
        sessionStorage.setItem('chatId', newChatId);
        // Update URL to reflect the new chat ID
        navigate(`/chat/${newChatId}`, { replace: true });
      }
    },
    experimental_prepareRequestBody({ messages }) {
      const lastMessage = messages[messages.length - 1];
      const body: any = { message: lastMessage?.content ?? '' };

      const storedChatId = sessionStorage.getItem('chatId');
      if (storedChatId && /^\d+$/.test(storedChatId)) {
        body.id = parseInt(storedChatId, 10);
      } else {
        body.id = '';
      }

      return body;
    },
  });

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus({ cursor: 'start' });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages]);

  // Monitor messages for "Tool params:" to detect match processing
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && !matchProcessingStarted) {
      const content = lastMessage.content;

      // Check for either pattern that indicates match processing started
      const hasToolParams = content.includes('Tool params:');
      const hasRunMatch = content.includes('run_match');
      const hasMatchProcess = content.includes('match process has started');

      if ((hasToolParams && hasRunMatch) || hasMatchProcess) {
        setMatchProcessingStarted(true);
        setIsProcessingMatch(true);
        // Start polling for match status
        if (chatId) {
          pollMatchStatus(chatId);
        }
      }
    }
  }, [messages, chatId, matchProcessingStarted]);

  // Polling function for match status
  const pollMatchStatus = async (currentChatId: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/match/status/${currentChatId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.status === 'completed') {
        setIsProcessingMatch(false);
        setMatchCompleted(true);
        // Match completed - no need to store prompt since we navigate with chatId
      } else if (data.status === 'error' || data.status === 'failed') {
        setIsProcessingMatch(false);
        setMatchProcessingStarted(false);
        setMatchCompleted(false);
        console.error('Match processing failed:', data);
      } else {
        // Still processing, poll again after delay
        setTimeout(() => pollMatchStatus(currentChatId), 5000);
      }
    } catch (error) {
      console.error('Error polling match status:', error);
      // Retry after longer delay
      setTimeout(() => pollMatchStatus(currentChatId), 5000);
    }
  };

  const extractTextParts = (content: string): { response?: string; prompt?: string } => {
    try {
      const parsed = JSON.parse(content);
      return {
        response: parsed.response ?? '',
        prompt: parsed.prompt ?? '',
      };
    } catch {
      return { response: content };
    }
  };

  const sendMessageSafely = async (text: string) => {
    setInput(text);
    setTimeout(() => {
      void handleSubmit(new Event('submit'), { data: { content: text } });
    }, 10);
  };

  const startNewChatWithMessage = async (text: string) => {
    sessionStorage.removeItem('chatId');
    setChatId(null);
    setIsStartingFresh(true);
    setMessages([]);
    await sendMessageSafely(text);
  };

  const handleSuggestionClick = async (text: string) => {
    await startNewChatWithMessage(text);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!chatId) {
      await startNewChatWithMessage(input);
    } else {
      await sendMessageSafely(input);
    }
  };

  const handleSearchMatches = () => {
    if (chatId) {
      navigate(`/matches/${chatId}`);
    } else {
      console.error('No chat ID available for matches navigation');
    }
  };

  const handleShowMatches = () => {
    if (chatId) {
      navigate(`/matches/${chatId}`);
    } else {
      console.error('No chat ID available for matches navigation');
    }
    // Reset states after navigation
    setMatchCompleted(false);
    setMatchProcessingStarted(false);
  };

  return (
    <div className="ai-chat-container">
      <div className="chat-header-wrapper">
        <div className="chat-header">
          <h3>AI Assistant</h3>
        </div>
      </div>

      <div className="chat-content">
        {messages.length === 0 && (
          <>
            <div className="chat-heading">
              <h2>
                Search for your perfect <br />
                Technical Profile
              </h2>
              <p>
                To discover the perfect profiles for your needs, simply enter your job description
                in the box below.
              </p>
              <p>Need inspiration? Here are a few examples to get you started:</p>
            </div>

            <div className="chat-suggestions">
              {suggestions.map((text, idx) => (
                <div className="chat-suggestion-wrapper" key={idx}>
                  <Button
                    onClick={() => {
                      void handleSuggestionClick(text);
                    }}
                  >
                    {text}
                  </Button>
                  <RightOutlined className="chat-icon" />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="chat-messages">
          {messages.map((msg, idx) => {
            const { response, prompt } =
              msg.role === 'assistant' ? extractTextParts(msg.content) : {};

            const bubbleClass = `chat-bubble ${msg.role}${msg.role === 'assistant' && prompt ? ' assistant-final-prompt' : ''}`;

            return (
              <div key={idx} className={bubbleClass}>
                {msg.role === 'assistant' ? (
                  <>
                    <div className="assistant-message-content">
                      <RobotOutlined className="chat-icon" />
                      {response && <Markdown>{response}</Markdown>}
                    </div>

                    {prompt && (
                      <div className="search-matches-wrapper">
                        <p>
                          If you’d like to add more details, feel free to do so now.
                          <br />
                          Otherwise, click “Search Matches” to begin.
                          <br />
                          <em>
                            Note: Once the search starts, the job description can no longer be
                            edited.
                          </em>
                        </p>
                        <Button type="primary" size="middle" onClick={handleSearchMatches}>
                          Search matches
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span>{msg.content}</span>
                    <UserOutlined className="chat-icon" />
                  </>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Match processing loading UI */}
        {isProcessingMatch && (
          <div className="match-processing-loader">
            <div className="loader-content">
              <Spin size="large" />
              <div className="loader-text">
                <h4>Processing your search...</h4>
                <p>
                  We're finding the best matches for your job requirements. This may take a few
                  moments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Match completed UI */}
        {matchCompleted && (
          <div className="match-completed-loader">
            <div className="loader-content">
              <div className="success-icon">✅</div>
              <div className="loader-text">
                <h4>Matches found!</h4>
                <p>
                  Your search has been completed successfully. Click below to view the matching
                  candidates.
                </p>
              </div>
              <Button
                type="primary"
                size="large"
                onClick={handleShowMatches}
                style={{ marginTop: '16px' }}
              >
                Show Matches
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="chat-input">
          <Input
            ref={inputRef}
            placeholder={isProcessingMatch ? 'Processing matches...' : 'Type your message here'}
            value={input}
            onChange={handleInputChange}
            disabled={isProcessingMatch}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            htmlType="submit"
            disabled={isProcessingMatch}
          >
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
