'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for Timmy AI chat state management.
 * Handles message history, API communication, memory extraction, and usage tracking.
 */
export default function useTimmy({ userId, language = 'ko' }) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [memories, setMemories] = useState([]);
  const [todayUsage, setTodayUsage] = useState(0);
  
  // Chat Session states
  const [chatSessions, setChatSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSessionsLoading, setIsSessionsLoading] = useState(false);

  const abortRef = useRef(null);

  // Load memories & sessions on mount
  useEffect(() => {
    if (!userId) return;
    loadMemories();
    loadUsage();
    loadSessions();
  }, [userId]);

  const loadSessions = useCallback(async () => {
    if (!userId) return;
    setIsSessionsLoading(true);
    try {
      const res = await fetch(`/api/chat/session?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Failed to load chat sessions:', e);
    } finally {
      setIsSessionsLoading(false);
    }
  }, [userId]);

  const createNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSessionId(null);
  }, []);

  const switchSession = useCallback((sessionId) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setMessages(session.messages || []);
      setCurrentSessionId(sessionId);
    }
  }, [chatSessions]);

  const deleteSession = useCallback(async (sessionId) => {
    if (!userId) return;
    try {
      await fetch(`/api/chat/session?userId=${userId}&sessionId=${sessionId}`, { method: 'DELETE' });
      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        createNewSession();
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  }, [userId, currentSessionId, createNewSession]);

  const syncSessionWithServer = async (newMessages) => {
    if (!userId) return;
    
    // Auto-generate title for new sessions if there are messages
    let title = '새로운 대화';
    if (newMessages.length > 0) {
      const firstUserMsg = newMessages.find(m => m.role === 'user');
      if (firstUserMsg && firstUserMsg.content) {
        title = firstUserMsg.content.substring(0, 15) + (firstUserMsg.content.length > 15 ? '...' : '');
      }
    }

    const sessionId = currentSessionId || `session_${Date.now()}`;
    if (!currentSessionId) setCurrentSessionId(sessionId);

    try {
      await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          sessionId,
          title,
          messages: newMessages
        })
      });
      // Optionally reload sessions in background to update the list
      loadSessions();
    } catch (e) {
      console.error('Failed to sync session:', e);
    }
  };

  const loadMemories = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/memory?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (e) {
      console.error('Failed to load memories:', e);
    }
  }, [userId]);

  const loadUsage = useCallback(() => {
    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const stored = localStorage.getItem(`timmy_usage_${todayKey}`);
      setTodayUsage(stored ? parseInt(stored, 10) : 0);
    } catch {
      setTodayUsage(0);
    }
  }, []);

  const incrementUsage = useCallback(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const newCount = todayUsage + 1;
    setTodayUsage(newCount);
    try {
      localStorage.setItem(`timmy_usage_${todayKey}`, String(newCount));
    } catch {}
  }, [todayUsage]);

  const saveMemory = useCallback(async (memoryData) => {
    if (!userId || !memoryData) return;
    try {
      await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...memoryData }),
      });
      // Reload memories
      await loadMemories();
    } catch (e) {
      console.error('Failed to save memory:', e);
    }
  }, [userId, loadMemories]);

  const deleteMemory = useCallback(async (memoryId) => {
    if (!userId || !memoryId) return;
    try {
      await fetch(`/api/memory?userId=${userId}&memoryId=${memoryId}`, {
        method: 'DELETE',
      });
      setMemories(prev => prev.filter(m => m.id !== memoryId));
    } catch (e) {
      console.error('Failed to delete memory:', e);
    }
  }, [userId]);

  const sendMessage = useCallback(async (text, imageUrl = null, currentTrip = null, location = null) => {
    if ((!text.trim() && !imageUrl) || isLoading) return;

    const userMessage = { role: 'user', content: text, imageUrl, timestamp: Date.now() };
    const newMessagesWithUser = [...messages, userMessage];
    
    setMessages(newMessagesWithUser);
    syncSessionWithServer(newMessagesWithUser);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          imageUrl: imageUrl,
          history: messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
          userContext: {
            userId,
            language,
            memories: memories.slice(0, 10),
            currentTrip,
            upcomingTrip: null, // To be implemented with actual user trip data
            location
          }
        }),
      });

      if (!res.ok) throw new Error('Chat API failed');

      const data = await res.json();
      const aiMessage = {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now(),
      };

      setMessages(prev => {
        const newArray = [...prev, aiMessage];
        syncSessionWithServer(newArray);
        return newArray;
      });
      incrementUsage();

      // Auto-save extracted memory
      if (data.memory) {
        await saveMemory(data.memory);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg = language === 'ko'
        ? '죄송합니다, 일시적인 오류가 발생했습니다. 다시 시도해주세요.'
        : 'Sorry, a temporary error occurred. Please try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, userId, language, memories, incrementUsage, saveMemory, currentSessionId]);

  const clearMessages = useCallback(() => {
    createNewSession();
  }, [createNewSession]);

  return {
    messages,
    isLoading,
    memories,
    todayUsage,
    chatSessions,
    currentSessionId,
    isSessionsLoading,
    sendMessage,
    clearMessages,
    saveMemory,
    deleteMemory,
    loadMemories,
    createNewSession,
    switchSession,
    deleteSession
  };
}
