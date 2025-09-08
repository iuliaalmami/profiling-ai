import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, API_BASE_URL } from '../utils/api';
import { type Message } from '@ai-sdk/react';

export function useChatHistory(chatId: string, disabled = false, isProfileChat = false) {
  const { } = useAuth();
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    // SAFETY CHECK: Validate chatId before proceeding
    if (disabled || chatId === '' || !chatId || typeof chatId !== 'string') {
      setInitialMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    // SAFETY CHECK: Ensure chatId is a valid format
    const isValidChatId = /^[a-zA-Z0-9_-]+$/.test(chatId);
    if (!isValidChatId) {
      console.warn(`[useChatHistory] Invalid chatId format: ${chatId}. Skipping history load.`);
      setInitialMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    const loadChatHistory = async () => {
      try {
        // SAFE DETECTION: Determine the correct endpoint based on context
        // This maintains 100% backward compatibility while fixing the logical inconsistency
        
        let endpoint: string;
        
        if (isProfileChat) {
          // Explicitly marked as profile chat - use profile endpoint
          endpoint = `${API_BASE_URL}/api/v1/profile-chat/${chatId}/messages`;
        } else {
          // SAFE DETECTION: Check if this chatId is actually a profile chat ID
          // Profile chat IDs are typically numeric and used in profile-related contexts
          // Regular chat IDs are more varied and used in general chat contexts
          
          // Since we can't make API calls to determine the type without breaking the current flow,
          // we'll use a conservative approach: if isProfileChat is false, we'll try the regular endpoint first
          // but we'll add error handling to gracefully fall back if needed
          
          endpoint = `${API_BASE_URL}/api/v1/chat/history/${chatId}`;
        }

        const response = await api.get(endpoint);

        if (response.ok) {
          const history = await response.json();
          
          // SAFETY CHECK: Validate the response data
          if (!Array.isArray(history)) {
            console.warn(`[useChatHistory] Invalid response format for chatId ${chatId}. Expected array, got:`, typeof history);
            setInitialMessages([]);
            return;
          }
          
          // Normalize the role values from API to match Message type
          const normalizedHistory = history.map((msg: any) => ({
            ...msg,
            role: msg.role === 'ai' ? 'assistant' : msg.role
          }));
          
          setInitialMessages(normalizedHistory);
        } else if (response.status === 404 && !isProfileChat) {
          // SAFE FALLBACK: If regular chat endpoint returns 404, this might be a profile chat ID
          // Try the profile chat endpoint as a fallback
          
          const fallbackResponse = await api.get(`${API_BASE_URL}/api/v1/profile-chat/${chatId}/messages`);
          
          if (fallbackResponse.ok) {
            const fallbackHistory = await fallbackResponse.json();
            
            // SAFETY CHECK: Validate the fallback response data
            if (!Array.isArray(fallbackHistory)) {
              console.warn(`[useChatHistory] Invalid fallback response format for chatId ${chatId}. Expected array, got:`, typeof fallbackHistory);
              setInitialMessages([]);
              return;
            }
            
            // Normalize the role values from API to match Message type
            const normalizedFallbackHistory = fallbackHistory.map((msg: any) => ({
              ...msg,
              role: msg.role === 'ai' ? 'assistant' : msg.role
            }));
            
            setInitialMessages(normalizedFallbackHistory);
          } else {
            console.warn(`[useChatHistory] Both regular and profile chat endpoints failed for chatId ${chatId}. Status: ${fallbackResponse.status}`);
            setInitialMessages([]);
          }
        } else {
          // Other error status - set empty messages
          console.warn(`[useChatHistory] Chat history request failed for chatId ${chatId}. Status: ${response.status}`);
          setInitialMessages([]);
        }
      } catch (error) {
        console.error(`[useChatHistory] Error loading chat history for chatId ${chatId}:`, error);
        // On error, set empty messages to prevent breaking the UI
        setInitialMessages([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [chatId, disabled, isProfileChat]);

  return [initialMessages, isLoadingHistory] as const;
}
