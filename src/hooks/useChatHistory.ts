import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE_URL } from '../utils/api';
import { type Message } from '@ai-sdk/react';

export function useChatHistory(chatId: string, disabled = false, isProfileChat = false) {
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
        // Use different endpoint based on chat type
        const endpoint = isProfileChat 
          ? `${API_BASE_URL}/api/v1/profile-chat/${chatId}/messages`
          : `${API_BASE_URL}/api/v1/chat/history/${chatId}`;

        const response = await api.get(endpoint);

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
  }, [chatId, disabled, isProfileChat]);

  return [initialMessages, isLoadingHistory] as const;
}
