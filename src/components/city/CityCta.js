'use client';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import useAppLanguage from '../../hooks/useAppLanguage';
import { startChat } from '../home/homeActions';

// 도시 가이드의 '티미에게 이 도시 일정 맡기기' — 페이지 언어로 대화를 시작한다
export default function CityCta({ lang, prompt, label, sub }) {
  const router = useRouter();
  const [, setLanguage] = useAppLanguage();
  return (
    <button
      type="button"
      onClick={() => { setLanguage(lang); startChat(router, prompt, { plan: true }); }}
      className="flex min-h-[64px] w-full items-center gap-3 rounded-[18px] bg-tm-navy px-4 py-3 text-left text-white"
    >
      <Sparkles size={22} className="shrink-0 text-tm-sky-soft" aria-hidden="true" />
      <span className="flex flex-col gap-0.5">
        <span className="text-[16px] font-bold">{label}</span>
        <span className="text-[12px] leading-snug text-[#B9C8DA]">{sub}</span>
      </span>
    </button>
  );
}
