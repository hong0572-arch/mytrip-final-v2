'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Camera, ChevronLeft, MessageSquarePlus } from 'lucide-react';
import { auth } from '../../lib/firebase';
import useTimmy from '../../hooks/useTimmy';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import HomeComposer from './HomeComposer';
import { goToLogin, takePendingMessage } from './homeActions';

// 홈에서 보낸 첫 메시지를 이어받아 티미와 대화하는 화면(/chat). 대화·기억 저장은 useTimmy가 맡는다.
export default function ChatScreen() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getAiHomeCopy(language);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const { messages, isLoading, sendMessage, createNewSession } = useTimmy({ userId: user?.uid, language });
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const sentPending = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u || null);
    setAuthReady(true);
  }), []);

  // 로그인 여부가 확인된 뒤 첫 메시지를 보낸다(로그인 사용자는 기억·대화 저장에 userId가 필요).
  useEffect(() => {
    if (!authReady || sentPending.current) return;
    sentPending.current = true;
    const pending = takePendingMessage();
    if (pending) sendMessage(pending);
  }, [authReady, sendMessage]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isLoading]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const prompt = language === 'en' ? 'Translate the text in this image.' : '이 이미지의 텍스트를 번역해줘.';
      sendMessage(prompt, event.target.result);
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-tm-ground font-sans text-tm-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-1 border-b border-tm-line bg-tm-ground/95 py-2 pl-1.5 pr-3 backdrop-blur">
          <Link href="/" aria-label={copy.back} className="flex h-11 w-11 items-center justify-center text-tm-ink">
            <ChevronLeft size={24} strokeWidth={2} />
          </Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/timmy.png" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
          <div className="flex flex-1 flex-col">
            <span className="text-[16px] font-bold leading-tight">{copy.chatTitle}</span>
            <span className="text-[11px] text-tm-muted">{copy.chatSubtitle}</span>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={copy.attachPhoto} className="flex h-11 w-11 items-center justify-center text-tm-navy">
            <Camera size={22} strokeWidth={1.8} />
          </button>
          {messages.length > 0 && (
            <button type="button" onClick={createNewSession} aria-label={copy.newChat} className="flex h-11 w-11 items-center justify-center text-tm-navy">
              <MessageSquarePlus size={22} strokeWidth={1.8} />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        </header>

        <main className="flex flex-1 flex-col gap-3.5 px-4 py-4" aria-live="polite">
          <div className="tm-rise max-w-[88%] rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[15px] leading-normal">
            {copy.chatWelcome}
          </div>

          {authReady && !user && (
            <button type="button" onClick={() => goToLogin(router)} className="self-start rounded-xl bg-tm-sky-tint px-3.5 py-2.5 text-left text-[13px] text-tm-navy">
              {copy.loginForMemory}
            </button>
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={msg.timestamp || i} className="tm-rise flex max-w-[80%] flex-col gap-2 self-end rounded-[18px] rounded-br-[4px] bg-tm-ink px-3.5 py-2.5 text-[15px] leading-normal text-white">
                {msg.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={msg.imageUrl} alt="" className="max-h-48 rounded-lg object-cover" />
                )}
                {msg.content}
              </div>
            ) : (
              <div
                key={msg.timestamp || i}
                className={`tm-rise max-w-[92%] rounded-[18px] rounded-bl-[4px] px-3.5 py-2.5 text-[15px] leading-relaxed ${msg.isError ? 'bg-tm-warm-tint text-tm-warm' : 'bg-white text-tm-ink'} [&_a]:text-tm-navy [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            )
          )}

          {isLoading && (
            <div className="flex items-center gap-2" role="status">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/timmy.png" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              <div className="flex items-center gap-2.5 rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5">
                <span aria-hidden="true" className="flex h-3 items-center gap-1">
                  <span className="tm-dot bg-tm-sky" />
                  <span className="tm-dot bg-tm-sky" />
                  <span className="tm-dot bg-tm-sky" />
                </span>
                <span className="text-[13px] text-tm-muted">{copy.chatThinking}</span>
              </div>
            </div>
          )}

          {messages.length >= 2 && !isLoading && (
            <div className="flex flex-col gap-2 pt-1">
              <Link href="/plan?tab=create" className="flex h-12 items-center justify-center rounded-xl bg-tm-navy text-[15px] font-bold text-white">
                {copy.makeItinerary}
              </Link>
              <p className="text-center text-[12px] text-tm-muted">{copy.chatDisclaimer}</p>
            </div>
          )}
          <div ref={endRef} />
        </main>

        <div className="sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
          <HomeComposer copy={copy} language={language} placeholder={copy.composerPlaceholder} onSubmit={(m) => sendMessage(m)} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
