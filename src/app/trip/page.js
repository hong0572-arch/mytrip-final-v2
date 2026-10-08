'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onSnapshotError } from '../../lib/snapshotError';
import { onAuthStateChanged } from "firebase/auth";
import { Map, MessageCircle, X, Send } from 'lucide-react';
import TripDetail from '../../components/trip/TripDetail';
import useAppLanguage from '../../hooks/useAppLanguage';
import TimmyAvatar from '../../components/TimmyAvatar';

// 저장된 일정(/trip?id=…). 참여자는 편집(바로 저장)·동행 초대·동행 채팅을, 그 밖의 사람은 보기만 한다.
function TripDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [language] = useAppLanguage();
    const tripId = searchParams.get('id');

    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [user, setUser] = useState(null);

    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        const fetchTrip = async () => {
            if (!tripId) { setLoading(false); return; }
            try {
                const docSnap = await getDoc(doc(db, "trips", tripId));
                if (docSnap.exists()) {
                    setTripData(docSnap.data());
                    localStorage.setItem('activeTripId', tripId);
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("일정 로딩 에러:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchTrip();
        return () => unsubscribeAuth();
    }, [tripId]);

    // 동행 채팅(열었을 때만 구독)
    useEffect(() => {
        if (!showChat || !tripId) return;
        const q = query(collection(db, "trips", tripId, "messages"), orderBy("createdAt", "asc"));
        return onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, onSnapshotError('trip/messages'));
    }, [showChat, tripId]);

    useEffect(() => {
        if (showChat) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, showChat]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        const messageText = newMessage.trim();
        setNewMessage("");
        try {
            await addDoc(collection(db, "trips", tripId, "messages"), {
                text: messageText,
                senderId: user.uid,
                senderName: user.displayName || "여행자",
                senderAvatar: user.photoURL || "",
                createdAt: serverTimestamp()
            });
        } catch (err) {
            console.error("메시지 전송 실패:", err);
            alert(language === 'en' ? "Couldn't send the message." : "메시지를 보낼 수 없습니다.");
            setNewMessage(messageText);
        }
    };

    if (loading) {
        return (
            <div className="min-h-dvh bg-tm-ground flex flex-col items-center justify-center gap-3 font-sans">
                <TimmyAvatar size={64} ring className="tm-float" />
                <p className="text-[15px] font-semibold text-tm-muted" role="status">{language === 'en' ? 'Loading your itinerary…' : '일정을 불러오는 중…'}</p>
            </div>
        );
    }

    if (error || !tripData) {
        return (
            <div className="min-h-dvh bg-tm-ground flex flex-col items-center justify-center px-5 font-sans text-tm-ink">
                <div className="w-full max-w-sm rounded-[20px] bg-white p-7 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-tm-sky-tint text-tm-navy"><Map size={28} strokeWidth={1.8} /></div>
                    <h1 className="mb-6 text-[22px] font-bold">{language === 'en' ? 'Itinerary not found' : '일정을 찾을 수 없어요'}</h1>
                    <button onClick={() => router.push('/trips')} className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-tm-navy text-[16px] font-bold text-white">
                        {language === 'en' ? 'Back to my trips' : '내 일정으로 돌아가기'}
                    </button>
                </div>
            </div>
        );
    }

    const isMember = Boolean(user && tripData.memberIds?.includes(user.uid));

    return (
        <>
            <TripDetail
                data={tripData}
                userInfo={tripData}
                tripId={tripId}
                mode={isMember ? 'saved' : 'shared'}
                language={language}
                onBack={() => router.push(isMember ? '/trips' : '/')}
                onOpenChat={isMember ? () => setShowChat(true) : undefined}
            />

            {showChat && (
                <div className="fixed inset-0 z-[120] flex items-end justify-center font-sans sm:items-center">
                    <div className="absolute inset-0 bg-tm-ink/40" onClick={() => setShowChat(false)}></div>
                    <div role="dialog" aria-label={language === 'en' ? 'Group chat' : '동행 채팅'} className="relative z-10 flex h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-[24px] bg-tm-ground sm:h-[650px] sm:rounded-[24px]">
                        <div className="flex items-center justify-between border-b border-tm-line px-5 py-4">
                            <div>
                                <h3 className="flex items-center gap-2 text-[17px] font-bold text-tm-ink"><MessageCircle className="text-tm-navy" size={20} />{language === 'en' ? 'Group chat' : '동행 채팅'}</h3>
                                <p className="mt-0.5 text-[12px] text-tm-muted">{tripData.destination || ''}</p>
                            </div>
                            <button onClick={() => setShowChat(false)} aria-label={language === 'en' ? 'Close' : '닫기'} className="flex h-11 w-11 items-center justify-center rounded-full text-tm-muted"><X size={20} /></button>
                        </div>
                        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
                            {messages.length === 0 ? (
                                <p className="m-auto text-center text-[14px] text-tm-muted">{language === 'en' ? 'Say hello to your travel buddies.' : '동행자에게 첫 인사를 남겨 보세요.'}</p>
                            ) : messages.map((msg, idx) => {
                                const isMe = msg.senderId === user?.uid;
                                const showName = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        {showName && <span className="mb-1 ml-1 text-[12px] font-semibold text-tm-muted">{msg.senderName}</span>}
                                        <div className={`max-w-[78%] px-3.5 py-2.5 text-[15px] leading-normal ${isMe ? 'rounded-[18px] rounded-br-[4px] bg-tm-ink text-white' : 'rounded-[18px] rounded-bl-[4px] bg-white text-tm-ink'}`}>{msg.text}</div>
                                        <span className="mx-1 mt-1 text-[11px] text-tm-muted">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t border-tm-line px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5">
                            <label className="flex h-[52px] min-w-0 flex-1 items-center rounded-full border border-tm-line bg-white px-4 focus-within:border-tm-navy">
                                <span className="sr-only">{language === 'en' ? 'Message' : '메시지'}</span>
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={language === 'en' ? 'Message' : '메시지 입력'} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-tm-muted" />
                            </label>
                            <button type="submit" disabled={!newMessage.trim()} aria-label={language === 'en' ? 'Send' : '보내기'} className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-tm-navy text-white disabled:opacity-40"><Send size={20} /></button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default function TripDetailPage() {
    return (
        <Suspense fallback={<div className="min-h-dvh bg-tm-ground" />}>
            <TripDetailContent />
        </Suspense>
    );
}
