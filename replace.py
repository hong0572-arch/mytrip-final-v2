import os

filepath = r"src\components\AIResult.js"
with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add definitions
target1 = """    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);

    // ✨ 카카오 SDK 초기화 (누락 방지)"""

replacement1 = """    const scrollContainerRef = useRef(null);
    const observerRef = useRef(null);

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
            
            const contentString = `
                <div style="padding: 10px; max-width: 250px; font-family: sans-serif;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                        <h3 style="font-weight: bold; font-size: 15px; margin: 0; color: #111827;">${place.name}</h3>
                        <span style="font-size: 10px; background: #f3f4f6; padding: 2px 6px; border-radius: 12px; color: #6b7280; white-space: nowrap; margin-left: 8px;">${place.category || '기타'}</span>
                    </div>
                    <p style="font-size: 12px; color: #4b5563; margin-top: 6px; margin-bottom: 8px; line-height: 1.4;">${place.description}</p>
                    ${place.reason ? `<div style="font-size: 11px; color: #FF5A5F; background: #FFF0F0; padding: 6px 8px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #FFE4E6;"><strong>💡 냥프로의 픽!</strong><br />${place.reason}</div>` : ''}
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&hl=${language}" target="_blank" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #4f46e5; background: #e0e7ff; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center;">🗺️ 길찾기</a>
                        ${(!place.category?.includes("Restaurant") && !place.category?.includes("Cafe")) ? `<a href="${getKlookLink(place.name, '', language)}" target="_blank" style="text-decoration: none; font-size: 11px; font-weight: bold; color: #e11d48; background: #ffe4e6; padding: 6px 10px; border-radius: 6px; flex: 1; text-align: center;">🎟️ 티켓 예매</a>` : ''}
                    </div>
                </div>
            `;
            infoWindowRef.current.setContent(contentString);
            if (marker) {
                infoWindowRef.current.open(googleMapRef.current, marker);
            }
        }
    }, [selectedIndex, flatPlaces, language]);

    // ✨ 카카오 SDK 초기화 (누락 방지)"""

content = content.replace(target1, replacement1)

# 2. Add marker listener
target2 = """                        const marker = new google.maps.Marker({ position: place.coordinates, map, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 }, label: { text: (placeIdx + 1).toString(), color: "white", fontWeight: "bold", fontSize: "12px" }, zIndex: 100 + index });
                        markersRef.current.push(marker);"""

replacement2 = """                        const marker = new google.maps.Marker({ position: place.coordinates, map, icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: dayColor, fillOpacity: 1, strokeColor: "white", strokeWeight: 2, scale: 12 }, label: { text: (placeIdx + 1).toString(), color: "white", fontWeight: "bold", fontSize: "12px" }, zIndex: 100 + index });
                        marker.addListener('click', () => {
                            let fIdx = 0;
                            for (let i = 0; i < index; i++) {
                                fIdx += tripPlan.itinerary[i].places.length;
                            }
                            fIdx += placeIdx;
                            setSelectedIndex(fIdx);
                        });
                        markersRef.current.push(marker);"""

content = content.replace(target2, replacement2)

# 3. Replace return block (everything between '    return (' and PDF block)
start_str = '    return (\n        <div className="min-h-screen bg-gray-100 flex justify-center items-start sm:items-center overflow-hidden relative font-sans">'
end_str = '            {/* ✨ [중요] PDF 변환용 상세 템플릿 (원본 누락 없이 복구) */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

new_return = r"""    return (
        <div className="min-h-[100dvh] bg-black flex justify-center items-start sm:items-center overflow-hidden relative font-sans">
            <div id={CAPTURE_ID} className="w-full max-w-[480px] h-[100dvh] sm:h-[95vh] sm:rounded-[30px] bg-gray-50 relative shadow-2xl overflow-hidden flex flex-col border border-gray-800">

                {/* Full screen Map */}
                <div className="absolute inset-0 z-0 bg-gray-900 pointer-events-auto">
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

                {/* Right Top Buttons */}
                <div className="absolute top-8 right-5 z-50 pointer-events-auto flex flex-col gap-3">
                    <button onClick={() => router.push('/mypage')} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-indigo-600 transition border border-white/30" title="마이페이지">
                        <User size={20} />
                    </button>
                    <button onClick={() => setShowInfoModal(true)} className="bg-white/20 backdrop-blur-md p-2.5 rounded-full shadow-lg text-white hover:bg-white hover:text-rose-500 transition animate-pulse border border-rose-400/50" title="여행 정보">
                        <Sparkles size={20} className="text-rose-200" />
                    </button>
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`backdrop-blur-md p-2.5 rounded-full shadow-lg transition border border-white/30 ${isEditMode ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white hover:bg-white hover:text-indigo-600'}`}>
                        {isEditMode ? <Check size={20} /> : <Pencil size={20} />}
                    </button>
                </div>

                {/* Right Side Dial Component */}
                {!isEditMode && (
                    <div className="absolute right-0 top-[20%] h-[60%] w-20 sm:w-24 z-20 pointer-events-none flex flex-col">
                        <div className="h-full overflow-y-auto custom-scrollbar-hide scroll-smooth flex flex-col items-center py-[25vh] space-y-4 snap-y snap-mandatory pointer-events-auto" id="dial-scroll-container">
                            {flatPlaces.map((item, i) => {
                                const isSelected = i === selectedIndex;
                                return (
                                    <div 
                                        key={i} 
                                        onClick={() => setSelectedIndex(i)}
                                        className={`snap-center shrink-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl border-2 ${isSelected ? 'w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white border-white scale-110 z-10' : 'w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/90 text-gray-700 border-transparent hover:scale-105 opacity-80'}`}
                                        style={isSelected ? { backgroundColor: item.dayColor } : {}}
                                    >
                                        <span className="text-[10px] sm:text-xs font-bold opacity-90 leading-none mb-1">D.{item.day}</span>
                                        <span className={`text-base sm:text-xl font-black leading-none ${isSelected ? 'text-white' : 'text-gray-900'}`}>{item.placeIdx + 1}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Edit Mode Overlay container */}
                {isEditMode && (
                    <div className="absolute bottom-[100px] left-4 right-4 bg-white/95 backdrop-blur-xl p-4 rounded-[24px] shadow-2xl z-20 max-h-[50vh] overflow-y-auto custom-scrollbar border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-indigo-600 flex items-center gap-1"><Pencil size={18} /> 일정 편집</h3>
                            <button onClick={(e) => { e.stopPropagation(); handleAutoFixAll(); }} disabled={loadingAction === 'autoFix'} className="bg-violet-100 text-violet-600 py-1 px-3 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-violet-200" title="위치 보정">
                                {loadingAction === 'autoFix' ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} 전체 경로 재탐색
                            </button>
                        </div>
                        {tripPlan.itinerary?.map((dayItem, dayIdx) => (
                            <div key={dayIdx} className="mb-6">
                                <h4 className="font-bold text-sm bg-gray-100 inline-block px-2 py-1 rounded text-gray-700 mb-2">Day {dayItem.day}</h4>
                                <div className="space-y-3">
                                {dayItem.places.map((place, placeIdx) => (
                                    <div key={placeIdx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex gap-2 mb-2">
                                            <input type="text" value={place.name} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'name', e.target.value)} className="flex-1 font-bold text-sm p-1.5 border-b border-indigo-200 outline-none bg-indigo-50/50 rounded-t" placeholder="장소명" />
                                            <button onClick={() => handleUpdateLocation(dayIdx, placeIdx, place.name)} className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"><Search size={14} /></button>
                                        </div>
                                        <textarea value={place.description} onChange={(e) => handleEditChange(dayIdx, placeIdx, 'description', e.target.value)} className="w-full text-xs p-1.5 border border-gray-200 rounded bg-gray-50 h-12 resize-none mb-2" placeholder="설명" />
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
                <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none z-10"></div>

                {/* Save Button */}
                {!tripId && (
                    <div className="absolute bottom-[90px] right-6 z-40 flex flex-col items-end gap-2 pointer-events-none">
                        <div className="bg-indigo-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-l-xl rounded-t-xl shadow-lg pointer-events-auto relative">저장하기<div className="absolute -bottom-1 right-1 w-3 h-3 bg-indigo-600 transform rotate-45"></div></div>
                        <button onClick={handleSaveClick} disabled={isSaving} className="w-14 h-14 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white pointer-events-auto hover:bg-indigo-500 transition-transform active:scale-95 border-2 border-white">
                            {isSaving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} strokeWidth={2.5} />}
                        </button>
                    </div>
                )}

                {/* Floating Bottom Navigation */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[90%] sm:w-[85%] z-50 pointer-events-auto">
                    <nav className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-[32px] py-2 px-2 flex justify-around items-center">
                        <button onClick={handleReset} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-rose-400 transition active:scale-95">
                            <Home size={22} /><span className="text-[10px] font-bold">홈으로</span>
                        </button>
                        <button onClick={handleKakaoConsult} className="flex flex-col items-center gap-1 p-2 w-[65px] text-yellow-400 hover:text-yellow-300 transition active:scale-95 text-center">
                            <MessageCircle size={22} /><span className="text-[10px] font-bold">카톡상담</span>
                        </button>
                        <button onClick={handleShare} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-indigo-400 transition active:scale-95">
                            <Share2 size={22} /><span className="text-[10px] font-bold">공유하기</span>
                        </button>
                        <button onClick={handleDownloadPDF} className="flex flex-col items-center gap-1 p-2 w-[65px] text-white hover:text-blue-400 transition active:scale-95 relative">
                            {loadingAction === 'pdf' ? <Loader2 className="animate-spin text-white mb-1" size={20} /> : <Download size={22} />}
                            <span className="text-[10px] font-bold">PDF저장</span>
                        </button>
                    </nav>
                </div>

                {/* Info Modal (Budget, Hotels, Tips) */}
                {showInfoModal && (
                    <div className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}></div>
                        <div className="bg-white w-full sm:w-[90%] h-[75vh] sm:h-[80vh] rounded-t-[32px] sm:rounded-[32px] relative z-20 shadow-2xl flex flex-col p-5 animate-in slide-in-from-bottom-full sm:zoom-in-95">
                            <button onClick={() => setShowInfoModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                <X size={18} />
                            </button>
                            <h2 className="text-xl font-black mb-4 pr-10 text-gray-800 flex items-center gap-2"><Sparkles className="text-rose-500" size={20}/> 여정 꿀팁 박스</h2>
                            
                            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                                <button onClick={() => setInfoModalTab('budget')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'budget' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>예산</button>
                                <button onClick={() => setInfoModalTab('hotels')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'hotels' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>추천 숙소</button>
                                <button onClick={() => setInfoModalTab('tips')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${infoModalTab === 'tips' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}>팁 & 날씨</button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
                                {infoModalTab === 'budget' && (
                                    <div className="space-y-3">
                                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center mb-4">
                                            <span className="font-bold text-indigo-800">총 예상 비용</span>
                                            <span className="font-black text-indigo-600 text-lg">{estimatedCost || "예산 정보 없음"}</span>
                                        </div>
                                        {tripPlan.budgetBreakdown?.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                <div className="w-6 h-6 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-xs shrink-0">{idx+1}</div>
                                                <p className="flex-1 text-sm font-medium text-gray-700">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {infoModalTab === 'hotels' && (
                                    <div className="space-y-4">
                                        {hotels.length > 0 ? hotels.map((hotel, idx) => (
                                            <div key={idx} className="place-card bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative group cursor-pointer hover:border-indigo-500 transition-all" onClick={() => { const link = getKlookLink(`${hotel.name} ${userInfo?.destination || ""}`, '695932'); window.open(link, '_blank'); }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded-md">추천 {idx + 1}</span>
                                                    <h4 className="font-bold text-base">{hotel.name}</h4>
                                                </div>
                                                <p className="text-xs text-indigo-500 font-bold mb-2 bg-indigo-50 inline-block px-2 py-1 rounded-lg">{hotel.priceRange}</p>
                                                <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 p-2 rounded-lg">{hotel.description}</p>
                                                <div className="mt-3 flex justify-end">
                                                    <span className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">Klook 최저가 보기 <ExternalLink size={12}/></span>
                                                </div>
                                            </div>
                                        )) : <div className="text-center text-gray-400 p-10 text-sm font-medium">추천 숙소 정보가 없습니다.</div>}
                                    </div>
                                )}
                                {infoModalTab === 'tips' && (
                                    <div className="space-y-4">
                                        {weather && (
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-4">
                                                <div className="bg-white p-3 rounded-full text-amber-500 shadow-sm shrink-0"><Sun size={24} /></div>
                                                <div>
                                                    <p className="font-black text-blue-900 mb-1">날씨 정보</p>
                                                    <p className="text-sm text-blue-800 leading-relaxed">{weather}</p>
                                                </div>
                                            </div>
                                        )}
                                        {travelTips && travelTips.length > 0 && (
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-4">
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
"""

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_return + "\n" + content[end_idx:]
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("AIResult.js updated successfully!")
else:
    print("Could not find start or end index for block 3.")
