'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Calendar, MapPin, Sparkles, Loader2, LogIn, ArrowRight } from 'lucide-react';
import TimmyAvatar from '../../../components/TimmyAvatar';

export default function JoinTripPage() {
    const params = useParams();
    const router = useRouter();
    const tripId = params.id;

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);
    const [tripData, setTripData] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        // ✨ [핵심] 실제 DB의 trips 컬렉션에서 공유받은 여행 정보 가져오기
        const fetchTripData = async () => {
            if (!tripId) return;
            try {
                const tripRef = doc(db, "trips", tripId);
                const tripSnap = await getDoc(tripRef);
                if (tripSnap.exists()) {
                    setTripData(tripSnap.data());
                } else {
                    alert("존재하지 않거나 삭제된 초대장입니다.");
                    router.push('/');
                }
            } catch (error) {
                console.error("데이터 로딩 에러:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTripData();
        return () => unsubscribe();
    }, [tripId, router]);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("로그인 에러:", error);
            alert("로그인 중 문제가 발생했습니다.");
        }
    };

    const handleAcceptInvite = async () => {
        if (!user) return alert("초대를 수락하려면 로그인이 필요합니다!");
        if (!tripData) return;

        // 이미 멤버인지 확인
        if (tripData.memberIds?.includes(user.uid)) {
            alert("이미 참여 중인 일정입니다!");
            router.push('/mypage');
            return;
        }

        setIsAccepting(true);
        try {
            // ✨ [핵심 로직] 이 여행 방(trips)의 멤버 명단에 나를 추가합니다!
            const tripRef = doc(db, "trips", tripId);
            await updateDoc(tripRef, {
                memberIds: arrayUnion(user.uid),
                membersInfo: arrayUnion({
                    uid: user.uid,
                    name: user.displayName || "여행자",
                    avatar: user.photoURL || "https://i.pravatar.cc/150?u=me"
                })
            });

            setTimeout(() => {
                alert("✨ 여행 일정에 합류했습니다! 마이페이지로 이동합니다.");
                router.push('/mypage');
            }, 800);

        } catch (error) {
            console.error("수락 에러:", error);
            alert("수락 중 오류가 발생했습니다.");
            setIsAccepting(false);
        }
    };

    if (loading || !tripData) {
        return (
            <div className="min-h-dvh bg-tm-ground flex flex-col items-center justify-center gap-3 font-sans">
                <TimmyAvatar size={64} ring className="tm-float" />
                <p className="text-[15px] font-semibold text-tm-muted" role="status">초대장을 여는 중…</p>
            </div>
        );
    }

    const hostInfo = tripData.membersInfo ? tripData.membersInfo[0] : { name: "여행자", avatar: "https://i.pravatar.cc/150?u=host" };
    const safeDest = tripData.destination?.split('#')[0]?.trim() || "Seoul";
    const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(safeDest)}&zoom=11&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(safeDest)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;

    return (
        <div className="min-h-dvh bg-tm-ground flex items-center justify-center px-5 py-8 font-sans text-tm-ink">
            <div className="w-full max-w-md">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <TimmyAvatar size={56} ring className="tm-float" />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-tm-sky-tint px-3 py-1.5 text-[12px] font-bold text-tm-navy"><Sparkles size={14} /> 여행 초대장</span>
                    <h1 className="tm-rise text-[26px] font-bold leading-[1.3] tracking-[-0.02em]">{hostInfo.name}님이<br />여행에 초대했어요</h1>
                </div>

                <div className="tm-rise overflow-hidden rounded-[20px] bg-white" style={{ animationDelay: '100ms' }}>
                    <div className="relative h-44 bg-tm-sky-tint">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mapImageUrl} alt="" className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-tm-ink/85 via-tm-ink/10 to-transparent"></div>
                        <div className="absolute bottom-4 left-5 right-5 text-white">
                            <span className="mb-2 inline-block rounded-md bg-white/20 px-2 py-1 text-[11px] font-bold backdrop-blur-sm">{tripData.theme || "맞춤 여행"}</span>
                            <h2 className="truncate text-[22px] font-bold leading-snug">{tripData.tripTitle || `${safeDest} 여행`}</h2>
                        </div>
                        <div className="absolute right-4 top-4 h-11 w-11 overflow-hidden rounded-full border-2 border-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={hostInfo.avatar} alt="" className="h-full w-full object-cover" />
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="mb-5 grid grid-cols-2 gap-4">
                            <div><p className="mb-1 text-[12px] font-semibold text-tm-muted">여행지</p><p className="flex items-center gap-1 text-[15px] font-bold"><MapPin size={16} className="text-tm-navy" /> {safeDest}</p></div>
                            <div><p className="mb-1 text-[12px] font-semibold text-tm-muted">출발일</p><p className="flex items-center gap-1 text-[15px] font-bold tabular-nums"><Calendar size={16} className="text-tm-navy" /> {tripData.startDate || '미정'}</p></div>
                        </div>
                        <p className="mb-5 rounded-2xl bg-tm-ground p-4 text-center text-[14px] leading-relaxed text-tm-muted">“같이 이 일정 보면서 여행 준비해요!”</p>

                        {!user ? (
                            <button onClick={handleLogin} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white"><LogIn size={20} /> 로그인하고 수락하기</button>
                        ) : (
                            <button onClick={handleAcceptInvite} disabled={isAccepting} className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-tm-navy text-[16px] font-bold text-white disabled:opacity-60">
                                {isAccepting ? <><Loader2 className="animate-spin" size={22} /> 참여하는 중…</> : <>수락하고 함께 준비하기 <ArrowRight size={20} strokeWidth={2.4} /></>}
                            </button>
                        )}
                    </div>
                </div>
                <div className="mt-4 text-center"><button onClick={() => router.push('/')} className="h-11 px-4 text-[14px] font-semibold text-tm-muted">나중에 할게요</button></div>
            </div>
        </div>
    );
}
