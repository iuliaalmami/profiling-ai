import { useState, useCallback, useEffect } from 'react';
import type { Message } from '@ai-sdk/react';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '../contexts/AuthContext';
import { handleTokenExpiration, API_BASE_URL } from '../utils/api';

interface UseProfileChatReturn {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  append: (message: Message) => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useProfileChat = (chatId: string, initialMessagesFromProps: Message[] = []): UseProfileChatReturn => {
  const { token } = useAuth();
  const [initialMessages, setInitialMessages] = useState<Message[]>(initialMessagesFromProps);
  const [sessionKey, setSessionKey] = useState<string>(`${chatId}-${Date.now()}`);

  // Load chat history when chatId changes
  useEffect(() => {
    if (!chatId || !token) return;

    // Generate new session key to force useChat to start fresh
    setSessionKey(`${chatId}-${Date.now()}`);
    

    const loadChatHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/profile-chat/${chatId}/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const history = await response.json();
          
          // Normalize the role values from API to match Message type
          const normalizedHistory = history.map((msg: any) => ({
            id: msg.id.toString(),
            role: msg.role === 'ai' ? 'assistant' : msg.role,
            content: msg.content
          }));
          
          setInitialMessages(normalizedHistory);
        }
      } catch (error) {
        console.error('Error loading profile chat history:', error);
      }
    };

    loadChatHistory();
  }, [chatId, token]);

  // Use the useChat hook for proper streaming
  const chatHook = useChat({
    id: `profile-chat-${sessionKey}`, // Use sessionKey to force new session
    api: `${API_BASE_URL}/api/v1/profile-chat/${chatId}/chat/stream`,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    initialMessages: initialMessages,
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

  const { messages, input, handleInputChange, handleSubmit, isLoading, append } = chatHook;

  // Create a sendMessage function that works with the useChat hook
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatId) return;

    if (!token) {
      console.error('No token found');
      return;
    }

    // Use the append function from useChat which handles streaming automatically
    append({ id: Date.now().toString(), role: 'user', content });
  }, [chatId, token, append]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    append,
    sendMessage
  };
};
