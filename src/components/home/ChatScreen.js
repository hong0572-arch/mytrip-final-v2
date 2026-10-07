'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Camera, ChevronLeft, MessageSquarePlus, Sparkles } from 'lucide-react';
import { auth } from '../../lib/firebase';
import useTimmy from '../../hooks/useTimmy';
import useAppLanguage from '../../hooks/useAppLanguage';
import { getAiHomeCopy } from '../../content/aiHomeCopy';
import { getApiUrl } from '../../utils/api';
import HomeComposer from './HomeComposer';
import { PlanOptions, PlanResultCard, PlanWorking } from './PlanCards';
import { goToLogin, takePendingMessage } from './homeActions';

// 일정표 화면(지도·저장 포함)은 고른 뒤에만 불러온다
const AIResult = dynamic(() => import('../AIResult'), { ssr: false });

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

let seq = 0;
const newId = () => `p${Date.now()}_${seq++}`;

// 티미와 대화(/chat). 일반 질문은 useTimmy(대화 기록·기억 저장)가 맡고,
// '일정 만들기'에 들어가면 대화 내용으로 후보 3개를 만들고 → 고른 안으로 일정표를 만든다.
export default function ChatScreen() {
  const router = useRouter();
  const [language] = useAppLanguage();
  const copy = getAiHomeCopy(language);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const { messages, isLoading, sendMessage, createNewSession } = useTimmy({ userId: user?.uid, language });

  // 일정 만들기 흐름의 대화 항목(티미 대화 기록과는 따로 두고 시간순으로 함께 보여 준다)
  const [planItems, setPlanItems] = useState([]);
  const [planMode, setPlanMode] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [openPlan, setOpenPlan] = useState(null); // { data, userInfo, itemId }

  const endRef = useRef(null);
  const fileRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => onAuthStateChanged(auth, (u) => {
    setUser(u || null);
    setAuthReady(true);
  }), []);

  const addPlanItem = useCallback((item) => {
    const full = { id: newId(), at: Date.now(), ...item };
    setPlanItems((prev) => [...prev, full]);
    return full.id;
  }, []);
  const removePlanItem = useCallback((id) => setPlanItems((prev) => prev.filter((p) => p.id !== id)), []);
  const updatePlanItem = useCallback((id, patch) => setPlanItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))), []);

  // 화면에 보이는 순서(시간순)
  const timeline = useMemo(() => {
    const chat = messages.map((m, i) => ({ id: `m${i}`, at: m.timestamp || 0, kind: m.role === 'user' ? 'chatUser' : 'chatTimmy', msg: m }));
    return [...chat, ...planItems].sort((a, b) => a.at - b.at);
  }, [messages, planItems]);

  // 일정 후보 API에 보낼 대화 내용(티미 대화 + 일정 만들기 대화)
  const transcriptFrom = useCallback((items) => items.flatMap((t) => {
    if (t.kind === 'chatUser' || t.kind === 'planUser') return [{ role: 'user', content: t.kind === 'chatUser' ? t.msg.content : t.text }];
    if (t.kind === 'chatTimmy') return [{ role: 'assistant', content: t.msg.content }];
    if (t.kind === 'planQuestion') return [{ role: 'assistant', content: t.text }];
    return [];
  }), []);

  const runPlanOptions = useCallback(async (items) => {
    setPlanBusy(true);
    const workingId = addPlanItem({ kind: 'planWorking', title: copy.plan.thinking });
    try {
      const res = await fetch(getApiUrl('/api/plan-options/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcriptFrom(items), language, today: localToday() }),
      });
      const data = await res.json();
      removePlanItem(workingId);
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.type === 'question') {
        addPlanItem({ kind: 'planQuestion', text: data.question, quickReplies: data.quickReplies || [] });
        setPlanMode(true);
      } else {
        addPlanItem({ kind: 'planOptions', intro: data.intro, options: data.options, request: data.request, chosenId: null });
        setPlanMode(false);
      }
    } catch (err) {
      console.error('plan options failed:', err);
      removePlanItem(workingId);
      addPlanItem({ kind: 'planError', retry: 'options' });
    } finally {
      setPlanBusy(false);
    }
  }, [addPlanItem, removePlanItem, transcriptFrom, copy.plan.thinking, language]);

  // '일정 만들기' 시작: 대화가 없으면 먼저 어디·언제를 묻는다
  const startPlanning = useCallback((firstText) => {
    setPlanMode(true);
    if (firstText) {
      const userItem = { id: newId(), at: Date.now(), kind: 'planUser', text: firstText };
      setPlanItems((prev) => [...prev, userItem]);
      runPlanOptions([...timeline, userItem]);
      return;
    }
    if (timeline.some((t) => t.kind === 'chatUser' || t.kind === 'planUser')) {
      runPlanOptions(timeline);
      return;
    }
    addPlanItem({ kind: 'planQuestion', text: copy.plan.askFirst, quickReplies: copy.plan.askFirstReplies });
  }, [timeline, runPlanOptions, addPlanItem, copy.plan.askFirst, copy.plan.askFirstReplies]);

  const handleSubmit = useCallback((text) => {
    if (planMode) {
      const userItem = { id: newId(), at: Date.now(), kind: 'planUser', text };
      setPlanItems((prev) => [...prev, userItem]);
      runPlanOptions([...timeline, userItem]);
      return;
    }
    sendMessage(text);
  }, [planMode, timeline, runPlanOptions, sendMessage]);

  const buildItinerary = useCallback(async (item, option) => {
    setPlanBusy(true);
    const req = item.request || {};
    const workingId = addPlanItem({ kind: 'planWorking', title: copy.plan.building, sub: copy.plan.buildingSub });
    const userInfo = {
      destination: req.destination,
      startDate: req.startDate,
      endDate: req.endDate,
      companion: req.companion || '혼자',
      people: Number(req.people) || 1,
      budget: String(req.budget || '100'),
      tourType: req.tourType || option.pace || '',
    };
    try {
      const chosenConcept = [
        `Chosen concept: ${option.title} — ${option.summary || ''}`,
        option.stayArea ? `Stay in: ${option.stayArea}` : '',
        option.days?.length ? `Day flow: ${option.days.join(' / ')}` : '',
      ].filter(Boolean).join('. ');
      const res = await fetch(getApiUrl('/api/generate/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userInfo,
          request: [req.request, chosenConcept].filter(Boolean).join('. '),
          isLuxury: false,
          language,
        }),
      });
      const data = await res.json();
      removePlanItem(workingId);
      if (!res.ok || !data.result) throw new Error(data?.error || `HTTP ${res.status}`);
      const resultId = addPlanItem({ kind: 'planResult', plan: data.result, request: req, userInfo, opened: false });
      setOpenPlan({ data: data.result, userInfo, itemId: resultId });
      updatePlanItem(resultId, { opened: true });
    } catch (err) {
      console.error('itinerary generation failed:', err);
      removePlanItem(workingId);
      addPlanItem({ kind: 'planError', retry: 'build', item, option });
      updatePlanItem(item.id, { chosenId: null });
    } finally {
      setPlanBusy(false);
    }
  }, [addPlanItem, removePlanItem, updatePlanItem, copy.plan.building, copy.plan.buildingSub, language]);

  const chooseOption = useCallback((item, option) => {
    updatePlanItem(item.id, { chosenId: option.id });
    addPlanItem({ kind: 'planUser', text: copy.plan.chosen(option.title) });
    buildItinerary(item, option);
  }, [updatePlanItem, addPlanItem, buildItinerary, copy.plan]);

  const retry = useCallback((errItem) => {
    removePlanItem(errItem.id);
    if (errItem.retry === 'build' && errItem.item) chooseOption(errItem.item, errItem.option);
    else runPlanOptions(timeline.filter((t) => t.id !== errItem.id));
  }, [removePlanItem, chooseOption, runPlanOptions, timeline]);

  // 첫 진입: 로그인 확인 후 홈에서 넘긴 메시지 처리, 로그인 후 돌아온 저장 대기 일정 복원
  useEffect(() => {
    if (!authReady || startedRef.current) return;
    startedRef.current = true;
    try {
      const pending = sessionStorage.getItem('pendingTripSave');
      if (pending) {
        const { savedUserInfo, savedTripPlan } = JSON.parse(pending);
        if (savedTripPlan) setOpenPlan({ data: savedTripPlan, userInfo: savedUserInfo });
        return;
      }
    } catch {}
    const { message, plan } = takePendingMessage();
    if (plan) startPlanning(message);
    else if (message) sendMessage(message);
  }, [authReady, sendMessage, startPlanning]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [timeline.length, isLoading]);

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

  const hasConversation = timeline.some((t) => t.kind === 'chatUser' || t.kind === 'planUser');
  const showPlanCta = !planMode && !planBusy && !isLoading;
  const busy = isLoading || planBusy;

  const renderItem = (t) => {
    switch (t.kind) {
      case 'chatUser':
      case 'planUser': {
        const content = t.kind === 'chatUser' ? t.msg.content : t.text;
        return (
          <div key={t.id} className="tm-rise flex max-w-[80%] flex-col gap-2 self-end rounded-[18px] rounded-br-[4px] bg-tm-ink px-3.5 py-2.5 text-[15px] leading-normal text-white">
            {t.msg?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.msg.imageUrl} alt="" className="max-h-48 rounded-lg object-cover" />
            )}
            {content}
          </div>
        );
      }
      case 'chatTimmy':
        return (
          <div
            key={t.id}
            className={`tm-rise max-w-[92%] rounded-[18px] rounded-bl-[4px] px-3.5 py-2.5 text-[15px] leading-relaxed ${t.msg.isError ? 'bg-tm-warm-tint text-tm-warm' : 'bg-white text-tm-ink'} [&_a]:text-tm-navy [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{t.msg.content}</ReactMarkdown>
          </div>
        );
      case 'planQuestion':
        return (
          <div key={t.id} className="tm-rise flex flex-col gap-2">
            <div className="max-w-[88%] rounded-[18px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[15px] leading-normal">{t.text}</div>
            {t.quickReplies?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {t.quickReplies.map((r) => (
                  <button key={r} type="button" disabled={busy} onClick={() => handleSubmit(r)} className="h-10 rounded-full border border-tm-line bg-white px-3.5 text-[14px] font-medium text-tm-ink active:bg-tm-sky-tint disabled:opacity-50">
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      case 'planOptions':
        return (
          <PlanOptions
            key={t.id}
            copy={copy}
            intro={t.intro}
            options={t.options}
            chosenId={t.chosenId}
            disabled={busy}
            onChoose={(option) => chooseOption(t, option)}
          />
        );
      case 'planWorking':
        return <PlanWorking key={t.id} title={t.title} sub={t.sub} />;
      case 'planResult':
        return (
          <PlanResultCard
            key={t.id}
            copy={copy}
            plan={t.plan}
            request={t.request}
            opened={t.opened}
            onOpen={() => setOpenPlan({ data: t.plan, userInfo: t.userInfo, itemId: t.id })}
          />
        );
      case 'planError':
        return (
          <div key={t.id} className="flex flex-col items-start gap-2 rounded-[18px] rounded-bl-[4px] bg-tm-warm-tint px-3.5 py-3 text-[14px] text-tm-warm">
            {copy.plan.error}
            <button type="button" onClick={() => retry(t)} className="h-10 rounded-lg bg-white px-3.5 text-[14px] font-semibold text-tm-ink">{copy.plan.retry}</button>
          </div>
        );
      default:
        return null;
    }
  };

  if (openPlan) {
    return <AIResult data={openPlan.data} userInfo={openPlan.userInfo} language={language} onReset={() => setOpenPlan(null)} />;
  }

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
          {hasConversation && (
            <button
              type="button"
              onClick={() => { createNewSession(); setPlanItems([]); setPlanMode(false); }}
              aria-label={copy.newChat}
              className="flex h-11 w-11 items-center justify-center text-tm-navy"
            >
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

          {timeline.map(renderItem)}

          {isLoading && <PlanWorking title={copy.chatThinking} />}

          {hasConversation && !busy && (
            <p className="pt-1 text-center text-[12px] text-tm-muted">{copy.chatDisclaimer}</p>
          )}
          <div ref={endRef} />
        </main>

        <div className="sticky bottom-0 z-10 pb-[env(safe-area-inset-bottom)]">
          {showPlanCta && (
            <div className="border-t border-tm-line bg-tm-ground px-4 pt-2.5">
              <button
                type="button"
                onClick={() => startPlanning('')}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-tm-navy/20 bg-tm-sky-tint text-[14px] font-bold text-tm-navy"
              >
                <Sparkles size={17} />
                {hasConversation ? copy.makeItinerary : copy.plan.start}
              </button>
            </div>
          )}
          <HomeComposer copy={copy} language={language} placeholder={copy.composerPlaceholder} onSubmit={handleSubmit} disabled={busy} />
        </div>
      </div>
    </div>
  );
}
