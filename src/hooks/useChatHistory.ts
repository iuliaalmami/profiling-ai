import { useState, useEffect } from 'react';

export function useChatHistory(chatId: string) {
  const [initialMessages, setInitialMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (chatId === '') {
        setInitialMessages([]);
        setIsLoadingHistory(false);
        return;
      }

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        console.log('Loading chat history for testtttt:', chatId);
        const response = await fetch(`http://127.0.0.1:8000/api/v1/chat/history/${chatId}`, {
          headers,
        });
        console.log('Loading chat history for:', chatId);
        if (response.ok) {
          const history = await response.json();
          console.log('Chat history loaded:', history);
          setInitialMessages(history);
        } else {
          console.warn('Failed to load chat history:', response.status);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [chatId]);

  return [initialMessages, isLoadingHistory] as const;
}
