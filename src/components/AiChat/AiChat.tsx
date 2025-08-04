import { useState, useEffect, useRef } from 'react';
import { Input, Button, type InputRef } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, RightOutlined } from '@ant-design/icons';
import { useChat, type Message } from '@ai-sdk/react';
import './AIChat.scss';
import { Markdown } from '../Markdown/Markdown';
import { useNavigate } from 'react-router-dom';
import { useChatHistory } from '../../hooks/useChatHistory';

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
  const inputRef = useRef<InputRef>(null);
  const navigate = useNavigate();

  const isChatFromUrl = !!initialChatId;
  const [chatId, setChatId] = useState<string | null>(() => {
    return isChatFromUrl ? initialChatId : sessionStorage.getItem('chatId');
  });
  const [isStartingFresh, setIsStartingFresh] = useState(!isChatFromUrl);

  const [initialMessages, isLoadingHistory] = useChatHistory(chatId ?? '', isStartingFresh);

  const { messages, input, handleInputChange, handleSubmit, append, setMessages, setInput } =
    useChat({
      id: chatId ?? undefined,
      api: 'http://127.0.0.1:8000/api/v1/smart-chat/stream',
      initialMessages: initialMessages as Message[],
      onResponse: async response => {
        const newChatId = response.headers.get('x-chat-id');
        if (newChatId && !chatId) {
          setChatId(newChatId);
          sessionStorage.setItem('chatId', newChatId);
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

        console.log('[chat] payload trimis:', body);
        return body;
      },
    });

  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRef.current?.focus({ cursor: 'start' });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages]);

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
    const lastAssistantWithPrompt = [...messages]
      .reverse()
      .find(msg => msg.role === 'assistant' && extractTextParts(msg.content).prompt);

    const prompt = extractTextParts(lastAssistantWithPrompt?.content || '').prompt;
    if (prompt) {
      navigate('/matches', { state: { prompt } });
    }
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
        </div>

        <form onSubmit={handleManualSubmit} className="chat-input">
          <Input
            ref={inputRef}
            placeholder="Type your message here"
            value={input}
            onChange={handleInputChange}
          />
          <Button type="primary" icon={<SendOutlined />} htmlType="submit">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
