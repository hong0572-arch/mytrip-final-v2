'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from "../../../lib/firebase";
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Plane, Calendar, MapPin, Sparkles, Loader2, LogIn, ArrowRight } from 'lucide-react';

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
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Plane className="animate-bounce mb-4 text-brand-primary" size={48} />
                <h2 className="text-xl font-bold animate-pulse">초대장을 열어보는 중...</h2>
            </div>
        );
    }

    const hostInfo = tripData.membersInfo ? tripData.membersInfo[0] : { name: "여행자", avatar: "https://i.pravatar.cc/150?u=host" };
    const safeDest = tripData.destination?.split('#')[0]?.trim() || "Seoul";
    const mapImageUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(safeDest)}&zoom=11&size=600x300&maptype=roadmap&markers=color:red%7C${encodeURIComponent(safeDest)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F766E] via-slate-900 to-[#0284C7] flex items-center justify-center p-6 font-sans relative overflow-hidden">
            <div className="absolute top-0 left-0 w-72 h-72 bg-brand-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-brand-secondary/20 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-1.5 bg-white/10 text-brand-accent text-xs font-black tracking-widest uppercase mb-3 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10"><Sparkles size={14} /> Trip Invitation</span>
                    <h1 className="text-3xl font-black text-white leading-tight">{hostInfo.name}님이 당신을<br />여행에 초대했어요!</h1>
                </div>

                <div className="bg-white rounded-[32px] shadow-2xl relative overflow-hidden">
                    <div className="relative h-48 bg-[#e5e7eb]">
                        <img src={mapImageUrl} alt="destination map" className="w-full h-full object-cover opacity-90 mix-blend-multiply" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/20 to-transparent"></div>
                        <div className="absolute bottom-4 left-5 right-5 text-white">
                            <span className="bg-brand-primary px-2 py-1 rounded-md text-[10px] font-black mb-2 inline-block shadow-sm">{tripData.theme || "맞춤 여행"}</span>
                            <h2 className="text-2xl font-black shadow-sm leading-snug truncate">{tripData.tripTitle || `${safeDest} 여행`}</h2>
                        </div>
                        <div className="absolute top-4 right-4 w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
                            <img src={hostInfo.avatar} alt="host" className="w-full h-full object-cover" />
                        </div>
                    </div>

                    <div className="relative flex items-center justify-between px-2 -mt-3 -mb-3 z-10">
                        <div className="w-6 h-6 bg-slate-900 rounded-full shadow-inner"></div>
                        <div className="flex-1 border-t-[3px] border-dashed border-gray-300 mx-2"></div>
                        <div className="w-6 h-6 bg-slate-900 rounded-full shadow-inner"></div>
                    </div>

                    <div className="p-6 pt-8 bg-white">
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Destination</p><p className="font-black text-gray-900 text-base flex items-center gap-1"><MapPin size={16} className="text-brand-primary" /> {safeDest}</p></div>
                            <div><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p><p className="font-black text-gray-900 text-sm flex items-center gap-1"><Calendar size={16} className="text-brand-secondary" /> {tripData.startDate}</p></div>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-8 relative"><div className="absolute -top-3 left-4 text-2xl">💬</div><p className="text-sm font-bold text-gray-600 text-center leading-relaxed pt-2">&quot;저랑 같이 이 일정 보면서<br />설레는 여행 준비 해볼래요?&quot;</p></div>

                        {!user ? (
                            <button onClick={handleLogin} className="w-full bg-gray-900 hover:bg-black text-white font-black text-lg py-4 rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2"><LogIn size={20} /> 3초만에 로그인하고 수락하기</button>
                        ) : (
                            <button onClick={handleAcceptInvite} disabled={isAccepting} className="w-full bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white font-black text-lg py-4 rounded-2xl shadow-xl shadow-brand-primary/20 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100">
                                {isAccepting ? <><Loader2 className="animate-spin" size={24} /> 참여 중...</> : <>수락하고 함께 여행 짜기 <ArrowRight size={20} strokeWidth={3} /></>}
                            </button>
                        )}
                    </div>
                </div>
                <div className="text-center mt-6"><button onClick={() => router.push('/')} className="text-white/60 hover:text-white text-sm font-bold transition">나중에 할게요</button></div>
            </div>
        </div>
    );
}
