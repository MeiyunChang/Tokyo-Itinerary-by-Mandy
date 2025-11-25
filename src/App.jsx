import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Calendar, 
  Coffee, 
  Utensils, 
  Train, 
  Plane, 
  Hotel, 
  Camera, 
  ShoppingBag, 
  Sun, 
  CloudRain, 
  Cloud,
  Navigation,
  Info,
  Wallet,
  Phone,
  CheckCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// --- Firebase Configuration & Initialization ---
// 🚨🚨 已替換為您提供的 Firebase 專案金鑰 🚨🚨
const firebaseConfig = {
  apiKey: "AIzaSyDH4YXCzNUroQWJaaGkfqm5dUYxVCaS8Lc",
  authDomain: "tokyo-itinerary-by-mandy.firebaseapp.com",
  projectId: "tokyo-itinerary-by-mandy",
  storageBucket: "tokyo-itinerary-by-mandy.firebasestorage.app",
  messagingSenderId: "103151521708",
  appId: "1:103151521708:web:d35b70b59c0f4d21c9f409",
  measurementId: "G-FT4CY9VZFV"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'tokyo-trip-2024';

// --- Data: Parsed & Enriched Itinerary ---
// Based on the user's Excel file, enriched with "Tour Guide" tips.
const ITINERARY_DATA = [
  {
    date: "12/17 (Wed)",
    weather: "sunny",
    temp: "8°C - 14°C",
    activities: [
      {
        id: "t1",
        type: "transport",
        time: "07:15 - 11:00",
        title: "航班 TSA -> HND",
        location: "羽田機場 T3",
        notes: "CI220 / JL096 (預估)",
        highlight: false
      },
      {
        id: "f1",
        type: "food",
        time: "11:30",
        title: "五代目 花山烏龍麵",
        location: "Hanayama Udon Haneda",
        subLocation: "羽田機場 T3 1F Airport Garden",
        tags: ["必吃美食", "寬烏龍麵", "排隊名店"],
        notes: "極具人氣的寬麵，建議一下飛機就先去抽號碼牌或排隊。",
        highlight: true
      },
      {
        id: "t2",
        type: "transport",
        time: "13:00",
        title: "前往飯店放行李",
        location: "remm plus Ginza",
        notes: "搭乘東京單軌列車至濱松町，轉山手線至新橋，步行至銀座。",
        highlight: false
      },
      {
        id: "s1",
        type: "sightseeing",
        time: "15:00",
        title: "麻布台之丘 (Azabudai Hills)",
        location: "Azabudai Hills",
        tags: ["新地標", "建築設計"],
        notes: "東京最新地標，有免費展望台（需確認是否仍免費開放）與teamLab無界。",
        highlight: false
      },
      {
        id: "s2",
        type: "sightseeing",
        time: "17:00",
        title: "六本木 Hills 聖誕點燈",
        location: "Roppongi Hills",
        tags: ["夜景", "聖誕氛圍"],
        notes: "櫸坂通的聖誕點燈非常浪漫，可以拍到東京鐵塔。",
        highlight: true
      },
      {
        id: "f2",
        type: "food",
        time: "18:40",
        title: "敘敘苑燒肉 (六本木店)",
        location: "Jojoen Roppongi",
        tags: ["必吃燒肉", "需預約"],
        notes: "與 Dylan 會合。高品質燒肉，午間套餐划算，晚上氣氛極佳。",
        highlight: true
      }
    ]
  },
  {
    date: "12/18 (Thu)",
    weather: "cloudy",
    temp: "7°C - 13°C",
    activities: [
      {
        id: "s3",
        type: "shopping",
        time: "AM",
        title: "銀座逛街",
        location: "Ginza Six",
        notes: "Uniqlo旗艦店、伊東屋文具、Ginza Six。",
        highlight: false
      },
      {
        id: "s4",
        type: "shopping",
        time: "PM",
        title: "表參道、澀谷逛街",
        location: "Omotesando Hills",
        notes: "精品街、各種潮牌。",
        highlight: false
      },
      {
        id: "s5",
        type: "sightseeing",
        time: "16:30",
        title: "Shibuya Sky",
        location: "Shibuya Sky",
        tags: ["百萬夜景", "必預約"],
        notes: "請務必提前線上購票。此時段剛好可以看夕陽轉夜景，風大記得保暖。",
        highlight: true
      },
      {
        id: "s6",
        type: "shopping",
        time: "Night",
        title: "飯店對面 Donki 補貨",
        location: "Don Quijote Ginza Honkan",
        tags: ["免稅", "伴手禮"],
        notes: "藥妝、零食一次買齊。",
        highlight: false
      }
    ]
  },
  {
    date: "12/19 (Fri)",
    weather: "sunny",
    temp: "6°C - 12°C",
    activities: [
      {
        id: "t3",
        type: "transport",
        time: "Morning",
        title: "前往迪士尼交通",
        location: "Tokyo Station",
        tags: ["山手線", "轉乘"],
        notes: "從新橋搭乘山手線至東京站，轉乘京葉線至舞濱站。",
        highlight: false
      },
      {
        id: "s7",
        type: "sightseeing",
        time: "All Day",
        title: "Disney Sea 迪士尼海洋",
        location: "Tokyo DisneySea",
        tags: ["DPA必買", "Fantasy Springs"],
        notes: "如果有搶到新園區 Fantasy Springs 的票，建議一入園直衝。必玩：翱翔夢幻奇航、地心探險。",
        highlight: true
      }
    ]
  },
  {
    date: "12/20 (Sat)",
    weather: "cloudy",
    temp: "7°C - 11°C",
    activities: [
      {
        id: "s8",
        type: "sightseeing",
        time: "AM",
        title: "淺草寺 (穿和服)、雷門",
        location: "Senso-ji",
        tags: ["文化體驗", "拍照"],
        notes: "建議提早預約和服店。仲見世通吃炸肉餅、人形燒。",
        highlight: true
      },
      {
        id: "s9",
        type: "sightseeing",
        time: "PM",
        title: "晴空塔 Skytree",
        location: "Tokyo Skytree",
        tags: ["地標"],
        notes: "若不上塔，底下的 Solamachi 商場也非常好逛。",
        highlight: false
      }
    ]
  },
  {
    date: "12/21 (Sun)",
    weather: "sunny",
    temp: "9°C - 15°C",
    activities: [
      {
        id: "s10",
        type: "sightseeing",
        time: "AM",
        title: "代官山、中目黑",
        location: "Daikanyama T-Site",
        tags: ["文青", "散步"],
        notes: "蔦屋書店、Starbucks Reserve Roastery (中目黑)。",
        highlight: false
      },
      {
        id: "s11",
        type: "shopping",
        time: "PM",
        title: "Number Sugar",
        location: "Number Sugar Omotesando",
        tags: ["必買伴手禮", "手工焦糖"],
        notes: "Excel 特別備註。非常適合作為伴手禮，包裝精美。",
        highlight: true
      }
    ]
  },
  {
    date: "12/22 (Mon)",
    weather: "sunny",
    temp: "-2°C - 8°C",
    activities: [
      {
        id: "s12",
        type: "sightseeing",
        time: "All Day",
        title: "富士山河口湖一日遊",
        location: "Lake Kawaguchi",
        tags: ["絕景", "自駕/包車"],
        notes: "新倉淺間神社（忠靈塔）必去。若自駕請注意路面結冰狀況。",
        highlight: true
      },
      {
        id: "f3",
        type: "food",
        time: "Lunch",
        title: "河口湖 餺飥麵",
        location: "Hoto Fudo",
        tags: ["鄉土料理"],
        notes: "推薦不動茶屋 (Hoto Fudo)，雲朵建築那間最有名。",
        highlight: false
      }
    ]
  },
  {
    date: "12/23 (Tue)",
    weather: "sunny",
    temp: "8°C - 14°C",
    activities: [
      {
        id: "t4",
        type: "transport",
        time: "12:15",
        title: "航班 HND -> TSA",
        location: "羽田機場 T3",
        notes: "15:05 抵達松山。建議提前 3 小時抵達機場最後採購。",
        highlight: false
      }
    ]
  }
];

// --- Utilities ---
const getIcon = (type) => {
  switch (type) {
    case 'food': return <Utensils className="w-5 h-5 text-terracotta" />;
    case 'transport': return <Train className="w-5 h-5 text-slate-500" />;
    case 'sightseeing': return <Camera className="w-5 h-5 text-sage-600" />;
    case 'shopping': return <ShoppingBag className="w-5 h-5 text-sand-600" />;
    default: return <MapPin className="w-5 h-5 text-gray-500" />;
  }
};

const getWeatherIcon = (weather) => {
  if (weather === 'sunny') return <Sun className="w-6 h-6 text-amber-400" />;
  if (weather === 'cloudy') return <Cloud className="w-6 h-6 text-slate-400" />;
  if (weather === 'rain') return <CloudRain className="w-6 h-6 text-blue-400" />;
  return <Sun className="w-6 h-6 text-amber-400" />;
};

const openMap = (location) => {
  const query = encodeURIComponent(location);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};

// --- Components ---

const ActivityCard = ({ activity }) => (
  <div className={`relative bg-white/90 backdrop-blur-sm rounded-xl p-4 mb-4 shadow-sm border-l-4 ${activity.highlight ? 'border-terracotta' : 'border-sage-300'}`}>
    <div className="flex justify-between items-start">
      <div className="flex gap-3">
        <div className={`mt-1 p-2 rounded-full ${activity.highlight ? 'bg-terracotta/10' : 'bg-slate-100'}`}>
          {getIcon(activity.type)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">{activity.time}</span>
            {activity.tags && activity.tags.map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 font-medium">
                {tag}
              </span>
            ))}
          </div>
          <h3 className={`text-lg font-bold mt-1 ${activity.highlight ? 'text-slate-800' : 'text-slate-700'}`}>
            {activity.title}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{activity.notes}</p>
        </div>
      </div>
    </div>
    
    <div className="mt-4 flex justify-end gap-2">
      <button 
        onClick={() => openMap(activity.subLocation || activity.location)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-medium active:scale-95 transition-transform"
      >
        <Navigation className="w-3 h-3" />
        導航去這裡
      </button>
    </div>
  </div>
);

const DayView = ({ dayData }) => (
  <div className="pb-24">
    {/* Weather Header */}
    <div className="flex items-center justify-between bg-gradient-to-r from-sage-200 to-sage-100 p-4 rounded-2xl mb-6 shadow-inner text-sage-800">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{dayData.date}</h2>
        <span className="text-xs opacity-70 font-mono">TOKYO FORECAST</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-lg font-bold">{dayData.temp}</div>
          <div className="text-xs capitalize opacity-70">{dayData.weather}</div>
        </div>
        {getWeatherIcon(dayData.weather)}
      </div>
    </div>

    {/* Timeline */}
    <div className="relative pl-4 border-l-2 border-slate-200 ml-2 space-y-6">
      {dayData.activities.map((activity, idx) => (
        <div key={idx} className="relative">
          <div className="absolute -left-[21px] top-6 w-3 h-3 bg-slate-300 rounded-full border-2 border-bg-color" />
          <ActivityCard activity={activity} />
        </div>
      ))}
    </div>
  </div>
);

const ToolsView = () => {
  const [activeSection, setActiveSection] = useState(null);

  const toggle = (section) => setActiveSection(activeSection === section ? null : section);

  const InfoCard = ({ title, icon: Icon, children, id }) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      <button 
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between p-4 bg-white"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sage-50 text-sage-600 rounded-lg">
            <Icon className="w-5 h-5" />
          </div>
          <span className="font-bold text-slate-700">{title}</span>
        </div>
        {activeSection === id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      
      {activeSection === id && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-50 bg-slate-50/50 text-sm text-slate-600">
          <div className="pt-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="pb-24 pt-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">旅程資訊</h2>
      
      <InfoCard title="航班資訊" icon={Plane} id="flight">
        <div className="space-y-3">
          <div className="bg-white p-3 rounded border border-slate-100">
            <div className="flex justify-between text-xs text-slate-400 mb-1">去程 12/17</div>
            <div className="font-bold text-slate-800">TSA 松山 07:15</div>
            <div className="flex justify-center my-1 text-slate-300">↓</div>
            <div className="font-bold text-slate-800">HND 羽田 11:00</div>
          </div>
          <div className="bg-white p-3 rounded border border-slate-100">
            <div className="flex justify-between text-xs text-slate-400 mb-1">回程 12/23</div>
            <div className="font-bold text-slate-800">HND 羽田 12:15</div>
            <div className="flex justify-center my-1 text-slate-300">↓</div>
            <div className="font-bold text-slate-800">TSA 松山 15:05</div>
          </div>
        </div>
      </InfoCard>

      <InfoCard title="住宿資訊" icon={Hotel} id="hotel">
        <div className="font-bold text-slate-800 text-lg">remm plus Ginza</div>
        <p className="mt-1">東京都中央區銀座8-11-11</p>
        <p className="text-xs text-slate-400 mt-2">Check-in: 14:00 / Check-out: 12:00</p>
        <button 
          onClick={() => openMap("remm plus Ginza")}
          className="mt-3 w-full py-2 bg-sage-600 text-white rounded-lg text-xs font-bold"
        >
          導航至飯店
        </button>
      </InfoCard>

      <InfoCard title="緊急聯絡" icon={Phone} id="emergency">
        <ul className="space-y-2">
          <li className="flex justify-between border-b pb-2">
            <span>警察局</span>
            <span className="font-mono font-bold text-terracotta">110</span>
          </li>
          <li className="flex justify-between border-b pb-2">
            <span>火警/救護車</span>
            <span className="font-mono font-bold text-terracotta">119</span>
          </li>
          <li className="flex justify-between">
            <span>旅外國人急難救助</span>
            <span className="font-mono font-bold text-terracotta">080-1009-7179</span>
          </li>
        </ul>
      </InfoCard>
      
      <div className="mt-8 p-4 bg-terracotta/10 rounded-xl border border-terracotta/20">
        <h3 className="text-terracotta font-bold mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> 行前檢查
        </h3>
        <ul className="list-disc list-inside text-xs text-terracotta/80 space-y-1">
          <li>Visit Japan Web 填寫完畢 (QR Code截圖)</li>
          <li>護照隨身攜帶 (免稅需要)</li>
          <li>預約 Shibuya Sky 門票</li>
          <li>預約 燒肉敘敘苑</li>
          <li>確認漫遊或網卡已開通</li>
        </ul>
      </div>
    </div>
  );
};

const BudgetView = ({ user }) => {
  const [expenses, setExpenses] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [newCost, setNewCost] = useState('');
  const [loading, setLoading] = useState(true);

  // Use a user-specific collection path
  const collectionPath = useMemo(() => {
    return user ? `artifacts/${appId}/users/${user.uid}/expenses` : null;
  }, [user]);

  useEffect(() => {
    if (!user || !collectionPath) return;

    const q = query(collection(db, collectionPath), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
       console.error("Budget fetch error:", error);
       setLoading(false);
    });

    return () => unsubscribe();
  }, [user, collectionPath]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem || !newCost || !collectionPath) return;

    try {
      await addDoc(collection(db, collectionPath), {
        item: newItem,
        cost: Number(newCost),
        timestamp: serverTimestamp()
      });
      setNewItem('');
      setNewCost('');
    } catch (err) {
      console.error("Error adding expense:", err);
    }
  };

  const handleDelete = async (id) => {
     if (!collectionPath) return;
     await deleteDoc(doc(db, collectionPath, id));
  };

  const total = expenses.reduce((acc, curr) => acc + (curr.cost || 0), 0);

  if (!user) return <div className="p-8 text-center text-slate-400">登入中...</div>;

  return (
    <div className="pb-24 pt-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6 px-2">旅費記帳</h2>

      {/* Total Card */}
      <div className="bg-slate-800 text-white p-6 rounded-2xl shadow-lg mb-6">
        <div className="text-slate-400 text-sm mb-1">總支出 (JPY/TWD)</div>
        <div className="text-4xl font-bold font-mono">¥{total.toLocaleString()}</div>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-2">
        <input 
          type="text" 
          placeholder="項目 (如: 晚餐)" 
          className="flex-1 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sage-400 outline-none"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
        />
        <input 
          type="number" 
          placeholder="金額" 
          className="w-24 bg-slate-50 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-sage-400 outline-none"
          value={newCost}
          onChange={(e) => setNewCost(e.target.value)}
        />
        <button type="submit" className="bg-sage-600 text-white p-2 rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-center text-slate-400 text-sm">載入中...</p>
        ) : expenses.length === 0 ? (
          <p className="text-center text-slate-400 text-sm">目前沒有記帳紀錄</p>
        ) : (
          expenses.map(expense => (
            <div key={expense.id} className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-50">
              <span className="text-slate-700 font-medium">{expense.item}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-800 font-mono font-bold">¥{expense.cost}</span>
                <button onClick={() => handleDelete(expense.id)} className="text-slate-300 hover:text-terracotta">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState('itinerary');
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [user, setUser] = useState(null);

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-sans text-slate-800">
      {/* Container simulating mobile view on desktop */}
      <div className="max-w-md mx-auto min-h-screen bg-[#F2F0EB] relative shadow-2xl overflow-hidden">
        
        {/* Header Area */}
        <header className="px-6 pt-12 pb-4 bg-white sticky top-0 z-10 shadow-sm">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">TOKYO TRIP</h1>
          <p className="text-xs font-bold text-sage-600 tracking-widest uppercase mt-1">Dec 17 - Dec 23, 2024</p>
          
          {/* Date Selector (Only for Itinerary Tab) */}
          {activeTab === 'itinerary' && (
            <div className="flex gap-3 overflow-x-auto mt-6 pb-2 no-scrollbar snap-x">
              {ITINERARY_DATA.map((day, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex-shrink-0 snap-center flex flex-col items-center justify-center w-14 h-16 rounded-2xl transition-all border-2 ${
                    selectedDayIndex === idx 
                      ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-105' 
                      : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold">{day.date.split(' ')[0]}</span>
                  <span className="text-sm font-bold mt-1">{day.date.split('(')[1].replace(')', '')}</span>
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Scrollable Content Area */}
        <main className="px-4 pt-4 h-[calc(100vh-180px)] overflow-y-auto no-scrollbar">
          {activeTab === 'itinerary' && (
            <DayView dayData={ITINERARY_DATA[selectedDayIndex]} />
          )}
          {activeTab === 'tools' && <ToolsView />}
          {activeTab === 'budget' && <BudgetView user={user} />}
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 w-full bg-white/95 backdrop-blur border-t border-slate-200 pb-safe pt-2 px-6 pb-6 z-20">
          <div className="flex justify-around items-center">
            <button 
              onClick={() => setActiveTab('itinerary')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'itinerary' ? 'text-sage-700' : 'text-slate-300'}`}
            >
              <Calendar className="w-6 h-6" strokeWidth={activeTab === 'itinerary' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">行程</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('budget')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'budget' ? 'text-sage-700' : 'text-slate-300'}`}
            >
              <Wallet className="w-6 h-6" strokeWidth={activeTab === 'budget' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">記帳</span>
            </button>

            <button 
              onClick={() => setActiveTab('tools')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'tools' ? 'text-sage-700' : 'text-slate-300'}`}
            >
              <Info className="w-6 h-6" strokeWidth={activeTab === 'tools' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">資訊</span>
            </button>
          </div>
        </nav>

      </div>
      
      {/* Global Styles for specific utility classes not in standard tailwind */}
      <style>{`
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .text-terracotta { color: #C57B57; }
        .bg-terracotta { background-color: #C57B57; }
        .border-terracotta { border-color: #C57B57; }
        .text-sage-600 { color: #7B8C7C; }
        .text-sage-700 { color: #6A7A6B; }
        .text-sage-800 { color: #4A5A4B; }
        .bg-sage-50 { background-color: #F4F7F4; }
        .bg-sage-100 { background-color: #E6EBE6; }
        .bg-sage-200 { background-color: #D3DBD3; }
        .bg-sage-300 { background-color: #B4C4B4; }
        .bg-sage-600 { background-color: #7B8C7C; }
        .text-sand-600 { color: #A89F91; }
      `}</style>
    </div>
  );
}