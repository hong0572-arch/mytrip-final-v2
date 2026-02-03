'use client';

import { useState, useRef, useEffect } from 'react';
import { db } from '../../lib/firebase';
import {
    collection, query, orderBy, getDocs, deleteDoc, doc, addDoc,
    serverTimestamp, updateDoc, increment, getDoc, limit, collectionGroup
} from 'firebase/firestore';
import {
    Trash2, Plus, Search, MapPin, Calendar, Crown, Sparkles, Lock,
    ArrowLeft, Check, FileSpreadsheet, Upload, Download, User,
    Gift, UserX, LayoutDashboard, TrendingUp, ThumbsUp, Plane, X,
    Link as LinkIcon, Image as ImageIcon, ExternalLink
} from 'lucide-react';
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

// 기본 이미지
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop";

export default function AdminPage() {
    // --- 상태 관리 ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState('trips');

    const [trips, setTrips] = useState([]);
    const [rectrips, setRecTrips] = useState([]); // ✨ 변수명 변경 (recommendedTrips -> rectrips)
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTripId, setSelectedTripId] = useState(null);
    const [selectedTripData, setSelectedTripData] = useState(null);
    const [viewMode, setViewMode] = useState('welcome');

    const [showRecommendModal, setShowRecommendModal] = useState(false);
    const [customImageUrl, setCustomImageUrl] = useState('');

    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [pointAmount, setPointAmount] = useState(0);

    const [createLoading, setCreateLoading] = useState(false);
    const [dateRange, setDateRange] = useState([null, null]);
    const [startDate, endDate] = dateRange;
    const [isLuxury, setIsLuxury] = useState(false);
    const [formData, setFormData] = useState({
        destination: "", startDate: "", endDate: "", companion: "연인",
        people: 2, budget: 100, contact: "",
    });

    const fileInputRef = useRef(null);
    const recommendInputRef = useRef(null);
    const thumbnailInputRef = useRef(null);

    // --- 1. 로그인 & 데이터 로드 ---
    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'hong0572!') {
            setIsLoggedIn(true);
            fetchAllData();
        } else { alert('비밀번호가 틀렸습니다!'); }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // 전체 여행 로드
            const tripsQuery = query(collectionGroup(db, "itineraries"), orderBy("createdAt", "desc"), limit(50));
            const tripsSnap = await getDocs(tripsQuery);
            setTrips(tripsSnap.docs.map(doc => ({ id: doc.id, path: doc.ref.path, ...doc.data() })));

            // 회원 로드
            const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
            const usersSnap = await getDocs(usersQuery);
            setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // ✨ [수정] 추천 여행 로드 (rectrips 컬렉션 사용)
            const recQuery = query(collection(db, "rectrips"), orderBy("createdAt", "desc"));
            const recSnap = await getDocs(recQuery);
            setRecTrips(recSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (error) { console.error("Error:", error); }
        finally { setLoading(false); }
    };

    // --- AI 이미지 생성 ---
    const generateTravelImage = (city) => {
        const seed = Math.floor(Math.random() * 99999);
        const safePrompt = `travel photography of ${city}, landscape, beautiful scenery, 4k, realistic`;
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?nologo=true&seed=${seed}`;
    };

    // --- PC 이미지 업로드 ---
    const handleThumbnailUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("이미지 용량이 너무 큽니다. 1MB 이하의 이미지를 사용해주세요.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => { setCustomImageUrl(reader.result); };
        reader.readAsDataURL(file);
    };

    // --- 여행 선택 ---
    const handleSelectTrip = async (trip, isRecommended = false) => {
        setSelectedTripId(trip.id);
        setViewMode('edit');

        if (isRecommended && trip.tripPath) {
            try {
                const docRef = doc(db, trip.tripPath);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setSelectedTripData({ ...docSnap.data(), id: trip.id, originalId: docSnap.id, isLinked: true });
                } else {
                    alert("원본 데이터가 삭제된 것 같습니다.");
                    setSelectedTripData(trip);
                }
            } catch (error) { setSelectedTripData(trip); }
        } else {
            setSelectedTripData(trip);
        }
    };

    // --- ✨ [수정] 추천 여행 등록 (rectrips에 저장) ---
    const addToRecommended = async (trip) => {
        let finalImage = customImageUrl;
        if (!finalImage) finalImage = trip.img;
        if (!finalImage || finalImage.includes('unsplash')) {
            if (!customImageUrl) finalImage = generateTravelImage(trip.destination || "Travel");
        }

        if (!confirm(`[${trip.tripTitle || trip.destination}] 여행을 추천 목록(rectrips)에 링크하시겠습니까?`)) return;

        try {
            const recTripLink = {
                city: trip.destination,
                title: trip.tripTitle || trip.destination,
                desc: "관리자 추천 (원본 링크됨)",
                img: finalImage,
                startDate: trip.startDate, endDate: trip.endDate, budget: trip.budget, people: trip.people,

                // ✨ 원본 경로 저장
                tripPath: trip.path,
                originalTripId: trip.id,

                flightTip: trip.flightTip || "", hotelTip: trip.hotelTip || "", budgetDetail: trip.budgetDetail || "",
                createdAt: serverTimestamp()
            };

            // ✨ rectrips 컬렉션에 저장
            await addDoc(collection(db, "rectrips"), recTripLink);

            alert("✅ [rectrips] 폴더에 링크 저장 완료!");
            setShowRecommendModal(false);
            setCustomImageUrl('');
            fetchAllData();
        } catch (error) { console.error(error); alert("등록 실패"); }
    };

    // --- 엑셀 다운로드 ---
    const handleDownloadExcel = async (trip) => {
        try {
            let dataToExport = trip;
            if (trip.tripPath && (!trip.itinerary || trip.itinerary.length === 0)) {
                try {
                    const snap = await getDoc(doc(db, trip.tripPath));
                    if (snap.exists()) { dataToExport = { ...snap.data(), ...trip }; }
                } catch (e) { }
            }
            const excelData = [];
            excelData.push({ 구분: "기본정보", 항목: "여행 제목", 내용: dataToExport.tripTitle || dataToExport.title, 비고: "", 좌표: "" });
            excelData.push({ 구분: "기본정보", 항목: "여행지", 내용: dataToExport.destination || dataToExport.city, 비고: "", 좌표: "" });
            excelData.push({ 구분: "기본정보", 항목: "기간", 내용: `${dataToExport.startDate} ~ ${dataToExport.endDate}`, 비고: "YYYY-MM-DD", 좌표: "" });
            excelData.push({ 구분: "기본정보", 항목: "예산", 내용: dataToExport.budget, 비고: "만원", 좌표: "" });
            excelData.push({ 구분: "기본정보", 항목: "인원", 내용: dataToExport.people, 비고: "명", 좌표: "" });
            excelData.push({ 구분: "기본정보", 항목: "동행", 내용: dataToExport.companion, 비고: "", 좌표: "" });
            if (dataToExport.img) excelData.push({ 구분: "기본정보", 항목: "대표이미지", 내용: dataToExport.img, 비고: "URL", 좌표: "" });

            excelData.push({});
            excelData.push({ 구분: "팁", 항목: "항공권", 내용: dataToExport.flightTip || "", 비고: "", 좌표: "" });
            excelData.push({ 구분: "팁", 항목: "숙소", 내용: dataToExport.hotelTip || "", 비고: "", 좌표: "" });
            excelData.push({ 구분: "팁", 항목: "예산상세", 내용: dataToExport.budgetDetail || "", 비고: "", 좌표: "" });
            excelData.push({});

            if (dataToExport.itinerary && Array.isArray(dataToExport.itinerary)) {
                dataToExport.itinerary.forEach(day => {
                    excelData.push({ 구분: "일정", 항목: `Day ${day.day}`, 내용: day.date || `Day ${day.day}`, 비고: "", 좌표: "" });
                    day.places?.forEach(place => {
                        const latLng = (place.lat && place.lng) ? `${place.lat},${place.lng}` : "";
                        excelData.push({ 구분: "장소", 항목: place.name, 내용: place.description, 비고: place.theme || "", 좌표: latLng });
                    });
                });
            }
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "TravelPlan");
            XLSX.writeFile(wb, `${dataToExport.destination || '여행계획'}.xlsx`);
        } catch (error) { console.error(error); alert("엑셀 다운로드 실패"); }
    };

    // --- 엑셀 업로드 ---
    const parseExcelToTripData = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(ws);
                    if (jsonData.length === 0) throw new Error("데이터 없음");

                    const tripData = {
                        tripTitle: "엑셀 업로드 여행", destination: "", startDate: "", endDate: "", budget: 0, people: 1, companion: "연인",
                        img: "", desc: "", flightTip: "", hotelTip: "", budgetDetail: "", itinerary: [], createdAt: serverTimestamp()
                    };
                    let currentDay = null; let dayCount = 1;
                    jsonData.forEach(row => {
                        const type = row["구분"]; const item = row["항목"]; const value = row["내용"]; const coords = row["좌표"];
                        if (!type) return;
                        if (type === "기본정보") {
                            if (item === "여행 제목") tripData.tripTitle = value;
                            if (item === "여행지") tripData.destination = value;
                            if (item === "기간") { const parts = String(value).split("~"); tripData.startDate = parts[0]?.trim(); tripData.endDate = parts[1]?.trim() || parts[0]?.trim(); }
                            if (item === "예산") tripData.budget = parseInt(value) || 0;
                            if (item === "인원") tripData.people = parseInt(value) || 1;
                            if (item === "동행") tripData.companion = value;
                            if (item === "대표이미지") tripData.img = value;
                            if (item === "짧은설명") tripData.desc = value;
                        } else if (type === "팁") {
                            if (item === "항공권") tripData.flightTip = value;
                            if (item === "숙소") tripData.hotelTip = value;
                            if (item === "예산상세") tripData.budgetDetail = value;
                        } else if (type === "일정") {
                            if (currentDay) tripData.itinerary.push(currentDay);
                            const dayNumMatch = String(item).match(/\d+/);
                            const dayNum = dayNumMatch ? parseInt(dayNumMatch[0]) : dayCount++;
                            currentDay = { day: dayNum, date: value, places: [] };
                        } else if (type === "장소") {
                            if (!currentDay) currentDay = { day: 1, date: "Day 1", places: [] };
                            let lat = 0, lng = 0;
                            if (coords && typeof coords === 'string' && coords.includes(",")) { const parts = coords.split(","); lat = parseFloat(parts[0].trim()); lng = parseFloat(parts[1].trim()); }
                            currentDay.places.push({ name: item, description: value, lat: lat, lng: lng });
                        }
                    });
                    if (currentDay) tripData.itinerary.push(currentDay);
                    if (!tripData.startDate) { const today = new Date().toISOString().split('T')[0]; tripData.startDate = today; tripData.endDate = today; }
                    resolve(tripData);
                } catch (error) { reject(error); }
            };
        });
    };

    // ✨ 엑셀로 추천 여행 등록 시에도 rectrips 사용
    const handleUploadRecommend = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
            const tripData = await parseExcelToTripData(file);
            if (!tripData.img) tripData.img = generateTravelImage(tripData.destination || "Travel");
            if (!tripData.desc) tripData.desc = "관리자 추천 여행";

            // ✨ rectrips에 저장
            await addDoc(collection(db, "rectrips"), { ...tripData, city: tripData.destination, title: tripData.tripTitle });
            alert("✅ [rectrips] 엑셀 등록 성공!"); fetchAllData();
        } catch (error) { console.error(error); alert("파일 오류"); } e.target.value = null;
    };

    const handleUploadTrip = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try { const tripData = await parseExcelToTripData(file); await addDoc(collection(db, "trips"), tripData); alert("✅ 등록 성공!"); fetchAllData(); }
        catch (error) { console.error(error); alert("엑셀 파싱 실패"); } e.target.value = null;
    };

    // --- 기타 ---
    const handleDeleteTrip = async (e, id, isRecommended = false) => {
        if (e) e.stopPropagation();
        if (!confirm('⚠️ 정말 삭제하시겠습니까?')) return;
        try {
            if (isRecommended) {
                // ✨ rectrips에서 삭제
                await deleteDoc(doc(db, "rectrips", id));
            } else {
                const trip = trips.find(t => t.id === id);
                if (trip && trip.path) { const parts = trip.path.split('/'); await deleteDoc(doc(db, parts[0], parts[1], parts[2], parts[3])); }
                else await deleteDoc(doc(db, "trips", id));
            }
            alert("삭제되었습니다."); fetchAllData();
            if (selectedTripId === id) { setSelectedTripId(null); setViewMode('welcome'); }
        } catch (error) { console.error(error); alert('삭제 실패'); }
    };

    const handleDeleteUser = async () => { if (!selectedUserId || !confirm("강제 탈퇴?")) return; await deleteDoc(doc(db, "users", selectedUserId)); alert("삭제됨"); fetchAllData(); setSelectedUserId(null); };
    const handleUpdatePoints = async (amount) => { if (!selectedUserId) return; const userRef = doc(db, "users", selectedUserId); await updateDoc(userRef, { points: increment(amount) }); alert("수정됨"); setPointAmount(0); const s = await getDoc(userRef); setSelectedUser({ id: s.id, ...s.data() }); fetchAllData(); };
    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleDateChange = (u) => { setDateRange(u); setFormData({ ...formData, startDate: u[0]?.toISOString().split('T')[0], endDate: u[1]?.toISOString().split('T')[0] }); };
    const generatePlanAI = async () => { /* AI 생략 */ };

    const filteredTrips = trips.filter(t => t.tripTitle?.includes(searchTerm) || t.contactInfo?.includes(searchTerm));
    const filteredRecommended = rectrips.filter(t => t.title?.includes(searchTerm)); // ✨ rectrips 사용
    const filteredUsers = users.filter(u => u.name?.includes(searchTerm) || u.email?.includes(searchTerm));

    if (!isLoggedIn) return (<div className="min-h-screen flex items-center justify-center bg-gray-100"><form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl w-80 text-center"><div className="bg-rose-100 p-3 rounded-full inline-block mb-4"><Lock className="text-[#FF5A5F]" size={24} /></div><h2 className="text-xl font-bold mb-4">관리자 로그인</h2><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-xl mb-4" placeholder="비밀번호" autoFocus /><button className="w-full bg-[#FF5A5F] text-white py-3 rounded-xl font-bold">접속하기</button></form></div>);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
            <div className="w-full sm:w-[350px] flex flex-col border-r border-gray-200 bg-white shrink-0 h-full">
                <div className="flex p-2 gap-2 border-b border-gray-100 bg-gray-50">
                    <button onClick={() => { setActiveTab('trips'); setViewMode('welcome'); setSelectedTripId(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'trips' ? 'bg-white shadow text-rose-500' : 'text-gray-400 hover:bg-gray-200'}`}>✈️ 전체 여행</button>
                    <button onClick={() => { setActiveTab('recommend'); setViewMode('welcome'); setSelectedTripId(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'recommend' ? 'bg-white shadow text-amber-500' : 'text-gray-400 hover:bg-gray-200'}`}>🏆 추천 관리</button>
                    <button onClick={() => { setActiveTab('users'); setSelectedUserId(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'users' ? 'bg-white shadow text-indigo-500' : 'text-gray-400 hover:bg-gray-200'}`}>👥 회원</button>
                </div>
                <div className="p-5 border-b border-gray-100 bg-white z-10">
                    <h1 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                        {activeTab === 'trips' && `전체 여행 (${trips.length})`}{activeTab === 'recommend' && `추천 여행 (rectrips) (${rectrips.length})`}{activeTab === 'users' && `회원 목록 (${users.length})`}
                    </h1>
                    {activeTab === 'recommend' && (<div className="mb-3 space-y-2"><button onClick={() => setShowRecommendModal(true)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"><Plus size={18} /> 추천 여행 등록 (Link)</button><div className="flex gap-2"><button onClick={() => recommendInputRef.current.click()} className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 flex items-center justify-center gap-1"><Upload size={14} /> 엑셀 등록</button><input type="file" accept=".xlsx, .xls" ref={recommendInputRef} className="hidden" onChange={handleUploadRecommend} /></div></div>)}
                    {activeTab === 'trips' && (<div className="flex gap-2 mb-3"><button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1"><Upload size={14} /> 엑셀 등록</button><input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleUploadTrip} /></div>)}
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} /><input type="text" placeholder="검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-300 transition" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {activeTab === 'trips' && filteredTrips.map(trip => (
                        <div key={trip.id} onClick={() => handleSelectTrip(trip)} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md relative ${selectedTripId === trip.id ? 'bg-rose-50 border-rose-300' : 'bg-white border-gray-100'}`}>
                            <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-gray-800 text-sm line-clamp-1">{trip.tripTitle || trip.destination}</h3><span className="text-[10px] text-gray-400">{trip.createdAt?.toDate ? trip.createdAt.toDate().toLocaleDateString() : '-'}</span></div>
                            <p className="text-xs text-gray-500 truncate">📞 {trip.contactInfo || "연락처 없음"}</p>
                            <button onClick={(e) => handleDeleteTrip(e, trip.id)} className="absolute top-4 right-3 text-gray-300 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    {activeTab === 'recommend' && filteredRecommended.map(trip => (
                        <div key={trip.id} onClick={() => handleSelectTrip(trip, true)} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md relative ${selectedTripId === trip.id ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-100'}`}>
                            <div className="w-full h-24 mb-2 rounded-lg overflow-hidden relative bg-gray-100">
                                <img
                                    src={trip.img || FALLBACK_IMAGE}
                                    alt={trip.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                                />
                            </div>
                            <div className="flex justify-between items-start mb-1"><h3 className="font-bold text-gray-800 text-sm line-clamp-1 flex items-center gap-1">{trip.tripPath && <LinkIcon size={12} className="text-indigo-500" />} {trip.title}</h3><span className="text-[10px] text-gray-400">{trip.city}</span></div>
                            <p className="text-xs text-gray-500 truncate">{trip.desc}</p>
                            <button onClick={(e) => handleDeleteTrip(e, trip.id, true)} className="absolute top-4 right-3 text-gray-300 hover:text-red-600"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    {activeTab === 'users' && filteredUsers.map(u => (<div key={u.id} onClick={() => { setSelectedUserId(u.id); setSelectedUser(u); }} className={`p-4 rounded-xl border cursor-pointer hover:shadow-md ${selectedUserId === u.id ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-100'}`}><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">{u.photo ? <img src={u.photo} alt="profile" /> : <User size={20} />}</div><div className="flex-1"><h3 className="font-bold text-gray-800 text-sm">{u.name}</h3><p className="text-xs text-gray-500 truncate">{u.email}</p></div><div className="text-right"><span className="block font-extrabold text-indigo-600">{u.points?.toLocaleString()} P</span></div></div></div>))}
                </div>
            </div>
            <div className="flex-1 bg-gray-50 h-full overflow-hidden relative">
                {!selectedTripId && !selectedUserId && viewMode === 'welcome' && (<div className="h-full flex flex-col items-center justify-center text-gray-400"><LayoutDashboard size={64} className="mb-4 text-gray-200" /><p className="text-lg font-medium">왼쪽에서 항목을 선택해주세요.</p></div>)}
                {activeTab === 'users' && selectedUser && (<div className="h-full p-8 overflow-y-auto"><div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto relative"><button onClick={handleDeleteUser} className="absolute top-8 right-8 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center gap-1 transition"><UserX size={14} /> 회원 탈퇴시키기</button><div className="flex items-center gap-4 mb-8 pb-8 border-b"><div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden text-2xl">{selectedUser.photo ? <img src={selectedUser.photo} className="w-full h-full object-cover" /> : selectedUser.name?.[0]}</div><div><h2 className="text-2xl font-extrabold text-gray-900">{selectedUser.name}</h2><p className="text-gray-500">{selectedUser.email}</p><p className="text-xs text-gray-400 mt-1">UID: {selectedUser.id}</p></div></div><div className="grid grid-cols-2 gap-4 mb-8"><div className="bg-indigo-50 p-6 rounded-2xl text-center"><p className="text-sm font-bold text-indigo-400 mb-1">현재 보유 포인트</p><h3 className="text-4xl font-black text-indigo-600">{selectedUser.points?.toLocaleString()} P</h3></div><div className="bg-gray-50 p-6 rounded-2xl text-center"><p className="text-sm font-bold text-gray-400 mb-1">가입일</p><h3 className="text-xl font-bold text-gray-700 mt-2">{selectedUser.createdAt?.toDate ? selectedUser.createdAt.toDate().toLocaleDateString() : '-'}</h3></div></div><div className="bg-white border border-gray-200 rounded-2xl p-6"><h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Gift size={18} className="text-rose-500" /> 포인트 관리</h3><div className="flex gap-2"><button onClick={() => handleUpdatePoints(1000)} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition shadow">+ 1,000P</button><button onClick={() => handleUpdatePoints(5000)} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition shadow">+ 5,000P</button></div><div className="mt-4 pt-4 border-t flex gap-2 items-center"><input type="number" placeholder="직접 입력" className="flex-1 p-3 border rounded-xl" value={pointAmount} onChange={e => setPointAmount(e.target.value)} /><button onClick={() => handleUpdatePoints(Number(pointAmount))} className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold hover:bg-black transition">적용</button></div></div></div></div>)}
                {viewMode === 'create' && (<div className="h-full overflow-y-auto p-8 max-w-3xl mx-auto"><div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-8"><h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Plus className="text-[#FF5A5F]" /> 새 여행 일정 생성 (AI)</h2>{/* AI 폼 생략 */}</div></div>)}
                {viewMode === 'edit' && selectedTripId && selectedTripData && (
                    <div className="h-full w-full flex flex-col">
                        <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20">
                            <span className="text-xs font-bold text-gray-400 flex items-center gap-2">
                                {activeTab === 'recommend' ? <TrendingUp size={14} /> : <Plane size={14} />}
                                {selectedTripData.tripTitle || selectedTripData.title}
                                {selectedTripData.isLinked && <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[10px]">원본 링크됨</span>}
                            </span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleDownloadExcel(selectedTripData)} className="flex items-center gap-1 text-xs font-bold text-green-600 hover:bg-green-50 px-2 py-1 rounded"><Download size={12} /> 엑셀</button>
                                <button onClick={() => handleDeleteTrip(null, selectedTripId, activeTab === 'recommend')} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1 rounded"><Trash2 size={12} /> 삭제</button>
                                <a href={`/share/${selectedTripData.originalId || selectedTripId}`} target="_blank" className="text-xs font-bold text-blue-500 hover:underline flex items-center gap-1"><ArrowLeft size={10} /> 고객용 화면 보기</a>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <AIResult data={selectedTripData} userInfo={{ contact: selectedTripData.contactInfo }} tripId={selectedTripId} />
                        </div>
                    </div>
                )}
                {showRecommendModal && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-2xl rounded-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-800">추천 여행으로 등록 (이미지 설정)</h3>
                                <button onClick={() => setShowRecommendModal(false)}><X className="text-gray-400 hover:text-black" /></button>
                            </div>
                            <div className="p-4 bg-gray-50 border-b">
                                <label className="text-xs font-bold text-gray-500 mb-1 block">썸네일 이미지 (PC에서 선택하거나 URL 입력)</label>
                                <div className="flex gap-2 mb-1">
                                    <input type="text" placeholder="https://... (비워두면 AI 자동생성)" className="flex-1 p-2 border rounded-lg text-sm bg-white" value={customImageUrl} onChange={(e) => setCustomImageUrl(e.target.value)} />
                                    <button onClick={() => thumbnailInputRef.current.click()} className="whitespace-nowrap px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-1"><Upload size={14} /> PC 업로드</button>
                                    <input type="file" ref={thumbnailInputRef} hidden accept="image/*" onChange={handleThumbnailUpload} />
                                </div>
                                {customImageUrl && (<div className="mt-2 w-full h-32 rounded-lg overflow-hidden border bg-black relative"><img src={customImageUrl} alt="Preview" className="w-full h-full object-cover" /><button onClick={() => setCustomImageUrl('')} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><X size={12} /></button></div>)}
                                <p className="text-[10px] text-gray-400 mt-1">💡 팁: 이미지를 설정하지 않으면 여행지에 맞는 AI 이미지가 자동으로 생성됩니다.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {trips.map(trip => (
                                    <div key={trip.id} className="p-4 border rounded-xl hover:bg-indigo-50 flex justify-between items-center group transition cursor-pointer" onClick={() => addToRecommended(trip)}>
                                        <div className="flex-1 min-w-0"><h4 className="font-bold text-gray-800 truncate">{trip.tripTitle || trip.destination}</h4><p className="text-xs text-gray-500">{trip.startDate} ~ {trip.endDate} | {trip.budget}만원</p></div>
                                        <button className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition shadow-md flex items-center gap-2"><ImageIcon size={14} /> 등록</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}