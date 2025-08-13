import { useState, useCallback, useEffect } from 'react';
import type { Message } from '@ai-sdk/react';
import { useAuth } from '../contexts/AuthContext';
import { handleTokenExpiration, API_BASE_URL } from '../utils/api';

interface UseProfileChatReturn {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  append: (message: Message) => void;
  sendMessage: (content: string) => Promise<void>;
}

export const useProfileChat = (chatId: string): UseProfileChatReturn => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load chat history when chatId changes
  useEffect(() => {
    if (!chatId || !token) return;

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
          
          setMessages(normalizedHistory);
        }
      } catch (error) {
        console.error('Error loading profile chat history:', error);
      }
    };

    loadChatHistory();
  }, [chatId, token]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  }, []);

  // Simulated streaming function
  const simulateStreaming = useCallback(async (fullResponse: string, onChunk: (chunk: string) => void) => {
    const words = fullResponse.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const space = i === 0 ? '' : ' ';
      currentText += space + word;
      
      onChunk(currentText);
      
      // Add a small delay to simulate real streaming
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !chatId) return;

    if (!token) {
      console.error('No token found');
      return;
    }

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the streaming assistant message
    const assistantMessageId = (Date.now() + 1).toString();
    const placeholderMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    };
    
    setMessages(prev => [...prev, placeholderMessage]);

    try {
      // Send request to backend
      const response = await fetch(`${API_BASE_URL}/api/v1/profile-chat/${chatId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: content, id: chatId })
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleTokenExpiration();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      const fullResponse = responseData.content || responseData.message || responseData.toString();

      // Simulate streaming by updating the message content gradually
      await simulateStreaming(fullResponse, (chunk) => {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: chunk }
            : msg
        ));
      });

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Update the placeholder message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: 'Sorry, there was an error processing your message. Please try again.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [chatId, token, simulateStreaming]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      await sendMessage(input);
    }
  }, [input, isLoading, sendMessage]);

  const append = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

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
