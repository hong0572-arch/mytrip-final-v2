import { useState, useCallback, useEffect } from 'react';

export default function useDiary(userId) {
  const [diaries, setDiaries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load diaries on mount
  useEffect(() => {
    if (userId) {
      loadDiaries();
    }
  }, [userId]);

  const loadDiaries = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/diary?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setDiaries(data.diaries || []);
      }
    } catch (e) {
      console.error('Failed to load diaries:', e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const generateDiary = useCallback(async ({ keyword, imageBase64, mimeType, location, date }) => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, imageBase64, mimeType, location, date })
      });
      if (res.ok) {
        const data = await res.json();
        return data.diary; // { title, content }
      }
      throw new Error('Generation failed');
    } catch (e) {
      console.error('Failed to generate diary:', e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const saveDiary = useCallback(async (diaryData) => {
    if (!userId) return false;
    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...diaryData })
      });
      if (res.ok) {
        await loadDiaries();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to save diary:', e);
      return false;
    }
  }, [userId, loadDiaries]);

  const deleteDiary = useCallback(async (diaryId) => {
    if (!userId || !diaryId) return;
    try {
      const res = await fetch(`/api/diary?userId=${userId}&diaryId=${diaryId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setDiaries(prev => prev.filter(d => d.id !== diaryId));
      }
    } catch (e) {
      console.error('Failed to delete diary:', e);
    }
  }, [userId]);

  return {
    diaries,
    isLoading,
    isGenerating,
    loadDiaries,
    generateDiary,
    saveDiary,
    deleteDiary
  };
}
