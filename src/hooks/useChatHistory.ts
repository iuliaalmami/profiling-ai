import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useChatHistory(chatId: string, disabled = false) {
  const { token } = useAuth();
  const [initialMessages, setInitialMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (disabled || chatId === '') {
      setInitialMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    const loadChatHistory = async () => {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };
        const response = await fetch(`http://127.0.0.1:8000/api/v1/chat/history/${chatId}`, {
          headers,
        });

        if (response.ok) {
          const history = await response.json();
          setInitialMessages(history);
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
