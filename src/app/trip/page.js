'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth, db } from "../../lib/firebase"; // 경로 한 단계 수정됨
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import AIResult from "../../components/AIResult"; // 경로 한 단계 수정됨
// ✨ 하단 메뉴바에 사용할 아이콘(Home, Users, Calendar, Wallet) 추가!
import { Loader2, ArrowLeft, Map, MessageCircle, X, Send, Home as HomeIcon, Users, Calendar, Wallet } from 'lucide-react';

// 🛡️ useSearchParams를 사용하기 위해 별도 컴포넌트로 분리 (Next.js 권장사항)
function TripDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const tripId = searchParams.get('id');

    const [tripData, setTripData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [user, setUser] = useState(null);

    // ✨ 채팅 관련 상태
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef(null);

    // 1. 유저 인증 상태 및 여행 데이터 가져오기
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        const fetchTrip = async () => {
            if (!tripId) {
                setLoading(false);
                return;
            }
            try {
                const docRef = doc(db, "trips", tripId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTripData(docSnap.data());
                } else {
                    console.error("일정 데이터가 DB에 없습니다.");
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

    // 2. 채팅 메시지 실시간 연동
    useEffect(() => {
        let unsubscribeMessages;
        if (showChat && tripId) {
            const q = query(
                collection(db, "trips", tripId, "messages"),
                orderBy("createdAt", "asc")
            );
            unsubscribeMessages = onSnapshot(q, (snapshot) => {
                const loadedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMessages(loadedMessages);
            });
        }
        return () => {
            if (unsubscribeMessages) unsubscribeMessages();
        };
    }, [showChat, tripId]);

    // 3. 새 메시지 자동 스크롤
    useEffect(() => {
        if (showChat && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, showChat]);

    // 4. 메시지 전송 로직
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
                senderAvatar: user.photoURL || "https://i.pravatar.cc/150?u=" + user.uid,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("메시지 전송 실패:", error);
            alert("메시지를 보낼 수 없습니다. 권한을 확인해주세요.");
            setNewMessage(messageText);
        }
    };

    // 로딩 화면
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
                <Loader2 className="animate-spin mb-4 text-rose-500" size={48} />
                <h2 className="text-xl font-bold animate-pulse">일정을 불러오는 중...</h2>
            </div>
        );
    }

    // 에러 화면
    if (error || !tripData) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-6">
                <div className="bg-gray-800 p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl">
                    <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                        <Map size={32} />
                    </div>
                    <h2 className="text-2xl font-black mb-2">일정을 찾을 수 없어요</h2>
                    <button
                        onClick={() => router.push('/mypage')}
                        className="w-full mt-6 py-4 bg-rose-500 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2"
                    >
                        <ArrowLeft size={18} /> 마이페이지로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-gray-100 pb-32"> {/* ✨ 하단 여백(pb-32) 추가해서 메뉴바에 내용이 안 가려지게 함 */}
            {/* 뒤로가기 버튼 */}
            <div className="absolute top-6 left-6 z-40 pointer-events-auto sm:top-10 sm:left-10">
                <button
                    onClick={() => router.push('/mypage')}
                    className="bg-white/90 backdrop-blur-md p-3 rounded-full shadow-lg text-gray-800 hover:bg-white hover:text-rose-500 transition-colors"
                >
                    <ArrowLeft size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* 채팅 플로팅 버튼 (✨ 메뉴바에 가리지 않게 bottom-32로 위로 올림) */}
            {user && tripData.memberIds?.includes(user.uid) && (
                <div className="fixed bottom-32 right-6 z-40 sm:bottom-32 sm:right-10 pointer-events-auto">
                    <button
                        onClick={() => setShowChat(true)}
                        className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-[0_8px_30px_rgba(79,70,229,0.4)] flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all border-2 border-white"
                        title="동행자 채팅방 열기"
                    >
                        <MessageCircle size={30} className="drop-shadow-sm" />
                    </button>
                </div>
            )}

            {/* 실시간 채팅방 모달 */}
            {showChat && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center pointer-events-auto">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowChat(false)}></div>
                    <div className="bg-white w-full sm:max-w-md h-[85vh] sm:h-[650px] rounded-t-[32px] sm:rounded-[32px] flex flex-col relative z-10 animate-in slide-in-from-bottom-full duration-300 shadow-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-md z-20">
                            <div>
                                <h3 className="font-black text-xl text-gray-900 flex items-center gap-2">
                                    <MessageCircle className="text-indigo-500" size={22} />
                                    동행자 라운지
                                </h3>
                                <p className="text-xs text-gray-500 font-bold mt-0.5">{tripData.destination || "여행"} 워크스페이스</p>
                            </div>
                            <button onClick={() => setShowChat(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"><X size={20} strokeWidth={2.5} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 bg-gray-50 custom-scrollbar flex flex-col gap-4">
                            {messages.length === 0 ? (
                                <div className="m-auto text-center text-gray-400">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <MessageCircle size={32} className="text-indigo-200" />
                                    </div>
                                    <p className="text-base font-bold text-gray-600 mb-1">첫 메시지를 보내보세요!</p>
                                    <p className="text-xs">동행자들과 일정이나 맛집에 대해 이야기해봐요.</p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === user?.uid;
                                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                                    return (
                                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                                            {!isMe && (
                                                <div className="w-9 shrink-0 flex flex-col justify-end">
                                                    {showAvatar && <img src={msg.senderAvatar} alt="avatar" className="w-9 h-9 rounded-full border-2 border-white shadow-sm object-cover mb-1" />}
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && showAvatar && <span className="text-[11px] text-gray-500 font-bold mb-1 ml-1">{msg.senderName}</span>}
                                                <div className={`px-4 py-3 text-[15px] font-medium leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-md shadow-indigo-600/20' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm shadow-sm'}`}>
                                                    {msg.text}
                                                </div>
                                                <span className="text-[10px] text-gray-400 mt-1 mx-1 font-bold">
                                                    {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '방금'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} className="h-1" />
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100 shrink-0 pb-safe">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="따뜻한 인사로 대화를 시작해보세요!"
                                    className="flex-1 bg-gray-100 border-transparent focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-full px-5 py-4 text-[15px] font-medium outline-none transition shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 disabled:bg-gray-300 disabled:shadow-none transition shrink-0"
                                >
                                    <Send size={20} className="ml-1 -mt-0.5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ✨ AI 결과 출력 컴포넌트 */}
            <AIResult
                data={tripData}
                userInfo={tripData}
                tripId={tripId}
            />

        </div>
    );
}

// ✨ 전체 페이지를 Suspense로 감싸줍니다 (searchParams 필수 작업)
export default function TripDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader2 className="animate-spin text-rose-500" size={48} />
            </div>
        }>
            <TripDetailContent />
        </Suspense>
    );
}