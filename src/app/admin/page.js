'use client';

import { useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Trash2, Plus, Search, MapPin, Calendar, Crown, Sparkles, Lock, ArrowLeft, Check, FileSpreadsheet, Upload, Download } from 'lucide-react';
import AIResult from '../../components/AIResult';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from 'xlsx';

// --- 옵션 데이터 ---
const companionOptions = [
    { id: '혼자', label: '나홀로' },
    { id: '연인', label: '연인' },
    { id: '친구', label: '친구' },
    { id: '가족', label: '가족' },
    { id: '비즈니스', label: '출장' },
];

export default function AdminPage() {
    // --- 상태 관리 ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // 엑셀 업로드용 Ref
    const fileInputRef = useRef(null);

    // 뷰 모드
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [viewMode, setViewMode] = useState('welcome');

    // 생성 폼 상태
    const [createLoading, setCreateLoading] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, contact: "",
    });

    // --- 1. 로그인 & 데이터 불러오기 ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'hong0572!') {
            setIsLoggedIn(true);
            fetchTrips();
        } else { alert('비밀번호가 틀렸습니다!'); }
    };

    const fetchTrips = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrips(list);
        } catch (error) { console.error("Error:", error); }
        finally { setLoading(false); }
    };

    // 🔥 삭제 기능
    const handleDelete = async (e, id) => {
        if (e) e.stopPropagation();
        if (!confirm('⚠️ 정말 이 여행 일정을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) return;

        try {
            await deleteDoc(doc(db, "trips", id));
            setTrips(prev => prev.filter(trip => trip.id !== id));
            if (selectedTripId === id) {
                setSelectedTripId(null);
                setViewMode('welcome');
            }
            alert("삭제되었습니다.");
        } catch (error) {
            console.error(error);
            alert('삭제 실패: ' + error.message);
        }
    };

    // --- 2. 엑셀 기능 (다운로드 & 업로드) ---

    // 📤 [복구됨] 엑셀 다운로드 (선택된 일정만)
    const handleExportExcel = () => {
        if (!selectedTripId) {
            alert("먼저 왼쪽 목록에서 엑셀로 저장할 일정을 선택해주세요!");
            return;
        }
        const trip = trips.find(t => t.id === selectedTripId);
        if (!trip) return;

        const excelData = [];

        // 상세 일정 데이터 변환
        if (trip.itinerary && Array.isArray(trip.itinerary)) {
            trip.itinerary.forEach(dayItem => {
                if (dayItem.places && Array.isArray(dayItem.places)) {
                    dayItem.places.forEach(place => {
                        excelData.push({
                            "여행 제목": trip.tripTitle || "제목 없음",
                            "여행지": trip.destination || "",
                            "연락처": trip.contactInfo || "",
                            "시작일": trip.startDate || "",
                            "종료일": trip.endDate || "",
                            "Day": dayItem.day,
                            "날짜": dayItem.date,
                            "순서": place.order,
                            "장소명": place.name,
                            "카테고리": place.category,
                            "설명": place.description,
                            "위도": place.coordinates?.lat || "",
                            "경도": place.coordinates?.lng || ""
                        });
                    });
                }
            });
        } else {
            excelData.push({
                "여행 제목": trip.tripTitle || "제목 없음",
                "비고": "상세 일정 없음"
            });
        }

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "여행일정");

        const safeTitle = (trip.tripTitle || "여행일정").replace(/[\/\\?%*:|"<>]/g, '_');
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `${safeTitle}_(${trip.contactInfo || '고객'})_${dateStr}.xlsx`);
    };

    // 📥 엑셀 업로드 (파일 1개 = 여행 1개)
    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                setLoading(true);
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("엑셀 파일에 데이터가 없습니다.");
                    return;
                }

                // 🔥 [수정] 첫 번째 행 제목 기준 통합
                const firstRow = data[0];
                const tripTitle = firstRow["여행 제목"] || "제목 없음 (엑셀)";

                const tripData = {
                    tripTitle: tripTitle,
                    destination: firstRow["여행지"] || "",
                    contactInfo: firstRow["연락처"] || "",
                    startDate: firstRow["시작일"] || "",
                    endDate: firstRow["종료일"] || "",
                    createdAt: serverTimestamp(),
                    isEdited: true,
                    itinerary: []
                };

                data.forEach(row => {
                    const day = row["Day"];
                    if (!day) return;

                    let dayItem = tripData.itinerary.find(d => d.day === day);
                    if (!dayItem) {
                        dayItem = {
                            day: day,
                            date: row["날짜"] || `Day ${day}`,
                            places: []
                        };
                        tripData.itinerary.push(dayItem);
                    }

                    if (row["장소명"]) {
                        dayItem.places.push({
                            order: row["순서"] || dayItem.places.length + 1,
                            name: row["장소명"],
                            category: row["카테고리"] || "기타",
                            description: row["설명"] || "",
                            coordinates: {
                                lat: parseFloat(row["위도"]) || 37.5665,
                                lng: parseFloat(row["경도"]) || 126.9780
                            }
                        });
                    }
                });

                if (tripData.itinerary.length > 0) {
                    tripData.itinerary.sort((a, b) => a.day - b.day);
                    tripData.itinerary.forEach(d => d.places.sort((a, b) => a.order - b.order));
                }

                await addDoc(collection(db, "trips"), tripData);
                alert(`'${tripTitle}' 일정이 생성되었습니다!`);
                fetchTrips();

            } catch (error) {
                console.error("Excel Import Error:", error);
                alert("엑셀 파일 처리 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsBinaryString(file);
    };


    // --- 3. 생성 및 렌더링 로직 ---
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };
    const handleDateChange = (update) => {
        setDateRange(update);
        const [start, end] = update;
        if (start && end) {
            const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) { alert("최대 30일까지만 가능합니다."); setDateRange([start, null]); return; }
            const format = (d) => d.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, startDate: format(start), endDate: format(end) }));
        } else {
            setFormData(prev => ({ ...prev, startDate: start ? start.toISOString().split('T')[0] : "", endDate: "" }));
        }
    };

    const generatePlanAI = async () => {
        if (!formData.destination || !formData.startDate || !formData.endDate || !formData.contact) {
            alert("필수 항목(여행지, 날짜, 연락처)을 모두 입력해주세요."); return;
        }
        setCreateLoading(true);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, isLuxury }),
            });
            const data = await response.json();
            if (data.result) {
                setFormData(prev => ({ ...prev, resultData: data.result }));
                setViewMode('generated_preview');
            } else { alert("생성 실패: " + data.error); }
        } catch (error) { console.error(error); alert("서버 오류"); }
        finally { setCreateLoading(false); }
    };

    const filteredTrips = trips.filter(t =>
        t.tripTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.contactInfo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getSelectedTripData = () => trips.find(t => t.id === selectedTripId);

    if (!isLoggedIn) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-80 text-center">
                <div className="bg-rose-100 p-3 rounded-full inline-block mb-4"><Lock className="text-[#FF5A5F]" size={24} /></div>
                <h2 className="text-xl font-bold mb-4">관리자 로그인</h2>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl mb-4" placeholder="비밀번호" autoFocus />
                <button className="w-full bg-[#FF5A5F] text-white py-3 rounded-xl font-bold">접속하기</button>
            </form>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            {/* 왼쪽 사이드바 */}
            <div className="w-full sm:w-[350px] flex flex-col border-r border-gray-200 bg-white shrink-0 h-full">
                <div className="p-5 border-b border-gray-100 bg-white z-10">
                    <h1 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                        ✈️ 여행 관리자 <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{trips.length}</span>
                    </h1>

                    {/* ✨ 엑셀 버튼 그룹 (다운로드 & 등록) */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={handleExportExcel}
                            className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                            title="선택된 일정 엑셀로 저장"
                        >
                            <Download size={14} /> 엑셀 다운로드
                        </button>
                        <button
                            onClick={() => fileInputRef.current.click()}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition shadow-sm"
                            title="엑셀 파일 업로드"
                        >
                            <Upload size={14} /> 엑셀 등록
                        </button>
                        <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportExcel} />
                    </div>

                    <button onClick={() => { setViewMode('create'); setSelectedTripId(null); }} className="w-full py-3 bg-[#FF5A5F] hover:bg-[#FF3D43] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-sm mb-3">
                        <Plus size={18} /> 새 일정 만들기 (AI)
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="제목 또는 연락처 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-300 transition" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? <div className="text-center py-10 text-gray-400">로딩 중...</div> :
                        filteredTrips.map(trip => (
                            <div key={trip.id} onClick={() => { setSelectedTripId(trip.id); setViewMode('edit'); }} className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md group relative ${selectedTripId === trip.id ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300' : 'bg-white border-gray-100 hover:border-rose-200'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-1 pr-6">{trip.tripTitle || '제목 없음'}</h3>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{trip.createdAt?.toDate ? trip.createdAt.toDate().toLocaleDateString() : '-'}</span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2 truncate">📞 {trip.contactInfo}</p>
                                <div className="flex items-center gap-2">
                                    {trip.isEdited && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">수정됨</span>}
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{trip.destination}</span>
                                </div>
                                {/* 삭제 버튼 */}
                                <button onClick={(e) => handleDelete(e, trip.id)} className="absolute top-4 right-3 text-gray-300 hover:text-red-600 p-2 transition z-20">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                </div>
            </div>

            {/* 오른쪽 작업 영역 */}
            <div className="flex-1 bg-gray-50 h-full overflow-hidden relative">
                {viewMode === 'welcome' && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <FileSpreadsheet size={64} className="mb-4 text-gray-200" />
                        <p className="text-lg font-medium">왼쪽에서 일정을 선택하거나</p>
                        <p className="text-sm">엑셀 업로드로 대량 등록도 가능합니다.</p>
                    </div>
                )}

                {viewMode === 'create' && (
                    <div className="h-full overflow-y-auto p-8 max-w-3xl mx-auto">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
                                <Plus className="text-[#FF5A5F]" /> 새 여행 일정 생성 (AI)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label className="text-sm font-bold text-gray-600 mb-2 block"><MapPin size={14} className="inline text-[#FF5A5F]" /> 여행지</label><input type="text" name="destination" value={formData.destination} onChange={handleInputChange} placeholder="예: 도쿄, 제주도" className="w-full p-3 border rounded-xl font-bold outline-none focus:border-rose-400" /></div>
                                <div><label className="text-sm font-bold text-gray-600 mb-2 block"><Calendar size={14} className="inline text-[#FF5A5F]" /> 날짜 선택</label><DatePicker selectsRange startDate={startDate} endDate={endDate} onChange={handleDateChange} className="w-full p-3 border rounded-xl font-bold outline-none focus:border-rose-400 cursor-pointer" placeholderText="기간 선택" dateFormat="yyyy.MM.dd" /></div>
                            </div>
                            <div className="mb-6"><label className="text-sm font-bold text-gray-600 mb-2 block">동행자</label><div className="flex flex-wrap gap-2">{companionOptions.map(opt => (<button key={opt.id} onClick={() => setFormData({ ...formData, companion: opt.id })} className={`px-4 py-2 rounded-lg text-sm font-bold border ${formData.companion === opt.id ? 'bg-[#FF5A5F] text-white border-[#FF5A5F]' : 'bg-gray-50 text-gray-500'}`}>{opt.label}</button>))}</div></div>
                            <button onClick={() => setIsLuxury(!isLuxury)} className={`w-full py-3 rounded-xl font-bold text-sm mb-6 border flex items-center justify-center gap-2 ${isLuxury ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-500'}`}><Crown size={16} /> {isLuxury ? '초호화 럭셔리 모드 ON' : '초호화 럭셔리 모드 OFF'}</button>
                            <div className="mb-8"><label className="text-sm font-bold text-gray-600 mb-2 block">고객 연락처 (DB 저장용)</label><input type="text" name="contact" value={formData.contact} onChange={handleInputChange} placeholder="예: 010-1234-5678" className="w-full p-3 border rounded-xl font-bold outline-none focus:border-rose-400" /></div>
                            <button onClick={generatePlanAI} disabled={createLoading} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition shadow-lg flex items-center justify-center gap-2">{createLoading ? '일정 생성 중...' : <><Sparkles size={20} /> AI로 일정 생성하기</>}</button>
                        </div>
                    </div>
                )}
                {viewMode === 'generated_preview' && formData.resultData && (
                    <div className="h-full w-full"><div className="h-full flex flex-col"><div className="p-4 bg-white border-b flex justify-between items-center shrink-0"><h2 className="font-bold text-green-600 flex items-center gap-2"><Check size={18} /> 생성 완료! 하단 [공유] 버튼을 눌러 저장하세요.</h2><button onClick={() => { setViewMode('create'); setFormData(prev => ({ ...prev, resultData: null })) }} className="text-sm text-gray-500 hover:text-black">닫기</button></div><div className="flex-1 overflow-hidden"><AIResult data={formData.resultData} userInfo={formData} tripId={null} /></div></div></div>
                )}
                {/* 수정 모드 (상세 화면에도 삭제 버튼 추가) */}
                {viewMode === 'edit' && selectedTripId && (
                    <div className="h-full w-full flex flex-col">
                        <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20">
                            <span className="text-xs font-bold text-gray-400">수정 모드: {getSelectedTripData()?.tripTitle}</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleDelete(null, selectedTripId)} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded">
                                    <Trash2 size={12} /> 삭제
                                </button>
                                <a href={`/share/${selectedTripId}`} target="_blank" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"><ArrowLeft size={10} /> 고객용 화면 보기</a>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative"><AIResult data={getSelectedTripData()} userInfo={{ contact: getSelectedTripData()?.contactInfo }} tripId={selectedTripId} /></div>
                    </div>
                )}
            </div>
        </div>
    );
}