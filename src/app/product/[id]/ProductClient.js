'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '../../../lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, ExternalLink, MessageCircle, Phone, Mail, Navigation } from 'lucide-react';
import { getValidImageUrl } from '../../../utils/imageUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ProductClient() {
    const { id } = useParams();
    const router = useRouter();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Inquiry Modal State
    const [showInquiryModal, setShowInquiryModal] = useState(false);
    const [inquiryMsg, setInquiryMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchProduct = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
                } else {
                    alert("Product not found.");
                    router.back();
                }
            } catch (error) {
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id, router]);

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("Please log in to send an inquiry.");
            return;
        }
        if (!inquiryMsg.trim()) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "inquiries"), {
                productId: id,
                userId: user.uid,
                message: inquiryMsg,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            alert("Inquiry sent successfully!");
            setShowInquiryModal(false);
            setInquiryMsg('');
        } catch (error) {
            console.error("Error sending inquiry:", error);
            alert("Failed to send inquiry.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading product...</div>;
    if (!product) return null;

    return (
        <div className="max-w-2xl mx-auto bg-[#f3eedd] min-h-screen pb-24 font-sans">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-transparent flex items-center p-4 max-w-2xl mx-auto">
                <button 
                    onClick={() => {
                        if (window.history.length > 1 && document.referrer) {
                            router.back();
                        } else {
                            window.close();
                            setTimeout(() => router.push('/'), 300);
                        }
                    }} 
                    className="p-3 bg-white/70 backdrop-blur-md hover:bg-white rounded-full shadow-sm text-gray-800 transition-all"
                >
                    <ArrowLeft size={22} />
                </button>
            </header>

            {/* Main Image Carousel */}
            <div className="w-full h-80 bg-gray-200 relative group">
                {product.images && product.images.length > 0 ? (
                    <>
                        <div className="flex w-full h-full overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {product.images.map((img, idx) => (
                                <img key={idx} src={getValidImageUrl(img)} alt={`${product.title} - image ${idx + 1}`} className="w-full h-full object-cover shrink-0 snap-center" />
                            ))}
                        </div>
                        {product.images.length > 1 && (
                            <div className="absolute bottom-10 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-bold backdrop-blur-sm pointer-events-none">
                                스와이프 {product.images.length}장
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-[#e2dcc8] font-medium">No Image Available</div>
                )}
                {/* Gradient overlay for better header visibility */}
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none"></div>
            </div>

            {/* Content Card (Overlaps the image) */}
            <div className="bg-[#f3eedd] relative -mt-6 rounded-t-3xl flex flex-col">
                <div className="bg-white rounded-t-3xl p-6 shadow-sm min-h-screen">
                    {/* Type Badge */}
                    <div className="flex justify-between items-start mb-4">
                        <span className="px-4 py-1.5 bg-cyan-100 text-cyan-700 text-xs font-bold rounded-full uppercase tracking-wider">
                            {product.type === 'hotel' ? '숙소' : product.type === 'tour' ? '투어' : product.type === 'ticket' ? '티켓' : product.type}
                        </span>
                    </div>
                    
                    {/* Title & Price */}
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">{product.title}</h1>
                    <div className="text-2xl font-bold text-cyan-600 mb-6 pb-6 border-b border-gray-100">
                        ₩{Number(product.price).toLocaleString()}
                    </div>

                    {/* Description */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">상세 설명</h3>
                        <div className="prose prose-sm max-w-none prose-cyan text-gray-700">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {product.description}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Location Box */}
                    {product.coordinates && (
                        <div className="mb-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
                                <MapPin size={20} className="text-cyan-500"/> 위치 정보
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">위도: {product.coordinates.lat.toFixed(4)}, 경도: {product.coordinates.lng.toFixed(4)}</p>
                            <button 
                                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${product.coordinates.lat},${product.coordinates.lng}`, '_blank')}
                                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                <Navigation size={18} className="text-cyan-600" /> 구글 지도에서 열기
                            </button>
                        </div>
                    )}

                    {/* Contact Info */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">문의 및 연락처</h3>
                        <div className="space-y-3">
                            {product.phone && (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-10 h-10 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center shrink-0">
                                        <Phone size={18} />
                                    </div>
                                    <span className="text-gray-700 font-medium">{product.phone}</span>
                                </div>
                            )}
                            {product.email && (
                                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <Mail size={18} />
                                    </div>
                                    <span className="text-gray-700 font-medium">{product.email}</span>
                                </div>
                            )}
                            {!product.phone && !product.email && (
                                <div className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    등록된 연락처가 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-4 max-w-2xl mx-auto shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex gap-3 z-50">
                <button 
                    onClick={() => setShowInquiryModal(true)}
                    className="flex-1 py-4 bg-[#f3eedd] text-gray-800 font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#e6dfc8] transition-colors"
                >
                    <MessageCircle size={22} /> 문의하기
                </button>
                {product.externalUrl && (
                    <button 
                        onClick={() => window.open(product.externalUrl, '_blank')}
                        className="flex-1 py-4 bg-cyan-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/30"
                    >
                        <ExternalLink size={22} /> 예약/구매
                    </button>
                )}
            </div>

            {/* Inquiry Modal */}
            {showInquiryModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-3xl w-full max-w-md p-7 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-2 text-gray-900">문의 남기기</h2>
                        <p className="text-gray-500 mb-6 text-sm">궁금한 점이나 예약 관련 문의를 남겨주세요.</p>
                        
                        {!user && (
                            <div className="p-3 bg-red-50 text-red-600 rounded-xl mb-4 text-sm font-medium flex items-center gap-2">
                                ⚠️ 로그인이 필요한 서비스입니다.
                            </div>
                        )}
                        
                        <form onSubmit={handleInquirySubmit}>
                            <textarea 
                                required
                                value={inquiryMsg}
                                onChange={(e) => setInquiryMsg(e.target.value)}
                                placeholder="문의 내용을 상세히 적어주세요..."
                                className="w-full p-4 border border-gray-200 rounded-2xl mb-6 h-36 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-gray-50"
                            />
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setShowInquiryModal(false)}
                                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={!user || isSubmitting}
                                    className="flex-1 py-4 bg-cyan-500 text-white rounded-2xl font-bold hover:bg-cyan-600 transition-colors disabled:opacity-50 shadow-md shadow-cyan-500/30"
                                >
                                    {isSubmitting ? '전송 중...' : '문의 전송'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
