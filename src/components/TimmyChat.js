'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Settings, Trash2, ChevronDown, Plane, Utensils, Camera, Shield, Luggage, Sparkles, BrainCircuit, MessageSquarePlus, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TimmyAvatar from './TimmyAvatar';

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
      <div className="fixed inset-0 z-[9999] flex items-end justify-center pointer-events-auto font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-tm-ink/50"
          onClick={onClose}
        />

        {/* Chat Panel — AI 홈의 대화 화면(/chat)과 같은 밝은 디자인 */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`relative z-10 w-full max-w-md bg-tm-ground rounded-t-[24px] shadow-2xl flex flex-col text-tm-ink ${
            sheetHeight === 'full' ? 'h-[95vh]' : 'h-[65vh]'
          } transition-all duration-300`}
        >
          {/* Drag Handle */}
          <button
            type="button"
            aria-label={sheetHeight === 'full' ? '창 줄이기' : '창 키우기'}
            className="flex justify-center pt-3 pb-1 cursor-grab"
            onClick={() => setSheetHeight(h => h === 'full' ? 'half' : 'full')}
          >
            <span className="w-10 h-1 bg-tm-line rounded-full" />
          </button>

          {/* Header */}
          <div className="flex items-center justify-between pl-4 pr-2 pb-2 border-b border-tm-line">
            <div className="flex items-center gap-2.5 min-w-0">
              <TimmyAvatar size={32} />
              <div className="min-w-0">
                <h2 className="font-bold text-[16px] leading-tight">{lang.title}</h2>
                <p className="text-tm-muted text-[11px] truncate">{lang.dailyUsage} {todayUsage}/30</p>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setShowHistory(false);
                  onCreateNewSession?.();
                }}
                className="w-11 h-11 flex items-center justify-center rounded-full text-tm-navy"
                aria-label="새 대화"
              >
                <MessageSquarePlus size={20} strokeWidth={1.8} />
              </button>
              <button
                onClick={() => {
                  setShowMemory(false);
                  setShowHistory(!showHistory);
                }}
                className="w-11 h-11 flex items-center justify-center rounded-full text-tm-navy"
                aria-label="과거 대화"
              >
                <History size={20} strokeWidth={1.8} />
              </button>
              <button
                onClick={() => {
                  setShowHistory(false);
                  setShowMemory(!showMemory);
                }}
                className="w-11 h-11 flex items-center justify-center rounded-full text-tm-navy"
                aria-label={lang.memoryTitle}
              >
                <BrainCircuit size={20} strokeWidth={1.8} />
              </button>
              <button
                onClick={onClose}
                className="w-11 h-11 flex items-center justify-center rounded-full text-tm-muted"
                aria-label="닫기"
              >
                <X size={20} />
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
                className="absolute top-[72px] left-0 right-0 z-20 mx-4 bg-white border border-tm-line rounded-2xl p-4 shadow-xl max-h-[300px] flex flex-col"
              >
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <h3 className="text-[14px] font-bold">과거 대화 목록</h3>
                  <button onClick={() => setShowHistory(false)} aria-label="닫기" className="w-9 h-9 flex items-center justify-center text-tm-muted">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pr-1">
                  {chatSessions.length === 0 ? (
                    <div className="text-center py-6 text-tm-muted text-[13px]">
                      저장된 과거 대화가 없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {chatSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${currentSessionId === session.id ? 'bg-tm-sky-tint border-tm-navy/30' : 'bg-tm-ground border-tm-line'} transition-colors cursor-pointer group`}
                          onClick={() => {
                            onSwitchSession?.(session.id);
                            setShowHistory(false);
                          }}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <h4 className="text-[14px] font-semibold truncate">{session.title}</h4>
                            <p className="text-tm-muted text-[12px] mt-0.5">
                              {new Date(session.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession?.(session.id);
                            }}
                            aria-label="대화 삭제"
                            className="w-9 h-9 flex items-center justify-center text-tm-muted hover:text-tm-sos"
                          >
                            <Trash2 size={16} />
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
                className="absolute top-[72px] left-0 right-0 z-20 mx-4 bg-white border border-tm-line rounded-2xl p-4 shadow-xl max-h-[240px] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-bold">{lang.memoryTitle}</h3>
                  <button onClick={() => setShowMemory(false)} aria-label="닫기" className="w-9 h-9 flex items-center justify-center text-tm-muted">
                    <X size={16} />
                  </button>
                </div>
                <p className="text-tm-muted text-[12px] mb-2">{lang.memoryDesc}</p>
                {memories.length === 0 ? (
                  <p className="text-tm-muted text-[13px] text-center py-3">{lang.memoryEmpty}</p>
                ) : (
                  <div className="space-y-2">
                    {memories.map(mem => (
                      <div key={mem.id} className="flex items-start justify-between bg-tm-ground rounded-xl px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-tm-navy font-semibold uppercase">{mem.category}</span>
                          <p className="text-[13px] mt-0.5 truncate">{mem.content}</p>
                        </div>
                        <button
                          onClick={() => onDeleteMemory?.(mem.id)}
                          aria-label="기억 삭제"
                          className="ml-2 w-9 h-9 flex items-center justify-center text-tm-muted hover:text-tm-sos transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar" aria-live="polite">
            {/* Welcome Message (when no messages) */}
            {messages.length === 0 && (
              <div className="max-w-[88%] rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[15px] leading-normal">
                {lang.greeting}
              </div>
            )}

            {/* Message List */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3.5 py-2.5 text-[15px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'max-w-[80%] rounded-[18px] rounded-br-[4px] bg-tm-ink text-white'
                    : msg.isError
                      ? 'max-w-[92%] rounded-[18px] rounded-bl-[4px] bg-tm-warm-tint text-tm-warm'
                      : 'max-w-[92%] rounded-[18px] rounded-bl-[4px] bg-white'
                }`}>
                  {msg.role === 'user' ? (
                    <div className="flex flex-col gap-2">
                      {msg.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.imageUrl}
                          alt=""
                          className="max-w-[200px] rounded-lg object-contain"
                        />
                      )}
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                  ) : (
                    <div className="[&_a]:text-tm-navy [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5">
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
              <div className="flex items-center gap-2" role="status">
                <div className="flex items-center gap-2.5 rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5">
                  <span aria-hidden="true" className="flex h-3 items-center gap-1">
                    <span className="tm-dot bg-tm-sky" />
                    <span className="tm-dot bg-tm-sky" />
                    <span className="tm-dot bg-tm-sky" />
                  </span>
                  <span className="text-tm-muted text-[13px]">{lang.thinking}</span>
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
                    className="flex h-10 items-center gap-1.5 px-3.5 rounded-full border border-tm-line bg-white text-tm-ink"
                  >
                    <action.icon size={15} className="text-tm-navy" />
                    <span className="text-[13px] font-medium">{lang.quickActions[action.key]}</span>
                    {action.isComingSoon && (
                      <span className="text-[11px] text-tm-warm ml-0.5">soon</span>
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
          <div className="px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5 border-t border-tm-line">
            <div className="flex items-center gap-1 bg-white border border-tm-line rounded-full pl-4 pr-1.5 h-[52px] focus-within:border-tm-navy">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang.placeholder}
                aria-label={lang.placeholder}
                className="flex-1 min-w-0 bg-transparent text-[15px] placeholder:text-tm-muted outline-none"
                disabled={isLoading}
              />
              <button
                onClick={toggleVoice}
                aria-label="음성 입력"
                aria-pressed={isListening}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
                  isListening ? 'bg-tm-sos text-white' : 'text-tm-navy'
                }`}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="보내기"
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-tm-navy text-white'
                    : 'text-tm-muted'
                }`}
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
