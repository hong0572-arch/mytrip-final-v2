'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, addDoc, serverTimestamp, updateDoc, increment, getDoc } from 'firebase/firestore';
import { Trash2, Plus, Search, MapPin, Calendar, Crown, Sparkles, Lock, ArrowLeft, Check, FileSpreadsheet, Upload, Download, User, Coins, Gift, AlertTriangle, UserX } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('trips'); // 'trips' | 'users' (탭 전환)

    // 여행 관련 상태
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [viewMode, setViewMode] = useState('welcome');

    // 회원 관련 상태
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [pointAmount, setPointAmount] = useState(0);

    // 생성 폼 상태
    const [createLoading, setCreateLoading] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, contact: "",
    });

    const fileInputRef = useRef(null);

    // --- 1. 로그인 & 데이터 불러오기 ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'hong0572!') {
            setIsLoggedIn(true);
            fetchTrips();
            fetchUsers();
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

    const fetchUsers = async () => {
        try {
            const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(list);
        } catch (error) { console.error("User Fetch Error:", error); }
    };

    // 🔥 포인트 지급/차감
    const handleUpdatePoints = async (amount, desc) => {
        if (!selectedUserId || !amount) return;
        if (!confirm(`${selectedUser.name}님에게 ${amount}P를 ${amount > 0 ? '지급' : '차감'}하시겠습니까?`)) return;

        try {
            const userRef = doc(db, "users", selectedUserId);
            await updateDoc(userRef, { points: increment(amount) });
            await addDoc(collection(db, "users", selectedUserId, "point_history"), {
                desc: desc || (amount > 0 ? "관리자 지급" : "관리자 차감"),
                amount: parseInt(amount),
                createdAt: serverTimestamp()
            });
            const updatedSnap = await getDoc(userRef);
            setSelectedUser({ id: updatedSnap.id, ...updatedSnap.data() });
            fetchUsers();
            setPointAmount(0);
            alert("처리되었습니다.");
        } catch (e) { console.error(e); alert("포인트 수정 실패"); }
    };

    // 🔥 [신규] 회원 강제 탈퇴 (삭제)
    const handleDeleteUser = async () => {
        if (!selectedUserId) return;
        const confirmMsg = `⚠️ 정말로 [${selectedUser.name}] 회원을 강제 탈퇴시키겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 회원의 모든 데이터(포인트 포함)가 삭제됩니다.`;
        if (!confirm(confirmMsg)) return;

        try {
            // Firestore 문서 삭제
            await deleteDoc(doc(db, "users", selectedUserId));

            // 목록 갱신 및 초기화
            setUsers(prev => prev.filter(u => u.id !== selectedUserId));
            setSelectedUserId(null);
            setSelectedUser(null);
            alert("회원이 정상적으로 탈퇴(삭제) 처리되었습니다.");
        } catch (error) {
            console.error(error);
            alert("회원 삭제 중 오류가 발생했습니다.");
        }
    };

    // 🔥 삭제 기능 (여행 일정)
    const handleDeleteTrip = async (e, id) => {
        if (e) e.stopPropagation();
        if (!confirm('⚠️ 정말 이 여행 일정을 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, "trips", id));
            setTrips(prev => prev.filter(trip => trip.id !== id));
            if (selectedTripId === id) { setSelectedTripId(null); setViewMode('welcome'); }
            alert("삭제되었습니다.");
        } catch (error) { console.error(error); alert('삭제 실패'); }
    };

    // --- 엑셀 및 기타 기능 (기존 유지) ---
    const handleExportExcel = () => {
        if (!selectedTripId) { alert("먼저 목록에서 일정을 선택해주세요!"); return; }
        const trip = trips.find(t => t.id === selectedTripId);
        if (!trip) return;
        const excelData = [];
        if (trip.itinerary && Array.isArray(trip.itinerary)) {
            trip.itinerary.forEach(dayItem => {
                if (dayItem.places) {
                    dayItem.places.forEach(place => {
                        excelData.push({
                            "여행 제목": trip.tripTitle, "여행지": trip.destination, "날짜": dayItem.date,
                            "장소명": place.name, "설명": place.description
                        });
                    });
                }
            });
        }
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "여행일정");
        XLSX.writeFile(wb, `${trip.tripTitle || '여행일정'}.xlsx`);
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                setLoading(true);
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) { alert("데이터 없음"); return; }
                const firstRow = data[0];
                const tripData = {
                    tripTitle: firstRow["여행 제목"] || "엑셀 업로드 일정",
                    destination: firstRow["여행지"] || "",
                    contactInfo: firstRow["연락처"] || "",
                    createdAt: serverTimestamp(),
                    itinerary: []
                };
                await addDoc(collection(db, "trips"), tripData);
                alert("업로드 완료");
                fetchTrips();
            } catch (e) { alert("업로드 실패"); }
            finally { setLoading(false); }
        };
        reader.readAsBinaryString(file);
    };

    const handleInputChange = (e) => { const { name, value } = e.target; setFormData({ ...formData, [name]: value }); };
    const handleDateChange = (update) => {
        setDateRange(update);
        const [start, end] = update;
        setFormData(prev => ({ ...prev, startDate: start ? start.toISOString().split('T')[0] : "", endDate: end ? end.toISOString().split('T')[0] : "" }));
    };
    const generatePlanAI = async () => {
        if (!formData.destination || !formData.contact) { alert("필수 항목 입력 필요"); return; }
        setCreateLoading(true);
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, isLuxury }),
            });
            const data = await response.json();
            if (data.result) { setFormData(prev => ({ ...prev, resultData: data.result })); setViewMode('generated_preview'); }
        } catch (e) { alert("생성 실패"); }
        finally { setCreateLoading(false); }
    };

    const filteredTrips = trips.filter(t => t.tripTitle?.includes(searchTerm) || t.contactInfo?.includes(searchTerm));
    const filteredUsers = users.filter(u => u.name?.includes(searchTerm) || u.email?.includes(searchTerm));
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
                <div className="flex p-2 gap-2 border-b border-gray-100 bg-gray-50">
                    <button onClick={() => { setActiveTab('trips'); setViewMode('welcome'); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'trips' ? 'bg-white shadow text-rose-500' : 'text-gray-400 hover:bg-gray-200'}`}>✈️ 여행 관리</button>
                    <button onClick={() => { setActiveTab('users'); setSelectedUserId(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'users' ? 'bg-white shadow text-indigo-500' : 'text-gray-400 hover:bg-gray-200'}`}>👥 회원 관리</button>
                </div>

                <div className="p-5 border-b border-gray-100 bg-white z-10">
                    <h1 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                        {activeTab === 'trips' ? `여행 목록 (${trips.length})` : `회원 목록 (${users.length})`}
                    </h1>

                    {activeTab === 'trips' ? (
                        <>
                            <div className="flex gap-2 mb-3">
                                <button onClick={handleExportExcel} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Download size={14} /> 엑셀 다운</button>
                                <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Upload size={14} /> 엑셀 등록</button>
                                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportExcel} />
                            </div>
                            <button onClick={() => { setViewMode('create'); setSelectedTripId(null); }} className="w-full py-3 bg-[#FF5A5F] hover:bg-[#FF3D43] text-white rounded-xl font-bold flex items-center justify-center gap-2 mb-3"><Plus size={18} /> 새 일정 (AI)</button>
                        </>
                    ) : (
                        <div className="bg-indigo-50 p-3 rounded-xl mb-3 text-xs text-indigo-700 font-bold">
                            💡 회원을 클릭하면 상세 관리 및 강제 탈퇴가 가능합니다.
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder={activeTab === 'trips' ? "제목/연락처 검색" : "이름/이메일 검색"} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-300 transition" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {activeTab === 'trips' ? (
                        filteredTrips.map(trip => (
                            <div key={trip.id} onClick={() => { setSelectedTripId(trip.id); setViewMode('edit'); }} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md relative ${selectedTripId === trip.id ? 'bg-rose-50 border-rose-300' : 'bg-white border-gray-100'}`}>
                                <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-gray-800 text-sm line-clamp-1">{trip.tripTitle}</h3><span className="text-[10px] text-gray-400">{trip.createdAt?.toDate ? trip.createdAt.toDate().toLocaleDateString() : '-'}</span></div>
                                <p className="text-xs text-gray-500 truncate">📞 {trip.contactInfo}</p>
                                <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="absolute top-4 right-3 text-gray-300 hover:text-red-600"><Trash2 size={16} /></button>
                            </div>
                        ))
                    ) : (
                        filteredUsers.map(u => (
                            <div key={u.id} onClick={() => { setSelectedUserId(u.id); setSelectedUser(u); }} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md ${selectedUserId === u.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
                                        {u.photo ? <img src={u.photo} alt="profile" /> : <User size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-800 text-sm">{u.name}</h3>
                                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-extrabold text-indigo-600">{u.points?.toLocaleString()} P</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 오른쪽 작업 영역 */}
            <div className="flex-1 bg-gray-50 h-full overflow-hidden relative">
                {!selectedTripId && !selectedUserId && viewMode === 'welcome' && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        {activeTab === 'trips' ? <FileSpreadsheet size={64} className="mb-4 text-gray-200" /> : <User size={64} className="mb-4 text-gray-200" />}
                        <p className="text-lg font-medium">왼쪽에서 항목을 선택해주세요.</p>
                    </div>
                )}

                {/* 🔥 회원 관리 상세 화면 (삭제 기능 추가됨) */}
                {activeTab === 'users' && selectedUser && (
                    <div className="h-full p-8 overflow-y-auto">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto relative">
                            {/* 탈퇴 버튼 (우측 상단) */}
                            <button
                                onClick={handleDeleteUser}
                                className="absolute top-8 right-8 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center gap-1 transition"
                            >
                                <UserX size={14} /> 회원 탈퇴시키기
                            </button>

                            <div className="flex items-center gap-4 mb-8 pb-8 border-b">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden text-2xl">
                                    {selectedUser.photo ? <img src={selectedUser.photo} className="w-full h-full object-cover" /> : selectedUser.name?.[0]}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold text-gray-900">{selectedUser.name}</h2>
                                    <p className="text-gray-500">{selectedUser.email}</p>
                                    <p className="text-xs text-gray-400 mt-1">UID: {selectedUser.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-indigo-50 p-6 rounded-2xl text-center">
                                    <p className="text-sm font-bold text-indigo-400 mb-1">현재 보유 포인트</p>
                                    <h3 className="text-4xl font-black text-indigo-600">{selectedUser.points?.toLocaleString()} P</h3>
                                </div>
                                <div className="bg-gray-50 p-6 rounded-2xl text-center">
                                    <p className="text-sm font-bold text-gray-400 mb-1">가입일</p>
                                    <h3 className="text-xl font-bold text-gray-700 mt-2">{selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : '-'}</h3>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-2xl p-6">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Gift size={18} className="text-rose-500" /> 포인트 관리</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleUpdatePoints(1000, "이벤트 지급")} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition shadow">+ 1,000P 지급</button>
                                    <button onClick={() => handleUpdatePoints(5000, "특별 지급")} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition shadow">+ 5,000P 지급</button>
                                </div>
                                <div className="mt-4 pt-4 border-t flex gap-2 items-center">
                                    <input type="number" placeholder="직접 입력 (예: -500)" className="flex-1 p-3 border rounded-xl" value={pointAmount} onChange={e => setPointAmount(e.target.value)} />
                                    <button onClick={() => handleUpdatePoints(Number(pointAmount), "관리자 수동 조정")} className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition">적용</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 여행 생성/수정/미리보기 모드는 기존 유지 */}
                {viewMode === 'create' && (
                    <div className="h-full overflow-y-auto p-8 max-w-3xl mx-auto">
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8">
                            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-[#FF5A5F]" /> 새 여행 일정 생성 (AI)</h2>
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
                    <div className="h-full w-full flex flex-col"><div className="p-4 bg-white border-b flex justify-between items-center shrink-0"><h2 className="font-bold text-green-600 flex items-center gap-2"><Check size={18} /> 생성 완료!</h2><button onClick={() => { setViewMode('create'); setFormData(prev => ({ ...prev, resultData: null })) }} className="text-sm text-gray-500 hover:text-black">닫기</button></div><div className="flex-1 overflow-hidden"><AIResult data={formData.resultData} userInfo={formData} tripId={null} /></div></div>
                )}
                {viewMode === 'edit' && selectedTripId && activeTab === 'trips' && (
                    <div className="h-full w-full flex flex-col">
                        <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20">
                            <span className="text-xs font-bold text-gray-400">수정 모드: {getSelectedTripData()?.tripTitle}</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleDeleteTrip(null, selectedTripId)} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded"><Trash2 size={12} /> 삭제</button>
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