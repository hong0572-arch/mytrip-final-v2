'use client';

import { useState, useEffect, useRef } from 'react';
import * as xlsx from 'xlsx';
import { db, auth, storage } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { Plus, Trash2, Edit2, ShoppingBag, MapPin, Link as LinkIcon, Phone, Mail, Image as ImageIcon, FileUp, Download, Eye, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getValidImageUrl, compressImage } from '../../utils/imageUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function PartnerDashboard() {
    const [user, setUser] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
    const router = useRouter();

    const [isMobile, setIsMobile] = useState(false);
    const [isPasswordVerified, setIsPasswordVerified] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    useEffect(() => {
        // Mobile device detection
        const checkMobile = () => {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase())) {
                setIsMobile(true);
            } else if (window.innerWidth <= 768) {
                setIsMobile(true);
            } else {
                setIsMobile(false);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        // Check session storage for password
        const verified = sessionStorage.getItem('partner_auth');
        if (verified === 'true') {
            setIsPasswordVerified(true);
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'hotel', // hotel, tour, ticket
        price: '',
        lat: '',
        lng: '',
        externalUrl: '',
        phone: '',
        email: '',
        imageUrl: ''
    });

    const [editId, setEditId] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [descTab, setDescTab] = useState('write');
    const [compressionStats, setCompressionStats] = useState(null);
    const excelInputRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                fetchProducts(currentUser.uid);
            } else {
                setUser(null);
                setLoading(false);
                alert("Please log in first to access the Partner Dashboard.");
                router.push('/');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const fetchProducts = async (uid) => {
        setLoading(true);
        try {
            const q = query(collection(db, "products"), where("partnerId", "==", uid));
            const snap = await getDocs(q);
            setProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        
        setUploading(true);
        setCompressionStats(null);
        try {
            let uploadedUrls = [];
            
            // Handle existing URL if no new files and an existing URL is present
            if (imageFiles.length === 0 && formData.imageUrl) {
                uploadedUrls.push(getValidImageUrl(formData.imageUrl));
            }

            if (imageFiles.length > 0) {
                let totalOriginalSize = 0;
                let totalCompressedSize = 0;

                for (const file of imageFiles) {
                    // Compress image before upload
                    const { file: compressedFile, originalSize, compressedSize } = await compressImage(file);
                    totalOriginalSize += originalSize;
                    totalCompressedSize += compressedSize;

                    const fileRef = ref(storage, `products/${Date.now()}_${compressedFile.name}`);
                    await uploadBytes(fileRef, compressedFile);
                    const url = await getDownloadURL(fileRef);
                    uploadedUrls.push(url);
                }

                setCompressionStats({
                    original: (totalOriginalSize / 1024).toFixed(1),
                    compressed: (totalCompressedSize / 1024).toFixed(1),
                    saved: (100 - (totalCompressedSize / totalOriginalSize) * 100).toFixed(1)
                });
            }

            const productData = {
                title: formData.title,
                description: formData.description,
                type: formData.type,
                price: Number(formData.price),
                coordinates: {
                    lat: parseFloat(formData.lat) || 0,
                    lng: parseFloat(formData.lng) || 0
                },
                externalUrl: formData.externalUrl,
                phone: formData.phone,
                email: formData.email,
                images: uploadedUrls,
                partnerId: user.uid,
                updatedAt: serverTimestamp()
            };

            if (view === 'edit' && editId) {
                await updateDoc(doc(db, "products", editId), productData);
                alert("Product updated!");
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, "products"), productData);
                alert("Product added!");
            }
            
            setView('list');
            fetchProducts(user.uid);
            resetForm();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Error saving product. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await deleteDoc(doc(db, "products", id));
            setProducts(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const handleEdit = (product) => {
        setFormData({
            title: product.title,
            description: product.description,
            type: product.type || 'hotel',
            price: product.price || '',
            lat: product.coordinates?.lat || '',
            lng: product.coordinates?.lng || '',
            externalUrl: product.externalUrl || '',
            phone: product.phone || '',
            email: product.email || '',
            imageUrl: product.images?.[0] || ''
        });
        setEditId(product.id);
        setImageFiles([]);
        setCompressionStats(null);
        setView('edit');
    };

    const resetForm = () => {
        setFormData({
            title: '', description: '', type: 'hotel', price: '', lat: '', lng: '', externalUrl: '', phone: '', email: '', imageUrl: ''
        });
        setEditId(null);
        setImageFiles([]);
        setCompressionStats(null);
    };

    const handleDownloadTemplate = () => {
        const ws = xlsx.utils.json_to_sheet([{
            title: "Sample Hotel",
            description: "A great place to stay",
            type: "hotel",
            price: 150000,
            lat: 37.5665,
            lng: 126.9780,
            imageUrl: "https://example.com/image.jpg",
            externalUrl: "https://example.com/book",
            phone: "010-0000-0000",
            email: "hotel@example.com"
        }]);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Template");
        xlsx.writeFile(wb, "Partner_Product_Template.xlsx");
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = xlsx.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet);

                let successCount = 0;
                for (const row of rows) {
                    if (!row.title || !row.price || !row.lat || !row.lng) continue;

                    const productData = {
                        title: row.title,
                        description: row.description || '',
                        type: row.type || 'hotel',
                        price: Number(row.price),
                        coordinates: {
                            lat: parseFloat(row.lat) || 0,
                            lng: parseFloat(row.lng) || 0
                        },
                        externalUrl: row.externalUrl || '',
                        phone: String(row.phone || ''),
                        email: row.email || '',
                        images: row.imageUrl ? [getValidImageUrl(row.imageUrl)] : [],
                        partnerId: user.uid,
                        updatedAt: serverTimestamp(),
                        createdAt: serverTimestamp()
                    };

                    await addDoc(collection(db, "products"), productData);
                    successCount++;
                }

                alert(`Successfully uploaded ${successCount} products!`);
                fetchProducts(user.uid);
            } catch (error) {
                console.error("Excel upload error:", error);
                alert("Error parsing Excel file. Please check the format.");
            } finally {
                setUploading(false);
                if (excelInputRef.current) excelInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

    if (isMobile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow text-center max-w-sm w-full">
                    <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-6">The Partner Dashboard is only accessible on a PC.</p>
                    <button onClick={() => router.push('/')} className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-bold">
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!isPasswordVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    if (passwordInput === 'timmy3542') {
                        setIsPasswordVerified(true);
                        sessionStorage.setItem('partner_auth', 'true');
                    } else {
                        alert('Invalid password');
                    }
                }} className="bg-white p-8 rounded-xl shadow max-w-sm w-full text-center">
                    <h1 className="text-2xl font-bold mb-2">Partner Login</h1>
                    <p className="text-gray-600 mb-6 text-sm">Please enter the partner password to access the dashboard.</p>
                    <input 
                        type="password" 
                        value={passwordInput} 
                        onChange={e => setPasswordInput(e.target.value)} 
                        placeholder="Enter password" 
                        className="w-full p-3 border rounded-lg mb-4 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700">
                        Enter Dashboard
                    </button>
                </form>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto p-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ShoppingBag className="text-indigo-600" /> Partner Dashboard
                </h1>
                {view === 'list' ? (
                    <div className="flex gap-2">
                        <button onClick={handleDownloadTemplate} className="bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-green-700 text-sm font-medium">
                            <Download size={16} /> Template
                        </button>
                        <button onClick={() => excelInputRef.current?.click()} disabled={uploading} className="bg-teal-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-teal-700 text-sm font-medium disabled:opacity-50">
                            <FileUp size={16} /> {uploading ? 'Uploading...' : 'Excel Upload'}
                            <input type="file" ref={excelInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                        </button>
                        <button onClick={() => { resetForm(); setView('add'); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 font-medium">
                            <Plus size={18} /> Add Product
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setView('list')} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
                        Back to List
                    </button>
                )}
            </div>

            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {products.length === 0 ? (
                        <div className="col-span-full p-8 text-center bg-gray-50 rounded-xl text-gray-500">
                            No products found. Add your first product to get started!
                        </div>
                    ) : (
                        products.map(product => (
                            <div key={product.id} className="bg-white p-4 rounded-xl shadow border flex flex-col gap-3">
                                {product.images?.[0] && (
                                    <img src={getValidImageUrl(product.images[0])} alt={product.title} className="w-full h-40 object-cover rounded-lg" />
                                )}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-xs font-bold text-indigo-600 uppercase mb-1">{product.type}</div>
                                        <h3 className="font-bold text-lg">{product.title}</h3>
                                        <p className="text-sm text-gray-500 font-medium">₩{Number(product.price).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600 line-clamp-2">{product.description}</div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {(view === 'add' || view === 'edit') && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow border space-y-4">
                    <h2 className="text-xl font-bold mb-4">{view === 'add' ? 'Add New Product' : 'Edit Product'}</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Title</label>
                            <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g. Sunset Yacht Tour" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select name="type" value={formData.type} onChange={handleInputChange} className="w-full p-2 border rounded-lg bg-white">
                                <option value="hotel">Accommodation (Hotel/Resort)</option>
                                <option value="tour">Tour & Activity</option>
                                <option value="ticket">Ticket & Pass</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-sm font-medium text-gray-700">Description (Markdown Supported)</label>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                <button type="button" onClick={() => setDescTab('write')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 ${descTab === 'write' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Edit3 size={14}/> Write
                                </button>
                                <button type="button" onClick={() => setDescTab('preview')} className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 ${descTab === 'preview' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Eye size={14}/> Preview
                                </button>
                            </div>
                        </div>
                        {descTab === 'write' ? (
                            <textarea required name="description" value={formData.description} onChange={handleInputChange} rows={6} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Use Markdown: **bold**, *italic*, - list..." />
                        ) : (
                            <div className="w-full p-3 border rounded-xl min-h-[160px] bg-gray-50 prose prose-sm max-w-none">
                                {formData.description ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                                ) : (
                                    <span className="text-gray-400">Nothing to preview</span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price (KRW)</label>
                            <input required type="number" name="price" value={formData.price} onChange={handleInputChange} className="w-full p-2 border rounded-lg" placeholder="e.g. 50000" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 border rounded-lg px-2 bg-white">
                                    <ImageIcon size={18} className="text-gray-400 shrink-0" />
                                    <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="w-full py-2 outline-none text-sm" placeholder="Or enter 1 image URL (http://...)" disabled={imageFiles.length > 0} />
                                </div>
                                <div className="flex items-center gap-2 border rounded-lg px-2 bg-gray-50">
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => setImageFiles(Array.from(e.target.files))} 
                                        className="w-full py-1.5 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 outline-none cursor-pointer" 
                                    />
                                </div>
                            </div>
                            {formData.imageUrl && imageFiles.length === 0 && (
                                <div className="mt-2 text-xs text-green-600 font-bold">✓ Using external image URL</div>
                            )}
                            {imageFiles.length > 0 && (
                                <div className="mt-2 text-xs text-blue-600 font-bold">✓ Selected {imageFiles.length} local file(s) (will override URL)</div>
                            )}
                            {compressionStats && (
                                <div className="mt-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg">
                                    🚀 Image Compressed! {compressionStats.original}KB ➔ {compressionStats.compressed}KB (Saved {compressionStats.saved}%)
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                            <div className="flex items-center gap-2 border rounded-lg px-2">
                                <MapPin size={18} className="text-gray-400" />
                                <input required type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange} className="w-full py-2 outline-none" placeholder="e.g. 37.5665" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                            <div className="flex items-center gap-2 border rounded-lg px-2">
                                <MapPin size={18} className="text-gray-400" />
                                <input required type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange} className="w-full py-2 outline-none" placeholder="e.g. 126.9780" />
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Contact & Booking Info (Optional)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">External Booking URL</label>
                                <div className="flex items-center gap-2 border rounded-lg px-2 bg-gray-50">
                                    <LinkIcon size={14} className="text-gray-400" />
                                    <input type="url" name="externalUrl" value={formData.externalUrl} onChange={handleInputChange} className="w-full py-2 outline-none bg-transparent text-sm" placeholder="https://..." />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Contact Phone</label>
                                <div className="flex items-center gap-2 border rounded-lg px-2 bg-gray-50">
                                    <Phone size={14} className="text-gray-400" />
                                    <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full py-2 outline-none bg-transparent text-sm" placeholder="+82 10-0000-0000" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Contact Email</label>
                                <div className="flex items-center gap-2 border rounded-lg px-2 bg-gray-50">
                                    <Mail size={14} className="text-gray-400" />
                                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full py-2 outline-none bg-transparent text-sm" placeholder="partner@example.com" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="submit" disabled={uploading} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                            {uploading ? 'Uploading & Saving...' : (view === 'add' ? 'Save Product' : 'Update Product')}
                        </button>
                        <button type="button" onClick={() => setView('list')} disabled={uploading} className="px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50">
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
