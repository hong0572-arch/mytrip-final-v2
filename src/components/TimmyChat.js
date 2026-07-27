'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Settings, Trash2, ChevronDown, Plane, Utensils, Camera, Shield, Luggage, Sparkles, BrainCircuit, MessageSquarePlus, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const t = {
  ko: {
    title: '티미 AI',
    subtitle: '여행의 모든 것을 도와드립니다',
    placeholder: '메시지를 입력하세요...',
    greeting: '안녕하세요! 여행에 대해 무엇이든 물어보세요. 일정 계획, 맛집 추천, 현지 정보, 안전 가이드까지 도와드립니다.',
    quickActions: {
      itinerary: '일정 만들기',
      restaurant: '맛집 추천',
      translate: '번역',
      packing: '짐 싸기',
      safety: 'Safe Mode',
    },
    memoryTitle: 'AI 메모리',
    memoryDesc: '티미가 기억하고 있는 정보',
    memoryEmpty: '아직 기억한 정보가 없습니다',
    deleteMemory: '삭제',
    clearChat: '대화 초기화',
    dailyUsage: '오늘 사용',
    close: '닫기',
    thinking: '생각 중...',
    comingSoon: '곧 출시됩니다!',
  },
  en: {
    title: 'Timmy AI',
    subtitle: 'Your complete travel assistant',
    placeholder: 'Type a message...',
    greeting: 'Hello! Ask me anything about travel. I can help with itinerary planning, restaurant recommendations, local tips, and safety guidance.',
    quickActions: {
      itinerary: 'Plan Trip',
      restaurant: 'Restaurants',
      translate: 'Translate',
      packing: 'Packing',
      safety: 'Safe Mode',
    },
    memoryTitle: 'AI Memory',
    memoryDesc: 'Information Timmy remembers about you',
    memoryEmpty: 'No memories saved yet',
    deleteMemory: 'Delete',
    clearChat: 'Clear Chat',
    dailyUsage: 'Today',
    close: 'Close',
    thinking: 'Thinking...',
    comingSoon: 'Coming soon!',
  },
};

// Quick action definitions
const QUICK_ACTIONS = [
  { key: 'itinerary', icon: Plane, color: '#4F8EF7', prompt: { ko: '여행 일정을 만들고 싶어요. 도와주세요!', en: 'I want to create a travel itinerary. Help me!' } },
  { key: 'restaurant', icon: Utensils, color: '#FF6B6B', prompt: { ko: '근처 맛집을 추천해주세요!', en: 'Recommend nearby restaurants!' } },
  { key: 'translate', icon: Camera, color: '#7C5CFC', isTranslate: true },
  { key: 'packing', icon: Luggage, color: '#2ECC71', prompt: { ko: '여행 짐 싸기를 도와주세요!', en: 'Help me pack for my trip!' } },
  { key: 'safety', icon: Shield, color: '#FF9500', isSafeMode: true },
];

export default function TimmyChat({
  isOpen,
  onClose,
  onOpenSafeMode,
  language = 'ko',
  messages = [],
  isLoading = false,
  memories = [],
  todayUsage = 0,
  chatSessions = [],
  currentSessionId = null,
  onSendMessage,
  onDeleteMemory,
  onCreateNewSession,
  onSwitchSession,
  onDeleteSession,
}) {
  const [input, setInput] = useState('');
  const [showMemory, setShowMemory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sheetHeight, setSheetHeight] = useState('half'); // 'half' | 'full'
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);
  const lang = t[language] || t.ko;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'en' ? 'en-US' : 'ko-KR';

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput(prev => prev + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, [language]);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    onSendMessage?.(input.trim());
    setInput('');
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleImageUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result;
      const initialText = language === 'ko' ? "이 이미지의 텍스트를 번역해줘." : "Translate the text in this image.";
      onSendMessage?.(initialText, base64Str);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  }, [language, onSendMessage]);

  const handleQuickAction = useCallback((action) => {
    if (action.isSafeMode) {
      onClose?.();
      setTimeout(() => onOpenSafeMode?.(), 200);
      return;
    }
    if (action.isTranslate) {
      fileInputRef.current?.click();
      return;
    }
    if (action.prompt) {
      onSendMessage?.(action.prompt[language] || action.prompt.ko);
    }
  }, [language, onSendMessage, onClose, onOpenSafeMode]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Chat Panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`relative z-10 w-full max-w-[480px] bg-[#0F0F14]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] shadow-2xl flex flex-col ${
            sheetHeight === 'full' ? 'h-[95vh]' : 'h-[65vh]'
          } transition-all duration-300`}
        >
          {/* Drag Handle */}
          <div
            className="flex justify-center pt-3 pb-1 cursor-grab"
            onClick={() => setSheetHeight(h => h === 'full' ? 'half' : 'full')}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-semibold text-[15px] leading-tight">{lang.title}</h2>
                <p className="text-white/40 text-[11px]">{lang.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-white/30 text-[10px] mr-2">{lang.dailyUsage} {todayUsage}/30</span>
              <button
                onClick={() => {
                  setShowHistory(false);
                  onCreateNewSession?.();
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                title="새 대화"
              >
                <MessageSquarePlus size={16} className="text-white/50" />
              </button>
              <button
                onClick={() => {
                  setShowMemory(false);
                  setShowHistory(!showHistory);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                title="과거 대화"
              >
                <History size={16} className="text-white/50" />
              </button>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setShowMemory(!showMemory);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                title={lang.memoryTitle}
              >
                <BrainCircuit size={16} className="text-white/50" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-white/50" />
              </button>
            </div>
          </div>

          {/* History Panel (Overlay) */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-[72px] left-0 right-0 z-20 mx-4 bg-[#1A1A24] border border-white/10 rounded-2xl p-4 shadow-xl max-h-[300px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-white/80 text-sm font-medium">🕒 과거 대화 목록</h3>
                  <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white/60">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-6 text-white/30 text-xs">
                      저장된 과거 대화가 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {chatSessions.map((session) => (
                        <div 
                          key={session.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${currentSessionId === session.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/5 hover:bg-white/10'} transition-colors cursor-pointer group`}
                          onClick={() => {
                            onSwitchSession?.(session.id);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="text-white/80 text-[13px] font-medium truncate">{session.title}</h4>
                            <p className="text-white/40 text-[11px] mt-0.5">
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession?.(session.id);
                            }}
                            className="text-white/20 hover:text-red-400 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memory Panel (Overlay) */}
          <AnimatePresence>
            {showMemory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-[72px] left-0 right-0 z-20 mx-4 bg-[#1A1A24] border border-white/10 rounded-2xl p-4 shadow-xl max-h-[200px] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white/80 text-sm font-medium">🧠 {lang.memoryTitle}</h3>
                  <button onClick={() => setShowMemory(false)} className="text-white/30 hover:text-white/60">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/30 text-[11px]">{lang.memoryDesc}</p>
                </div>
                {memories.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">{lang.memoryEmpty}</p>
                ) : (
                  <div className="space-y-2">
                    {memories.map(mem => (
                      <div key={mem.id} className="flex items-start justify-between bg-white/5 rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-indigo-400 font-medium uppercase">{mem.category}</span>
                          <p className="text-white/70 text-xs mt-0.5 truncate">{mem.content}</p>
                        </div>
                        <button
                          onClick={() => onDeleteMemory?.(mem.id)}
                          className="ml-2 text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
            {/* Welcome Message (when no messages) */}
            {messages.length === 0 && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div className="bg-white/8 rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%]">
                  <p className="text-white/80 text-[13px] leading-relaxed">{lang.greeting}</p>
                </div>
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-2.5 items-start'}`}>
                {msg.role !== 'user' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles size={13} className="text-white" />
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/80 rounded-tr-md'
                    : msg.isError
                      ? 'bg-red-500/10 border border-red-500/20 rounded-tl-md'
                      : 'bg-white/8 rounded-tl-md'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col gap-2">
                      {msg.imageUrl && (
                        <img 
                          src={msg.imageUrl} 
                          alt="Uploaded by user" 
                          className="max-w-[200px] rounded-lg border border-white/20 object-contain shadow-sm"
                        />
                      )}
                      {msg.content && <p className="text-white text-[13px] leading-relaxed">{msg.content}</p>}
                    </div>
                  ) : (
                    <div className="text-white/80 text-[13px] leading-relaxed prose prose-invert prose-sm max-w-none
                      prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                      prose-headings:text-white/90 prose-headings:font-semibold
                      prose-strong:text-white/90 prose-code:text-indigo-300 prose-code:bg-white/5 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={13} className="text-white animate-pulse" />
                </div>
                <div className="bg-white/8 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-white/40 text-xs">{lang.thinking}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions (shown when no messages) */}
          {messages.length === 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => handleQuickAction(action)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <action.icon size={13} style={{ color: action.color }} />
                    <span className="text-white/70 text-[12px]">{lang.quickActions[action.key]}</span>
                    {action.isComingSoon && (
                      <span className="text-[9px] text-yellow-400/60 ml-0.5">soon</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hidden File Input for Camera/Image Upload */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImageUpload} 
          />

          {/* Input Bar */}
          <div className="px-4 pb-4 pt-2 border-t border-white/8">
            <div className="flex items-center gap-2 bg-white/8 rounded-2xl px-3 py-1.5">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang.placeholder}
                className="flex-1 bg-transparent text-white text-[14px] placeholder-white/30 outline-none py-1.5"
                disabled={isLoading}
              />
              <button
                onClick={toggleVoice}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  isListening ? 'bg-red-500/20 text-red-400' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'text-white/20'
                }`}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
