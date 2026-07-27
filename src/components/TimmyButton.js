'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Shield, MessageCircle, X, BookHeart } from 'lucide-react';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import useDraggable from '../hooks/useDraggable';
import useTimmy from '../hooks/useTimmy';
import useDiary from '../hooks/useDiary';
import TimmyChat from './TimmyChat';
import GlobalSafeMode from './GlobalSafeMode';
import DiaryTab from './DiaryTab';

const t = {
  ko: {
    aiChat: 'AI 채팅',
    safeMode: 'Safe Mode',
    diary: '여행 다이어리',
  },
  en: {
    aiChat: 'AI Chat',
    safeMode: 'Safe Mode',
    diary: 'Travel Diary',
  },
};

/**
 * TimmyButton — Unified floating button for AI Chat + Safe Mode
 * Option B: Tap opens a mini menu to choose between AI Chat or Safe Mode.
 * Drag to reposition. During Safe Mode active, button transforms to shield icon.
 */
export default function TimmyButton() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('ko');
  const [showMenu, setShowMenu] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [safeModeOpen, setSafeModeOpen] = useState(false);
  const [safeModeActive, setSafeModeActive] = useState(false);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const menuTimeoutRef = useRef(null);

  const { pos, isDragging, hasMoved, handlers } = useDraggable({ threshold: 5 });
  const lang = t[language] || t.ko;

  // 40-minute speech bubble interval
  useEffect(() => {
    // 40 minutes = 40 * 60 * 1000 ms
    const intervalTime = 40 * 60 * 1000;
    const interval = setInterval(() => {
      setShowSpeechBubble(true);
      // Hide after 5 seconds
      setTimeout(() => setShowSpeechBubble(false), 5000);
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);


  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Language listener
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('language') || 'ko';
    setLanguage(saved === 'en' ? 'en' : 'ko');

    const handler = () => {
      const updated = localStorage.getItem('language') || 'ko';
      setLanguage(updated === 'en' ? 'en' : 'ko');
    };
    window.addEventListener('languageChanged', handler);
    return () => window.removeEventListener('languageChanged', handler);
  }, []);

  // Listen for Safe Mode active state changes from GlobalSafeMode
  useEffect(() => {
    const handler = (e) => setSafeModeActive(e.detail?.active || false);
    window.addEventListener('safeModeStateChange', handler);
    return () => window.removeEventListener('safeModeStateChange', handler);
  }, []);

  // Timmy chat hook
  const {
    messages, isLoading, memories, todayUsage,
    chatSessions, currentSessionId,
    sendMessage, deleteMemory,
    createNewSession, switchSession, deleteSession
  } = useTimmy({ userId: user?.uid, language });

  // Diary hook
  const {
    diaries, isGenerating: isDiaryGenerating,
    generateDiary, saveDiary, deleteDiary
  } = useDiary(user?.uid);

  // Auto-dismiss menu after 3 seconds
  useEffect(() => {
    if (showMenu) {
      menuTimeoutRef.current = setTimeout(() => setShowMenu(false), 3000);
      return () => clearTimeout(menuTimeoutRef.current);
    }
  }, [showMenu]);

  // Handle button tap (not drag)
  const handleButtonClick = useCallback((e) => {
    if (hasMoved.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // If Safe Mode is active, directly open Safe Mode panel
    if (safeModeActive) {
      setSafeModeOpen(true);
      return;
    }

    // Toggle menu
    setShowMenu(prev => !prev);
  }, [safeModeActive, hasMoved]);

  const handleOpenChat = useCallback(() => {
    setShowMenu(false);
    setChatOpen(true);
  }, []);

  const handleOpenDiary = useCallback(() => {
    setShowMenu(false);
    setDiaryOpen(true);
  }, []);

  const handleOpenSafeMode = useCallback(() => {
    setShowMenu(false);
    setSafeModeOpen(true);
  }, []);

  const handleCloseSafeMode = useCallback(() => {
    setSafeModeOpen(false);
  }, []);

  // Don't render if not logged in
  if (!user) return null;

  return (
    <>
      {/* Floating Button */}
      <div
        className="fixed bottom-[105px] left-1/2 z-[998] pointer-events-auto flex flex-col items-center gap-2 transition-transform duration-100 select-none"
        style={{
          transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
        {...handlers}
      >
        {/* Mini Menu (Option B) */}
        <AnimatePresence>
          {showMenu && !safeModeActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="flex gap-2 mb-2"
            >
              {/* AI Chat Option */}
              <button
                onClick={handleOpenChat}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#1A1A24]/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 hover:bg-[#252535] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <MessageCircle size={12} className="text-white" />
                </div>
                <span className="text-white text-[13px] font-medium whitespace-nowrap">{lang.aiChat}</span>
              </button>

              {/* Diary Option */}
              <button
                onClick={handleOpenDiary}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#1A1A24]/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 hover:bg-[#252535] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                  <BookHeart size={12} className="text-white" />
                </div>
                <span className="text-white text-[13px] font-medium whitespace-nowrap">{lang.diary}</span>
              </button>

              {/* Safe Mode Option */}
              <button
                onClick={handleOpenSafeMode}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#1A1A24]/95 backdrop-blur-xl border border-white/10 shadow-xl shadow-black/30 hover:bg-[#252535] transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Shield size={12} className="text-white" />
                </div>
                <span className="text-white text-[13px] font-medium whitespace-nowrap">{lang.safeMode}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Periodic Tooltip */}
        <AnimatePresence>
          {showSpeechBubble && !showMenu && !safeModeActive && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.8 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-slate-800 text-[13px] font-bold px-3.5 py-1.5 rounded-2xl shadow-xl border border-slate-100 whitespace-nowrap z-[100]"
            >
              Timmy가 도와 줄게요.
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-100 transform rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Button */}
        <motion.div
          onClick={handleButtonClick}
          whileTap={isDragging ? {} : { scale: 0.92 }}
          className="relative"
        >
          {/* Glow ring */}
          <div className={`absolute inset-0 rounded-full ${
            safeModeActive
              ? 'bg-red-500/20 animate-ping'
              : 'bg-indigo-500/15'
          }`} style={{ margin: '-4px' }} />

          {/* Button body */}
          <div className={`relative w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
            safeModeActive
              ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-red-500/40'
              : showMenu
                ? 'bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/40 scale-110'
                : 'bg-gradient-to-br from-indigo-500 to-purple-700 shadow-indigo-500/30'
          }`}>
            <AnimatePresence mode="wait">
              {safeModeActive ? (
                <motion.div
                  key="shield"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Shield size={26} className="text-white" fill="rgba(255,255,255,0.2)" />
                </motion.div>
              ) : showMenu ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <X size={24} className="text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="tcoach"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <img src="/TT_C.png" alt="T Coach" className="w-8 h-8 object-contain brightness-0 invert" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Safe Mode active label */}
          {safeModeActive && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap"
            >
              <span className="text-[10px] text-red-400 font-medium bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                🛡️ Active
              </span>
            </motion.div>
          )}
        </motion.div>
      </div>

      <TimmyChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        onOpenSafeMode={() => {
          setChatOpen(false);
          setTimeout(() => setSafeModeOpen(true), 200);
        }}
        language={language}
        messages={messages}
        isLoading={isLoading}
        memories={memories}
        todayUsage={todayUsage}
        chatSessions={chatSessions}
        currentSessionId={currentSessionId}
        onSendMessage={sendMessage}
        onDeleteMemory={deleteMemory}
        onCreateNewSession={createNewSession}
        onSwitchSession={switchSession}
        onDeleteSession={deleteSession}
      />

      {/* GlobalSafeMode — hidden button, externally controlled */}
      <GlobalSafeMode
        hideButton={true}
        externalOpen={safeModeOpen}
        onExternalClose={handleCloseSafeMode}
        onActiveChange={(active) => setSafeModeActive(active)}
      />

      {/* Diary Modal Overlay */}
      <AnimatePresence>
        {diaryOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[1000] bg-slate-50 flex flex-col"
          >
            <div className="flex-none p-4 flex justify-end bg-white border-b border-slate-100">
              <button onClick={() => setDiaryOpen(false)} className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <DiaryTab
                diaries={diaries}
                isGenerating={isDiaryGenerating}
                onGenerate={generateDiary}
                onSave={saveDiary}
                onDelete={deleteDiary}
                language={language}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
