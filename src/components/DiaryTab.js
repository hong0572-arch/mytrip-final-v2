import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Plus, Image as ImageIcon, Sparkles, X, Trash2, Calendar, MapPin, Twitter, Share2 } from 'lucide-react';

export default function DiaryTab({ diaries, isGenerating, onGenerate, onSave, onDelete, language = 'ko' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState(null);
  
  // Generation state
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Str = event.target.result; // data:image/jpeg;base64,...
      setImageBase64(base64Str.split(',')[1]);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    const draft = await onGenerate({
      keyword,
      imageBase64,
      mimeType,
      location,
      date
    });
    if (draft) {
      setGeneratedDraft(draft);
    }
  };

  const handleSave = async () => {
    if (!generatedDraft) return;
    const success = await onSave({
      title: generatedDraft.title,
      content: generatedDraft.content,
      location,
      date,
      imageBase64: imageBase64 ? `data:${mimeType};base64,${imageBase64}` : null
    });
    if (success) {
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDiary(null);
    setImageFile(null);
    setImageBase64(null);
    setMimeType(null);
    setKeyword('');
    setLocation('');
    setGeneratedDraft(null);
  };

  const getShareText = (diary) => {
    return encodeURIComponent(`[${diary.title}]\n\n${diary.content}\n\n#여행일기 #티미 #TripMaker`);
  };

  const shareToX = (diary) => {
    window.open(`https://twitter.com/intent/tweet?text=${getShareText(diary)}`, '_blank');
  };

  const shareToThreads = (diary) => {
    window.open(`https://www.threads.net/intent/post?text=${getShareText(diary)}`, '_blank');
  };

  return (
    <div className="w-full h-full pt-6 px-4 pb-[100px] overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">
            {language === 'en' ? 'Travel Diary' : '나의 여행 일기'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {language === 'en' ? 'AI writes your travel memories beautifully.' : '티미가 감성적인 여행 일기를 써드려요.'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>

      {diaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Book size={48} className="mb-4 opacity-20" />
          <p>{language === 'en' ? 'No diaries yet.' : '아직 작성된 일기가 없습니다.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {diaries.map(diary => (
            <div 
              key={diary.id}
              onClick={() => setSelectedDiary(diary)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {diary.imageBase64 && (
                <div className="absolute top-0 left-0 right-0 h-24 bg-slate-100 -z-0 opacity-20">
                  <img src={diary.imageBase64} alt="diary thumbnail" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 pt-2">
                <h3 className="font-bold text-slate-800 text-lg mb-2">{diary.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                  {diary.date && <span className="flex items-center gap-1"><Calendar size={12} /> {diary.date}</span>}
                  {diary.location && <span className="flex items-center gap-1"><MapPin size={12} /> {diary.location}</span>}
                </div>
                <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
                  {diary.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Diary Detail / Create Modal */}
      <AnimatePresence>
        {(isModalOpen || selectedDiary) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">
                  {selectedDiary ? (language === 'en' ? 'Diary Detail' : '일기 보기') : (language === 'en' ? 'Create Diary' : '새 일기 쓰기')}
                </h3>
                <div className="flex items-center gap-2">
                  {selectedDiary && (
                    <button onClick={() => { onDelete(selectedDiary.id); handleCloseModal(); }} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-100">
                      <Trash2 size={18} />
                    </button>
                  )}
                  <button onClick={handleCloseModal} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {selectedDiary ? (
                  // View Mode
                  <div>
                    {selectedDiary.imageBase64 && (
                      <img src={selectedDiary.imageBase64} alt="diary image" className="w-full h-48 object-cover rounded-2xl mb-6 shadow-sm" />
                    )}
                    <h2 className="text-2xl font-black text-slate-800 mb-2">{selectedDiary.title}</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-400 mb-6 pb-4 border-b border-slate-100">
                      {selectedDiary.date && <span className="flex items-center gap-1"><Calendar size={12} /> {selectedDiary.date}</span>}
                      {selectedDiary.location && <span className="flex items-center gap-1"><MapPin size={12} /> {selectedDiary.location}</span>}
                    </div>
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-[15px] mb-8">
                      {selectedDiary.content}
                    </p>
                    
                    {/* Share Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => shareToX(selectedDiary)}
                        className="flex-1 py-3 bg-black text-white font-medium rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <Twitter size={18} fill="currentColor" />
                        <span>X (Twitter)</span>
                      </button>
                      <button 
                        onClick={() => shareToThreads(selectedDiary)}
                        className="flex-1 py-3 bg-slate-900 text-white font-medium rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 size={18} />
                        <span>Threads</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  // Create Mode
                  <div className="space-y-5">
                    {!generatedDraft ? (
                      // Input Form
                      <>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">어디서 다녀오셨나요?</label>
                          <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 도쿄 시부야" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">날짜</label>
                          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">기억에 남는 순간 (키워드)</label>
                          <textarea value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="예: 비가 와서 추웠는데 따뜻한 라멘이 너무 맛있었다." rows={3} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">사진 첨부 (선택)</label>
                          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                          <button onClick={() => fileInputRef.current?.click()} className={`w-full h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors overflow-hidden ${imageBase64 ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}>
                            {imageBase64 ? (
                              <img src={`data:${mimeType};base64,${imageBase64}`} className="w-full h-full object-cover opacity-50" />
                            ) : (
                              <>
                                <ImageIcon size={24} className="text-slate-400" />
                                <span className="text-sm text-slate-500">사진을 선택해주세요</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <>생성 중...</>
                          ) : (
                            <><Sparkles size={18} /> AI 다이어리 생성하기</>
                          )}
                        </button>
                      </>
                    ) : (
                      // Preview Draft
                      <div className="animate-fade-in">
                        <div className="p-4 bg-indigo-50 rounded-2xl mb-4 border border-indigo-100">
                          <p className="text-sm text-indigo-800 flex items-center gap-2">
                            <Sparkles size={16} /> 티미가 멋진 일기를 써봤어요! 마음에 드시나요?
                          </p>
                        </div>
                        <input type="text" value={generatedDraft.title} onChange={e => setGeneratedDraft({...generatedDraft, title: e.target.value})} className="w-full text-xl font-bold text-slate-800 mb-4 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors px-1 py-2" />
                        <textarea value={generatedDraft.content} onChange={e => setGeneratedDraft({...generatedDraft, content: e.target.value})} rows={10} className="w-full text-slate-700 leading-relaxed bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 focus:outline-none transition-colors rounded-xl p-2 resize-none custom-scrollbar" />
                        
                        <div className="flex gap-3 mt-6">
                          <button onClick={() => setGeneratedDraft(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-medium rounded-xl hover:bg-slate-200 transition-colors">
                            다시 쓰기
                          </button>
                          <button onClick={handleSave} className="flex-1 py-3.5 bg-slate-800 text-white font-medium rounded-xl hover:bg-slate-900 transition-colors shadow-lg">
                            저장하기
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
