import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE_URL } from '../utils/api';
import { type Message } from '@ai-sdk/react';

export function useChatHistory(chatId: string, disabled = false) {
  const { } = useAuth();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (disabled || chatId === '') {
      setInitialMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    const loadChatHistory = async () => {
      try {
        const response = await api.get(`${API_BASE_URL}/api/v1/chat/history/${chatId}`);

        if (response.ok) {
          const history = await response.json();
          
          // Normalize the role values from API to match Message type
          const normalizedHistory = history.map((msg: any) => ({
            ...msg,
            role: msg.role === 'ai' ? 'assistant' : msg.role
          }));
          
          setInitialMessages(normalizedHistory);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [chatId, disabled]);

  return [initialMessages, isLoadingHistory] as const;
}
