import { useState, useEffect, useRef } from 'react';
import { Input, Button, type InputRef } from 'antd';
import { SendOutlined, UserOutlined, RobotOutlined, RightOutlined } from '@ant-design/icons';
import { useChat } from '@ai-sdk/react';
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

  const [chatId, setChatId] = useState<string | null>(() => {
    return initialChatId || sessionStorage.getItem('chatId') || null;
  });

  useEffect(() => {
    if (chatId) {
      sessionStorage.setItem('chatId', chatId);
    }
  }, [chatId]);

  const [initialMessages, isLoadingHistory] = useChatHistory(chatId ?? '');

  const { messages, input, handleInputChange, handleSubmit, append } = useChat({
    id: chatId ?? undefined,
    api: 'http://127.0.0.1:8000/api/v1/smart-chat/stream',
    initialMessages,
    onResponse: async response => {
      const newChatId = response.headers.get('x-chat-id');
      console.log('Received x-chat-id:', newChatId);
      if (newChatId && !chatId) {
        console.log('Received x-chat-id:', newChatId);
        setChatId(newChatId);
        sessionStorage.setItem('chatId', newChatId);
      }
    },
    experimental_prepareRequestBody({ messages, id }) {
      const lastMessage = messages[messages.length - 1];
      const body: any = { message: lastMessage.content };

      if (id && id !== '' && id !== 'undefined' && id.length >= 8) {
        body.id = id;
      }

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

  const handleSuggestionClick = (text: string) => {
    append({ role: 'user', content: text });
    handleSubmit(new Event('submit'), { data: { content: text } });
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
                <div
                  className="chat-suggestion-wrapper"
                  key={idx}
                  onClick={() => handleSuggestionClick(text)}
                >
                  <Button>{text}</Button>
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

            const bubbleClass = `chat-bubble ${msg.role}${
              msg.role === 'assistant' && prompt ? ' assistant-final-prompt' : ''
            }`;

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
                            {' '}
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

        <form onSubmit={handleSubmit} className="chat-input">
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
