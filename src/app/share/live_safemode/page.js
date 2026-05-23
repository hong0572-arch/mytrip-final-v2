'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, MapPin, AlertTriangle, Phone } from 'lucide-react';
import Link from 'next/link';

function GuardianDashboardContent() {
    const searchParams = useSearchParams();
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const name = searchParams.get('name') || '여행자';

    const hasLocation = lat && lng;
    const mapUrl = hasLocation ? `https://www.google.com/maps?q=${lat},${lng}` : null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12 pb-20 font-sans">
            <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden">
                {/* 헤더 구역 */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(255,255,255,0.3)] animate-pulse">
                            <ShieldCheck size={48} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-white mb-2 tracking-tight">안심 귀가 모니터링</h1>
                        <p className="text-white/90 text-sm font-bold">
                            현재 {name}님이 Safe Mode로 안전하게 이동 중입니다.
                        </p>
                    </div>
                </div>

                {/* 컨텐츠 구역 */}
                <div className="p-8 space-y-8">
                    {/* 실시간 위치 */}
                    <div>
                        <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                            <MapPin className="text-indigo-500" /> 마지막 확인된 위치
                        </h2>
                        
                        {hasLocation ? (
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                                <div className="aspect-video w-full bg-gray-200 relative flex items-center justify-center">
                                    <iframe 
                                        width="100%" 
                                        height="100%" 
                                        frameBorder="0" 
                                        style={{ border: 0 }}
                                        src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`} 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                                <div className="p-4 bg-white flex justify-between items-center">
                                    <p className="text-xs font-bold text-gray-500">실시간 GPS 연동 됨</p>
                                    <a 
                                        href={mapUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition"
                                    >
                                        구글 지도로 크게 보기
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 text-center">
                                <AlertTriangle size={32} className="text-rose-400 mx-auto mb-3" />
                                <p className="text-sm font-black text-rose-800 mb-1">위치 정보를 불러올 수 없습니다</p>
                                <p className="text-xs text-rose-600/80 font-bold">기기의 위치 설정이 꺼져있거나, 통신 상태가 불안정할 수 있습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* 보호자 행동 지침 */}
                    <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                        <h3 className="font-black text-amber-900 mb-2 flex items-center gap-2 text-sm">
                            <AlertTriangle size={16} /> 보호자 행동 지침
                        </h3>
                        <ul className="text-xs font-bold text-amber-800/80 space-y-2 leading-relaxed">
                            <li>• 여행자님이 귀가 시간을 설정하고 스스로 안전 모드를 켰습니다.</li>
                            <li>• 설정된 시간이 지나도 안전을 확인하지 않으면 긴급 사이렌이 울리고 문자가 다시 전송됩니다.</li>
                            <li>• 장시간 위치 변화가 없거나 연락이 닿지 않을 경우, 즉시 전화를 걸어 안전을 확인해 주세요.</li>
                        </ul>
                    </div>
                </div>

                {/* 하단 푸터 */}
                <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
                    <Link href="/" className="text-xs font-bold text-gray-400 hover:text-indigo-500 transition">
                        TripMaker 서비스 메인으로 가기
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function GuardianDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-indigo-500 font-black">Loading Dashboard...</div>}>
            <GuardianDashboardContent />
        </Suspense>
    );
}
