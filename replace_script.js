const fs = require('fs');
const filepath = 'src/components/AIResult.js';
let content = fs.readFileSync(filepath, 'utf8');

// 1. Add new state variables and logic after observerRef
const injectionHook = 'const observerRef = useRef(null);';
const newVars = `
    const [selectedIndex, setSelectedIndex] = useState(0);
    const infoWindowRef = useRef(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [infoModalTab, setInfoModalTab] = useState('budget');

    const flatPlaces = React.useMemo(() => {
        if (!tripPlan || !tripPlan.itinerary) return [];
        let list = [];
        tripPlan.itinerary.forEach((dayItem, dIdx) => {
            dayItem.places.forEach((place, pIdx) => {
                list.push({ dayIdx: dIdx, placeIdx: pIdx, day: dayItem.day, place: place, dayColor: DAY_COLORS[dIdx % DAY_COLORS.length] });
            });
        });
        return list;
    }, [tripPlan]);

    useEffect(() => {
        if (!window.google || !googleMapRef.current || flatPlaces.length === 0 || markersRef.current.length === 0) return;
        const currentItem = flatPlaces[selectedIndex];
        if (!currentItem) return;

        const { place } = currentItem;
        const marker = markersRef.current[selectedIndex];

        if (place.coordinates?.lat && place.coordinates?.lng) {
            googleMapRef.current.panTo(place.coordinates);
            if (googleMapRef.current.getZoom() < 15) googleMapRef.current.setZoom(16);
            
            if (!infoWindowRef.current) {
                infoWindowRef.current = new window.google.maps.InfoWindow();
            }
            
            const contentString = \`
                <div style="padding: 10px; max-width: 250px; font-family: sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                        <h3 style="font-weight: bold; font-size: 15px; margin: 0; color: #111827;">\${place.name}</h3>
                        <span style="font-size: 10px; background: #f3f4f6; padding: 2px 6px; border-radius: 12px; color: #6b7280; white-space: nowrap; margin-left: 8px;">\${place.category || '기타'}</span>
                    </div>
                    <p style="font-size: 12px; color: #4b5563; margin-top: 6px; margin-bottom: 8px; line-height: 1.4;">\${place.description}</p>
                    \${place.reason ? \`<div style="font-size: 11px; color: #FF5A5F; background: #FFF0F0; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #FFE4E6;"><strong>💡 냥프로의 픽!</strong><br />\${place.reason}</div>\` : ''}
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(place.name)}&hl=\${language}" target="_blank" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #4f46e5; background: #e0e7ff; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center;">🗺️ 길찾기</a>
                        \${(!place.category?.includes("Restaurant") && !place.category?.includes("Cafe")) ? \`<a href="\${getKlookLink(place.name, '', language)}" target="_blank" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center;">🎟️ 티켓 예매</a>\` : ''}
                    </div>
                </div>
            \`;
            infoWindowRef.current.setContent(contentString);
            if (marker) {
                infoWindowRef.current.open(googleMapRef.current, marker);
            }
        }
    }, [selectedIndex, flatPlaces, language]);
`;

if (!content.includes('flatPlaces')) {
    content = content.replace(injectionHook, injectionHook + '\n' + newVars);
}

// 2. Add marker click listener to select item
const markerHook = 'markersRef.current.push(marker);';
const markerReplacement = \`
                        marker.addListener('click', () => {
                            let fIdx = 0;
                            let found = false;
                            for (let i = 0; i < index; i++) {
                                fIdx += tripPlan.itinerary[i].places.length;
                            }
                            fIdx += placeIdx;
                            setSelectedIndex(fIdx);
                        });
                        markersRef.current.push(marker);
\`;
if (!content.includes('marker.addListener')) {
    content = content.replace(markerHook, markerReplacement);
}

// 3. Replace complete return block
const startHook = '    return (\n        <div className="min-h-screen';
let returnBlockIndex = content.indexOf(startHook);

if (returnBlockIndex !== -1) {
    const newReturn = \`    return (
        <div className="min-h-screen bg-black flex justify-center items-start sm:items-center overflow-hidden relative font-sans">
            <div id={CAPTURE_ID} className="w-full max-w-[480px] h-[100dvh] sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-800">

                {/* Full screen Map */}
                <div className="absolute inset-0 z-0 bg-gray-900">
                    <div ref={mapRef} className="w-full h-full" />
                </div>

                {/* Top Overlay */}
                <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10 flex flex-col items-start pt-10 sm:pt-6">
                    {theme && (
                        <span className="px-2 py-1 bg-rose-500 text-white text-xs font-black rounded-lg mb-2 shadow-sm">
                            {theme}
                        </span>
                    )}
                    <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg w-full pr-12 leading-tight">{tripPlan.tripTitle}</h1>
                </div>

                <div className="absolute top-8 right-5 z-50 pointer-events-auto flex flex-col gap-3">
                    <button onClick={() => router.push('/mypage')} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-indigo-600 transition" title="마이페이지">
                        <User size={20} />
                    </button>
                    <button onClick={() => setShowInfoModal(true)} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-rose-500 transition animate-pulse" title="여행 정보">
                        <Sparkles size={20} />
                    </button>
                    {isEditMode && (
                        <button onClick={(e) => { e.stopPropagation(); handleAutoFixAll(); }} disabled={loadingAction === 'autoFix'} className="bg-violet-600/90 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-violet-500 transition" title="위치 보정">
                            {loadingAction === 'autoFix' ? <Loader2 className="animate-spin" size={20} /> : <Wand2 size={20} />}
                        </button>
                    )}
                    <button onClick={() => setIsEditMode(!isEditMode)} className={\`backdrop-blur-md p-2.5 rounded-full shadow-lg transition \${isEditMode ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white hover:bg-white hover:text-indigo-600'}\`}>
                        {isEditMode ? <Check size={20} /> : <Pencil size={20} />}
                    </button>
                </div>

                {/* Right Side Dial Component */}
                {!isEditMode && (
                    <div className="absolute right-0 top-[20%] h-[60%] w-16 sm:w-20 z-20 pointer-events-auto flex flex-col">
                        <div className="h-full overflow-y-auto no-scrollbar scroll-smooth flex flex-col items-center py-[25vh] space-y-3 snap-y snap-mandatory" id="dial-scroll-container">
                            {flatPlaces.map((item, i) => {
                                const isSelected = i === selectedIndex;
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => {
                                            setSelectedIndex(i);
                                            // Optional: ensure scroll aligns correctly
                                        }}
                                        className={\`snap-center shrink-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl \${isSelected ? 'w-14 h-14 sm:w-16 sm:h-16 rounded-full text-white' : 'w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/90 text-gray-700 hover:scale-110'}\`}
                                        style={isSelected ? { backgroundColor: item.dayColor, transform: 'scale(1.1)' } : {}}
                                    >
                                        <span className="text-[9px] sm:text-[10px] font-bold opacity-90 leading-none mb-0.5">D.{item.day}</span>
                                        <span className={\`text-sm sm:text-base font-black leading-none \${isSelected ? 'text-white' : 'text-gray-900'}\`}>{item.placeIdx + 1}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Edit Mode Overlay container */}
                {isEditMode && (
                    <div className="absolute bottom-[100px] left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-[24px] shadow-2xl z-20 max-h-[50vh] overflow-y-auto custom-scrollbar border border-white/50">
                        <h3 className="font-black text-rose-500 mb-3 flex items-center gap-1"><Pencil size={18} /> 편집 모드 (리스트 뷰)</h3>
                        {tripPlan.itinerary?.map((dayItem, dayIdx) => (
                            <div key={dayIdx} className="mb-6">
                                <h4 className="font-bold text-sm bg-gray-100 inline-block px-2 py-1 rounded text-gray-700 mb-2">Day {dayItem.day}</h4>
                                <div className="space-y-3">
                                {dayItem.places.map((place, placeIdx) => (
                                    <div key={placeIdx} className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1.5 border-b border-indigo-200 outline-none bg-indigo-50/50 rounded-t" placeholder="장소명" />
                                            <button onClick={() => handleUpdateLocation(dayIdx, placeIdx, place.name)} className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"><Search size={14} /></button>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleMovePlace(dayIdx, placeIdx, -1)} disabled={placeIdx === 0} className="flex-1 py-1 rounded bg-gray-50 flex justify-center disabled:opacity-30"><ArrowUp size={14} /></button>
                                            <button onClick={() => handleMovePlace(dayIdx, placeIdx, 1)} disabled={placeIdx === dayItem.places.length - 1} className="flex-1 py-1 rounded bg-gray-50 flex justify-center disabled:opacity-30"><ArrowDown size={14} /></button>
                                            <button onClick={() => handleDeletePlace(dayIdx, placeIdx)} className="flex-1 py-1 bg-red-50 text-red-500 rounded flex justify-center items-center"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                                </div>
                                <button onClick={() => handleAddPlace(dayIdx)} className="w-full mt-3 py-2 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 text-xs font-bold flex items-center justify-center gap-1 hover:bg-indigo-50"><Plus size={14} /> 장소 추가</button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bottom Center Gradient for fade effect */}
                <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10"></div>

                {/* Save Button */}
                {!tripId && (
                    <div className="absolute bottom-[90px] right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-l-xl rounded-t-xl shadow-lg pointer-events-auto relative">일정 저장하기<div className="absolute -bottom-1 right-1 w-3 h-3 bg-indigo-600 transform rotate-45"></div></div>
                        <button onClick={handleSaveClick} disabled={isSaving} className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white pointer-events-auto hover:bg-indigo-500 transition-transform active:scale-95 border border-indigo-400">
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} strokeWidth={2.5} />}
                        </button>
                    </div>
                )}

                {/* Floating Bottom Navigation */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] z-50 pointer-events-auto">
                    <nav className="bg-white/20 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[28px] py-3 px-2 flex justify-around items-center">
                        <button onClick={handleReset} className="flex flex-col items-center gap-1 p-1 w-[60px] text-white/80 hover:text-white transition active:scale-95">
                            <Home size={22} /><span className="text-[10px] font-bold">홈으로</span>
                        </button>
                        <button onClick={handleKakaoConsult} className="flex flex-col items-center gap-1 p-1 w-[60px] text-yellow-300 hover:text-yellow-400 transition active:scale-95 text-center">
                            <MessageCircle size={22} /><span className="text-[10px] font-bold leading-tight">카톡<br/>상담</span>
                        </button>
                        <button onClick={handleShare} className="flex flex-col items-center gap-1 p-1 w-[60px] text-white/80 hover:text-white transition active:scale-95">
                            <Share2 size={22} /><span className="text-[10px] font-bold">공유하기</span>
                        </button>
                        <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1 p-1 w-[60px] text-blue-300 hover:text-blue-400 transition active:scale-95 relative">
                            {loadingAction === 'pdf' ? <Loader2 className="animate-spin text-white mb-1" size={20} /> : <Download size={22} />}
                            <span className="text-[10px] font-bold">PDF저장</span>
                        </button>
                    </nav>
                </div>

                {/* Info Modal (Budget, Hotels, Tips) */}
                {showInfoModal && (
                    <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}></div>
                        <div className="bg-white w-full sm:w-[90%] h-[75vh] sm:h-[80vh] rounded-t-[32px] sm:rounded-[32px] relative z-10 shadow-2xl flex flex-col p-5 animate-in slide-in-from-bottom-full sm:zoom-in-95">
                            <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <X size={18} />
                            </button>
                            <h2 className="text-xl font-black mb-4 pr-10 text-gray-800 flex items-center gap-2"><Sparkles className="text-rose-500" size={20}/> 여행 꿀정보</h2>
                            
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                <button onClick={() => setInfoModalTab('budget')} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${infoModalTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}\`}>예산</button>
                                <button onClick={() => setInfoModalTab('hotels')} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${infoModalTab === 'hotels' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}\`}>추천 숙소</button>
                                <button onClick={() => setInfoModalTab('tips')} className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${infoModalTab === 'tips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}\`}>팁 & 날씨</button>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
                                {infoModalTab === 'budget' && (
                                    <div className="space-y-3">
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center mb-4">
                                            <span className="font-bold text-indigo-800">총 예상 비용</span>
                                            <span className="font-black text-indigo-600 text-lg">{estimatedCost || "예산 정보 없음"}</span>
                                        </div>
                                        {tripPlan.budgetBreakdown?.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">{idx+1}</div>
                                                <p className="flex-1 text-sm font-medium text-gray-700">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {infoModalTab === 'hotels' && (
                                    <div className="space-y-4">
                                        {hotels.length > 0 ? hotels.map((hotel, idx) => (
                                            <div key={idx} className="place-card bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group" onClick={() => { const link = getKlookLink(\`\${hotel.name} \${userInfo?.destination || ""}\`, '695932'); window.open(link, '_blank'); }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">추천 {idx + 1}</span>
                                                    <h4 className="font-bold text-sm">{hotel.name}</h4>
                                                </div>
                                                <p className="text-xs text-indigo-500 font-bold mb-2 bg-indigo-50 self-start inline-block px-2 py-1 rounded-lg">{hotel.priceRange}</p>
                                                <p className="text-xs text-gray-500 leading-relaxed">{hotel.description}</p>
                                                <button className="w-full mt-3 bg-gray-50 hover:bg-rose-50 text-gray-700 hover:text-rose-500 border border-gray-200 hover:border-rose-200 text-xs font-bold py-2 rounded-xl transition flex justify-center items-center gap-1">Klook 예약하러 가기 <ExternalLink size={12}/></button>
                                            </div>
                                        )) : <div className="text-center text-gray-500 p-10 text-sm">추천 숙소 정보가 없습니다.</div>}
                                    </div>
                                )}
                                {infoModalTab === 'tips' && (
                                    <div className="space-y-4">
                                        {weather && (
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
                                                <div className="bg-white p-3 rounded-full text-amber-500 shadow-sm shrink-0"><Sun size={24} /></div>
                                                <div>
                                                    <p className="font-black text-blue-900 mb-1">날씨 정보</p>
                                                    <p className="text-sm text-blue-800 leading-relaxed">{weather}</p>
                                                </div>
                                            </div>
                                        )}
                                        {travelTips && travelTips.length > 0 && (
                                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-start gap-4">
                                                <div className="bg-white p-3 rounded-full text-amber-500 shadow-sm shrink-0"><Lightbulb size={24} /></div>
                                                <div>
                                                    <p className="font-black text-amber-900 mb-2">여행 꿀팁</p>
                                                    <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                                                        {travelTips.map((tip, i) => <li key={i}>{tip}</li>)}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* 매칭 모달 (원본 유지) */}
                {showMatchModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMatchModal(false)}></div>
                        <div className="bg-white/90 backdrop-blur-2xl w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl animate-in zoom-in-95">
                            <button onClick={() => setShowMatchModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
                            <div className="text-center mb-6 mt-2">
                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 animate-bounce"><Sparkles size={32} className="text-white" /></div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">여행 메이트 추천</h3>
                                <p className="text-sm text-gray-500 font-bold">비슷한 성향의 여행자를 찾았어요!</p>
                            </div>
                            <div className="space-y-3 mb-6">
                                {realMates.map(mate => (
                                    <div key={mate.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={mate.profileImgBase64 || "https://i.pravatar.cc/150?u=" + mate.id} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-50" />
                                            <div><p className="font-bold text-gray-900">{mate.name}</p><p className="text-[10px] text-gray-400 font-bold truncate max-w-[120px]">{mate.bio || "반가워요!"}</p></div>
                                        </div>
                                        <button onClick={() => handleRequestRealMate(mate)} className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition"><Send size={16} /></button>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setShowMatchModal(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3.5 rounded-2xl">나중에 할게요</button>
                        </div>
                    </div>
                )}

                {/* 저장 모달 (원본 유지) */}
                {showSaveModal && (
                    <div className="absolute inset-0 z-[70] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}></div>
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 relative z-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95">
                            <button onClick={() => setShowSaveModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><X size={18} /></button>
                            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg"><Save size={32} /></div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">일정을 저장할까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 text-center">저장된 일정은 마이페이지에서<br />수정할 수 있어요.</p>
                            <div onClick={() => setShareToFeed(!shareToFeed)} className={\`w-full p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all mb-6 \${shareToFeed ? 'border-rose-500 bg-rose-50' : 'border-gray-200 bg-gray-50'}\`}>
                                <div className={\`w-6 h-6 rounded-md flex items-center justify-center \${shareToFeed ? 'bg-rose-500 text-white' : 'bg-gray-300'}\`}><Check size={16} strokeWidth={3} /></div>
                                <div className="text-left flex-1"><p className={\`text-sm font-bold \${shareToFeed ? 'text-rose-600' : 'text-gray-600'}\`}>여행자 피드 공유 (100P 적립)</p><p className="text-[10px] text-gray-400">다른 여행자들에게 영감을 주세요!</p></div>
                            </div>
                            <button onClick={executeSave} disabled={isSaving} className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-2xl shadow-xl hover:bg-black transition">{isSaving ? <Loader2 className="animate-spin" size={20} /> : "저장 완료"}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* PDF 템플릿 영역 (안보임) */}
`;

    // Extract the end original template
    const pdfHook = '            {/* ✨ [중요] PDF 변환용 상세 템플릿 (원본 누락 없이 복구) */}';
    let pdfBlockIndex = content.indexOf(pdfHook);
    if (pdfBlockIndex !== -1) {
        const remainingContent = content.substring(pdfBlockIndex);
        content = content.substring(0, returnBlockIndex) + newReturn + remainingContent;
    }
}

fs.writeFileSync(filepath, content, 'utf8');
console.log('Update complete.');
