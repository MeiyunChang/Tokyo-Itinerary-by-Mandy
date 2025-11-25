import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plane, Home, Users, Phone, DollarSign, CloudRain, MapPin, Bus, Utensils, Flag, Calendar, Clock, 
    BarChart3, ChevronRight, X, Menu, Edit, Save, PlusCircle, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, doc, setDoc, onSnapshot, collection, getDoc
} from 'firebase/firestore';

// --- 全域變數初始化 ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firestore 公共路徑：/artifacts/{appId}/public/data/itineraries
const FIRESTORE_PATH = `artifacts/${appId}/public/data/itineraries/tokyo-trip-data`;

// 標籤顏色映射 (日式極簡風格配色)
const tagColorMap = {
    "必吃美食": "bg-red-200 text-red-800",
    "必點菜單": "bg-yellow-200 text-yellow-800",
    "必買伴手禮": "bg-green-200 text-green-800",
    "重要預約代號": "bg-indigo-200 text-indigo-800 font-bold",
    "攻略: 務必提前網路購票": "bg-blue-200 text-blue-800 font-bold",
    "攻略: 推薦日落時段": "bg-yellow-100 text-orange-700",
    "景點故事": "bg-gray-300 text-gray-700",
    "攻略: 寬麵必點": "bg-pink-100 text-pink-700",
    "攻略: 建議預約": "bg-purple-100 text-purple-700",
    "攻略: 需爬 398 階": "bg-red-100 text-red-600",
    "景點故事: 2023新地標": "bg-teal-100 text-teal-700",
    default: "bg-gray-100 text-gray-600",
};

// 根據類型獲取圖標
const getItemIcon = (type) => {
    switch (type) {
        case 'Spot': return <Flag className="w-4 h-4 text-white" />;
        case 'Restaurant': return <Utensils className="w-4 h-4 text-white" />;
        case 'Transportation': return <Bus className="w-4 h-4 text-white" />;
        case 'Flight': return <Plane className="w-4 h-4 text-white" />;
        case 'Accommodation': return <Home className="w-4 h-4 text-white" />;
        default: return <MapPin className="w-4 h-4 text-white" />;
    }
};

// 標籤渲染組件
const Tag = ({ tag }) => {
    const className = tagColorMap[tag] || tagColorMap.default;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2 mb-1 ${className}`}>
            {tag}
        </span>
    );
};

// --- 資料庫初始化與行程資料庫存取 ---

// 預設的行程結構 (用於首次寫入)
const initialItinerary = [
    {
        day: 1, date: "12/17 (三)", theme: "抵達羽田與六本木夜景", location: "東京, 六本木/銀座", weather: "10°C / 5°C, 晴時多雲 (預估)", 
        items: [
            { id: 101, type: "Flight", time: "07:15 - 11:00", name: "去程航班：TSA &gt; HND T3", detail: "重要預約代號：請自行填寫。", tags: ["重要預約代號"] },
            { id: 102, type: "Restaurant", time: "12:00", name: "午餐：五代目花山烏龍麵", detail: "HND T3。必吃寬麵條「鬼ひも川」沾麵。", tags: ["必吃美食", "必點菜單"] },
            { id: 103, type: "Spot", time: "17:00", name: "六本木Hills/敘敘苑晚餐", detail: "觀景台需門票。晚餐建議提前預約！", tags: ["必點菜單", "攻略: 建議預約", "重要預約代號"] },
        ]
    },
    {
        day: 2, date: "12/18 (四)", theme: "銀座與澀谷時尚購物", location: "東京, 銀座/澀谷", weather: "12°C / 6°C, 多雲",
        items: [
            { id: 201, type: "Spot", time: "16:30", name: "Shibuya Sky", detail: "觀景時間建議選在日落前一小時。務必提前網路購票！", tags: ["重要預約代號", "攻略: 務必提前網路購票"] },
        ]
    },
    {
        day: 3, date: "12/19 (五)", theme: "淺草、晴空塔與迪士尼", location: "東京, 淺草/舞浜", weather: "14°C / 7°C, 陰天",
        items: [
            { id: 301, type: "Spot", time: "09:00", name: "淺草（雷門）", detail: "東京最古老的寺廟之一。必買伴手禮：仲見世通的人形燒。", tags: ["景點故事", "必買伴手禮: 人形燒"] },
            { id: 302, type: "Spot", time: "14:30", name: "Disney Sea Day", detail: "必吃美食：煙燻火雞腿、三眼怪麻糬。攻略：App 搶 DPA。", tags: ["必吃美食", "必點菜單: 火雞腿"] },
        ]
    },
    {
        day: 4, date: "12/23 (二)", theme: "賦歸", location: "羽田國際機場", weather: "11°C / 4°C, 晴朗",
        items: [
            { id: 401, type: "Flight", time: "12:15 - 15:05", name: "回程航班：HND T3 &gt; TSA", detail: "確認航班登機門。", tags: ["重要預約代號"] },
        ]
    },
];


// --- 編輯彈窗 (Modal) 組件 ---
const EditModal = ({ item, dayIndex, onClose, onSave, isNewItem }) => {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        time: item?.time || '',
        type: item?.type || 'Spot',
        detail: item?.detail || '',
        tags: item?.tags ? item.tags.join(', ') : '',
        id: item?.id || Date.now(), // 確保新項目有 ID
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const updatedItem = {
            ...formData,
            tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
            location: '東京', // 簡化處理，地點固定
            // 如果是新增項目，給予一個新的 ID
            id: isNewItem ? Date.now() : item.id,
        };
        onSave(dayIndex, updatedItem, isNewItem);
        onClose();
    };

    const itemTypes = ['Spot', 'Restaurant', 'Transportation', 'Flight', 'Accommodation', 'Other'];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-1">
                    <X className="w-6 h-6" />
                </button>
                <h3 className="text-xl font-bold mb-4 text-gray-800">{isNewItem ? '新增行程項目' : '編輯行程項目'}</h3>
                
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input 
                        name="name" 
                        value={formData.name} 
                        onChange={handleChange} 
                        placeholder="項目名稱 (例如：澀谷 Sky)" 
                        required
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                    <div className="flex space-x-2">
                        <input 
                            name="time" 
                            value={formData.time} 
                            onChange={handleChange} 
                            placeholder="時間 (例如：16:30)" 
                            required
                            className="w-1/3 p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                        />
                        <select 
                            name="type" 
                            value={formData.type} 
                            onChange={handleChange} 
                            className="w-2/3 p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                        >
                            {itemTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <textarea 
                        name="detail" 
                        value={formData.detail} 
                        onChange={handleChange} 
                        placeholder="詳細內容/攻略/預約代號" 
                        rows="3"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                    <input 
                        name="tags" 
                        value={formData.tags} 
                        onChange={handleChange} 
                        placeholder="標籤 (以逗號分隔，例如: 必吃美食, 攻略: 必買)" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 text-sm"
                    />
                    <button 
                        type="submit"
                        className="w-full py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition shadow-md flex justify-center items-center"
                    >
                        <Save className="w-5 h-5 mr-2" /> 儲存變更
                    </button>
                </form>
            </div>
        </div>
    );
};


// --- 行程單項組件 (包含編輯按鈕) ---
const ItineraryItem = ({ item, dayIndex, onEdit, onDelete }) => {
    const isFlight = item.type === 'Flight';
    const bgColor = item.type === 'Spot' ? 'bg-white' : item.type === 'Restaurant' ? 'bg-white' : 'bg-white';
    
    const navigateUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || '東京'))}`;

    return (
        <div className={`p-4 border-l-4 border-gray-100 mb-4 rounded-md shadow-sm transition duration-300 ${bgColor} hover:shadow-lg relative`}>
            {/* 編輯/刪除按鈕群組 */}
            <div className="absolute top-3 right-3 flex space-x-2">
                <button onClick={() => onEdit(dayIndex, item)} className="text-gray-400 hover:text-blue-500 p-1 rounded-full bg-gray-50 transition">
                    <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(dayIndex, item.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full bg-gray-50 transition">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Type Icon and Name */}
            <div className="flex items-start mb-2 pr-16">
                <div className={`p-2 rounded-full ${isFlight ? 'bg-indigo-500' : item.type === 'Restaurant' ? 'bg-orange-500' : 'bg-teal-500'} mr-3 flex-shrink-0 mt-1`}>
                    {getItemIcon(item.type)}
                </div>
                <div>
                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" /> {item.time}
                    </p>
                </div>
            </div>
            
            {/* 導遊職責：亮顯標籤 */}
            <div className="flex flex-wrap mt-2 mb-2">
                {item.tags?.map(tag => <Tag key={tag} tag={tag} />)}
            </div>

            {/* Detail/攻略 */}
            <p className="text-sm text-gray-600 border-t pt-2 mt-2">{item.detail}</p>
            
            {/* 導航按鈕 */}
            {item.type !== 'Transportation' && item.type !== 'Accommodation' && item.type !== 'Flight' && (
                <a 
                    href={navigateUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-4 flex items-center justify-center w-full py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition duration-350 shadow-md"
                >
                    <MapPin className="w-4 h-4 mr-2" /> 導航到此地點
                </a>
            )}
        </div>
    );
};

// 每日行程卡片組件 (包含新增按鈕)
const DayCard = ({ dayData, dayIndex, isExpanded, onToggle, onEdit, onDelete, onNewItem }) => {
    return (
        <div className="mb-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
            
            {/* 標題與天氣區塊 */}
            <button 
                onClick={onToggle}
                className="flex justify-between items-center w-full text-left focus:outline-none"
            >
                <div className="flex items-baseline">
                    <h2 className="text-2xl font-extrabold text-gray-900 mr-2">第 {dayData.day} 天</h2>
                    <p className="text-md font-semibold text-gray-600">{dayData.date} - {dayData.theme}</p>
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`} />
            </button>

            <div className="flex items-center text-sm mt-3 p-3 bg-blue-50 rounded-lg text-blue-800 font-medium">
                <CloudRain className="w-5 h-5 mr-2" />
                <span className="font-bold">{dayData.location} 即時天氣:</span> {dayData.weather}
            </div>

            {/* 行程詳細內容 */}
            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                    {dayData.items.map((item) => (
                        <ItineraryItem 
                            key={item.id} 
                            item={item} 
                            dayIndex={dayIndex}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                    {/* 新增項目按鈕 */}
                    <button 
                        onClick={() => onNewItem(dayIndex)}
                        className="mt-4 w-full py-2 border-2 border-dashed border-teal-300 text-teal-600 rounded-lg hover:bg-teal-50 transition flex justify-center items-center font-semibold"
                    >
                        <PlusCircle className="w-5 h-5 mr-2" /> 新增本日行程
                    </button>
                </div>
            )}
        </div>
    );
};


// --- 主應用程式組件 ---
const App = () => {
    const [authReady, setAuthReady] = useState(false);
    const [userId, setUserId] = useState(null);
    const [itineraryData, setItineraryData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('itinerary');
    const [expandedDay, setExpandedDay] = useState(1);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [editingItem, setEditingItem] = useState(null);
    const [editingDayIndex, setEditingDayIndex] = useState(null);
    const [isNewItem, setIsNewItem] = useState(false);

    // 1. Firebase 初始化與認證
    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.projectId) {
            console.error("Firebase config is missing or invalid. Using mock data.");
            setItineraryData(initialItinerary);
            setLoading(false);
            setAuthReady(true);
            return;
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        
        const authenticate = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Firebase authentication error:", error);
                // 即使認證失敗，也嘗試載入數據
            }
        };

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setAuthReady(true);
                // 2. 數據訂閱 (在認證後才啟動)
                const docRef = doc(db, FIRESTORE_PATH);
                
                // 檢查文件是否存在，若不存在則寫入初始數據
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists() || !docSnap.data().days || docSnap.data().days.length === 0) {
                    console.log("No data found, writing initial itinerary.");
                    await setDoc(docRef, { days: initialItinerary });
                    setItineraryData(initialItinerary); // 寫入後立即設置
                    setLoading(false);
                }

                // 設置即時監聽
                return onSnapshot(docRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        setItineraryData(data.days || []);
                    } else {
                        // 如果文件被刪除，重新創建初始數據
                        setDoc(docRef, { days: initialItinerary }).then(() => {
                            setItineraryData(initialItinerary);
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Firestore listen error:", error);
                    setLoading(false);
                });

            } else {
                setAuthReady(true);
                setLoading(false);
                setItineraryData(initialItinerary); // 認證失敗時使用本地模擬數據
            }
        });

        authenticate();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // 儲存至 Firestore 的回調函數
    const saveItinerary = useCallback(async (newItinerary) => {
        if (!authReady || !firebaseConfig || !firebaseConfig.projectId) {
            console.error("App is not ready or Firebase not configured.");
            return;
        }
        
        try {
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const docRef = doc(db, FIRESTORE_PATH);
            await setDoc(docRef, { days: newItinerary });
        } catch (error) {
            console.error("Error saving document to Firestore: ", error);
        }
    }, [authReady]);


    // 處理編輯事件：打開編輯彈窗
    const handleEdit = (dayIndex, item) => {
        setEditingDayIndex(dayIndex);
        setEditingItem(item);
        setIsNewItem(false);
    };

    // 處理新增項目事件：打開編輯彈窗 (空項目)
    const handleNewItem = (dayIndex) => {
        setEditingDayIndex(dayIndex);
        setEditingItem({ name: '', time: '', type: 'Spot', detail: '', tags: [] });
        setIsNewItem(true);
    };

    // 處理彈窗儲存事件
    const handleSave = (dayIndex, updatedItem, isNew) => {
        const newItinerary = [...itineraryData];
        const dayItems = newItinerary[dayIndex].items;

        if (isNew) {
            dayItems.push(updatedItem);
        } else {
            const itemIndex = dayItems.findIndex(i => i.id === updatedItem.id);
            if (itemIndex > -1) {
                dayItems[itemIndex] = updatedItem;
            }
        }
        // 確保項目根據時間排序
        dayItems.sort((a, b) => a.time.localeCompare(b.time));
        
        setItineraryData(newItinerary);
        saveItinerary(newItinerary);
    };

    // 處理刪除事件
    const handleDelete = (dayIndex, itemId) => {
        if (!window.confirm("確定要刪除此行程項目嗎？")) return;
        
        const newItinerary = [...itineraryData];
        const dayItems = newItinerary[dayIndex].items;
        
        newItinerary[dayIndex].items = dayItems.filter(i => i.id !== itemId);

        setItineraryData(newItinerary);
        saveItinerary(newItinerary);
    };


    const handleToggleDay = (day) => {
        setExpandedDay(day === expandedDay ? null : day);
    };
    
    // 主頁面渲染
    const ItineraryView = () => (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">東京自由行 - 行程總覽</h1>
            
            {loading ? (
                <div className="text-center py-10 text-gray-500 flex items-center justify-center">
                    <Plane className="w-6 h-6 animate-pulse mr-2" /> 載入中... (正在連線資料庫)
                </div>
            ) : itineraryData.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                    目前沒有行程資料。
                </div>
            ) : (
                itineraryData.map((dayData, index) => (
                    <DayCard 
                        key={dayData.day} 
                        dayData={dayData} 
                        dayIndex={index}
                        isExpanded={dayData.day === expandedDay} 
                        onToggle={() => handleToggleDay(dayData.day)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onNewItem={handleNewItem}
                    />
                ))
            )}
        </div>
    );

    // BudgetTracker (簡化為靜態，專注於行程編輯)
    const BudgetTracker = () => (
        <div className="p-4 bg-white rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold mb-4 flex items-center text-gray-800">
                <BarChart3 className="w-5 h-5 mr-2 text-teal-600" /> 記帳/預算表 (待強化)
            </h3>
            <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-sm">
                目前此區塊功能為靜態模擬。
                如需新增、編輯和儲存您的即時開支，請告知，我將為您擴展 Firestore 數據模型來支援即時記帳！
            </div>
            <div className="mt-4 flex space-x-2">
                <div className="p-4 bg-teal-50 rounded-lg text-center flex-1">
                    <p className="text-sm text-teal-700">日本支出 (JPY)</p>
                    <p className="text-2xl font-extrabold text-teal-900">¥ 5,500</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg text-center flex-1">
                    <p className="text-sm text-gray-700">台灣支出 (TWD)</p>
                    <p className="text-2xl font-extrabold text-gray-900">NT$ 14,283</p>
                </div>
            </div>
        </div>
    );
    
    // ToolsView
    const ToolsView = () => (
        <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">旅遊工具箱</h1>
            <BudgetTracker />
            {/* 航班資訊 */}
            <div className="mt-6 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-3 flex items-center text-gray-800">
                    <Plane className="w-5 h-5 mr-2 text-indigo-500" /> 航班資訊
                </h3>
                <div className="space-y-2 text-gray-700">
                    <p><strong>去程：</strong>TSA &gt; HND T3 / 12/17 07:15 - 11:00</p>
                    <p><strong>回程：</strong>HND T3 &gt; TSA / 12/23 12:15 - 15:05</p>
                    <p className="bg-indigo-50 p-2 rounded-md text-sm">
                        <strong>代號：</strong><span className="font-bold">請務必自行填寫預約代號！</span>
                    </p>
                </div>
            </div>
        </div>
    );
    

    return (
        <div className="min-h-screen bg-white font-sans">
            
            {/* 編輯彈窗 */}
            {editingItem && (
                <EditModal
                    item={editingItem}
                    dayIndex={editingDayIndex}
                    onClose={() => setEditingItem(null)}
                    onSave={handleSave}
                    isNewItem={isNewItem}
                />
            )}

            {/* PWA 頂部導航/App Bar */}
            <header className="sticky top-0 z-40 bg-white shadow-md p-4 flex justify-between items-center border-b border-gray-100">
                <h1 className="text-xl font-bold text-gray-800">
                    {activeTab === 'itinerary' ? '東京七日行 (可編輯)' : '旅遊工具箱'}
                </h1>
                <div className="sm:hidden">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)} 
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-full focus:outline-none"
                    >
                        {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </header>

            {/* 漢堡菜單 (手機專用) */}
            <div className={`fixed inset-0 z-50 bg-white transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} sm:hidden`}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-8 text-gray-800">選單</h2>
                    <button onClick={() => setIsMenuOpen(false)} className="absolute top-4 right-4 text-gray-500"><X className="w-6 h-6" /></button>
                    <ul className="space-y-4">
                        <li>
                            <button
                                className={`w-full text-left p-3 rounded-lg flex items-center font-semibold transition ${activeTab === 'itinerary' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                onClick={() => { setActiveTab('itinerary'); setIsMenuOpen(false); }}
                            >
                                <Calendar className="w-5 h-5 mr-3" /> 行程總覽
                            </button>
                        </li>
                        <li>
                            <button
                                className={`w-full text-left p-3 rounded-lg flex items-center font-semibold transition ${activeTab === 'tools' ? 'bg-teal-500 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                                onClick={() => { setActiveTab('tools'); setIsMenuOpen(false); }}
                            >
                                <DollarSign className="w-5 h-5 mr-3" /> 輔助工具 (記帳/資訊)
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            
            {/* 內容區塊 */}
            <main className="pb-20">
                {activeTab === 'itinerary' ? <ItineraryView /> : <ToolsView />}
            </main>

            {/* 底部導航欄 (固定於底部) */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-30">
                <div className="flex justify-around items-center h-16">
                    <button 
                        onClick={() => setActiveTab('itinerary')}
                        className={`flex flex-col items-center justify-center p-2 transition ${activeTab === 'itinerary' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Calendar className="w-6 h-6" />
                        <span className="text-xs mt-1 font-medium">行程</span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('tools')}
                        className={`flex flex-col items-center justify-center p-2 transition ${activeTab === 'tools' ? 'text-teal-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <BarChart3 className="w-6 h-6" />
                        <span className="text-xs mt-1 font-medium">工具</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};

export default App;
