import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  Activity, 
  Watch, 
  Bell, 
  Shield, 
  LogOut, 
  Edit2, 
  Check,
  ChevronRight,
  TrendingUp,
  Flame,
  Zap,
  Clock,
  Smartphone,
  Moon,
  Sun
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

// --- Mock Data ---
const WEEKLY_ACTIVITY = [
  { day: 'Mon', calories: 2100, burned: 300, steps: 8200 },
  { day: 'Tue', calories: 1900, burned: 450, steps: 10500 },
  { day: 'Wed', calories: 2300, burned: 200, steps: 6100 },
  { day: 'Thu', calories: 1800, burned: 500, steps: 12000 },
  { day: 'Fri', calories: 2000, burned: 350, steps: 9000 },
  { day: 'Sat', calories: 2500, burned: 150, steps: 4000 },
  { day: 'Sun', calories: 2200, burned: 400, steps: 11000 },
];

const ProfileView = ({ user, onLogout }: { user: any, onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isWatchConnected, setIsWatchConnected] = useState(false);
  const [watchData, setWatchData] = useState({ steps: 0, burned: 0, duration: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  // --- Simulate Smartwatch Sync ---
  useEffect(() => {
    let interval: any;
    if (isWatchConnected) {
      interval = setInterval(() => {
        setWatchData(prev => ({
          steps: prev.steps + Math.floor(Math.random() * 10),
          burned: prev.burned + Math.random() * 0.5,
          duration: prev.duration + 1
        }));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isWatchConnected]);

  const handleConnectWatch = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsWatchConnected(true);
      setWatchData({ steps: 8542, burned: 320, duration: 45 });
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col md:flex-row gap-12 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-80 space-y-8">
        <div className="glass border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center gap-4 mb-8">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-tr from-purple-600 via-purple-500 to-blue-500 flex items-center justify-center text-3xl font-black shadow-2xl shadow-purple-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                {user?.username?.[0].toUpperCase()}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Edit2 size={20} className="text-white" />
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-[#050505] rounded-full shadow-lg shadow-green-500/20"></div>
            </div>
            <div>
              <h2 className="font-black text-2xl tracking-tight leading-tight mb-1">{user?.username}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Level</p>
              <p className="text-lg font-black text-purple-400">12</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Points</p>
              <p className="text-lg font-black text-blue-400">2.4k</p>
            </div>
          </div>

          <button className="w-full bg-white text-black hover:bg-gray-200 rounded-2xl py-3.5 text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-white/5">
            Edit Profile
          </button>
        </div>

        <nav className="glass border border-white/10 rounded-[2.5rem] p-4 shadow-xl space-y-1">
          <SidebarItem active={activeTab === 'account'} icon={<User size={18}/>} label="Account" onClick={() => setActiveTab('account')} />
          <SidebarItem active={activeTab === 'dashboard'} icon={<Activity size={18}/>} label="Activity Insights" onClick={() => setActiveTab('dashboard')} />
          <SidebarItem active={activeTab === 'preferences'} icon={<Settings size={18}/>} label="Preferences" onClick={() => setActiveTab('preferences')} />
          <SidebarItem active={activeTab === 'devices'} icon={<Watch size={18}/>} label="Devices" onClick={() => setActiveTab('devices')} badge={isWatchConnected ? "Active" : null} />
          <SidebarItem active={activeTab === 'security'} icon={<Shield size={18}/>} label="Security" onClick={() => setActiveTab('security')} />
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-red-400 hover:bg-red-400/10 transition-all font-black text-xs uppercase tracking-widest group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-[700px] glass border border-white/10 rounded-[3rem] p-8 md:p-16 overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -mr-64 -mt-64"></div>
        
        <AnimatePresence mode="wait">
          {activeTab === 'account' && (
            <motion.div 
              key="account"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12 relative z-10"
            >
              <Header title="Account Settings" sub="Personalize your identity and communication preferences." />
              
              <div className="grid gap-8 max-w-2xl">
                <InputGroup label="Full Name" value={user?.username} placeholder="Your Name" />
                <InputGroup label="Email Address" value={user?.email} placeholder="email@example.com" disabled />
                
                <div className="pt-8">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center gap-3">
                    <Bell size={16} />
                    Communication Preferences
                  </h4>
                  <div className="space-y-4">
                    <Toggle label="Weekly nutritional deep-dive" defaultChecked />
                    <Toggle label="AI meal recommendation alerts" defaultChecked />
                    <Toggle label="Community challenge updates" />
                  </div>
                </div>
              </div>

              <div className="pt-8 flex gap-4">
                <button className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 active:scale-95">
                  Save Changes
                </button>
                <button className="bg-white/5 hover:bg-white/10 text-gray-400 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/5">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12 relative z-10"
            >
              <Header title="Activity Insights" sub="A comprehensive look at your health and performance metrics." />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <MiniStat icon={<Flame className="text-orange-500"/>} label="Total Calories" value="14,820" sub="kcal" />
                <MiniStat icon={<Zap className="text-blue-500"/>} label="Avg Protein" value="124" sub="g/day" />
                <MiniStat icon={<TrendingUp className="text-green-500"/>} label="Current Streak" value="12" sub="days" />
              </div>

              <div className="glass border border-white/10 rounded-[2.5rem] p-10 shadow-xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400">
                      <TrendingUp size={16} />
                    </div>
                    Weekly Calorie Intake
                  </h4>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 bg-white/5 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">7 Days</button>
                    <button className="px-3 py-1 bg-purple-600 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">30 Days</button>
                  </div>
                </div>
                <div className="h-80 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={WEEKLY_ACTIVITY}>
                      <defs>
                        <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10, fontWeight: 900}} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px'}}
                        itemStyle={{color: '#fff', fontSize: '12px', fontWeight: 'bold'}}
                        cursor={{stroke: '#a855f7', strokeWidth: 1}}
                      />
                      <Area type="monotone" dataKey="calories" stroke="#a855f7" strokeWidth={4} fillOpacity={1} fill="url(#colorCal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div 
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Header title="App Preferences" sub="Customize your application experience and dietary goals." />
              
              <div className="space-y-6">
                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400">
                      {isDarkMode ? <Moon size={24} /> : <Sun size={24} />}
                    </div>
                    <div>
                      <h4 className="font-bold">Display Mode</h4>
                      <p className="text-sm text-gray-500">{isDarkMode ? 'Dark' : 'Light'} mode enabled</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="bg-white text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                  >
                    Switch
                  </button>
                </div>

                <div className="grid gap-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest ml-1">Dietary Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    <Tag label="Vegetarian" active />
                    <Tag label="High Protein" active />
                    <Tag label="Low Carb" />
                    <Tag label="Dairy Free" />
                    <Tag label="Nut Free" active />
                  </div>
                </div>

                <div className="grid gap-4 pt-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest ml-1">Fitness Goals</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <GoalCard label="Daily Steps" value="10,000" />
                    <GoalCard label="Water Intake" value="3.5L" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'devices' && (
            <motion.div 
              key="devices"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Header title="Connected Devices" sub="Integrate with your wearable devices for real-time tracking." />
              
              <div className="space-y-6">
                {!isWatchConnected ? (
                  <div className="bg-white/5 border border-white/10 rounded-[2rem] p-10 text-center space-y-6">
                    <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mx-auto">
                      <Watch size={40} />
                    </div>
                    <div className="max-w-xs mx-auto">
                      <h3 className="text-xl font-bold mb-2">No Watch Connected</h3>
                      <p className="text-sm text-gray-500">Connect your smartwatch to automatically track steps and calories burned.</p>
                    </div>
                    <button 
                      onClick={handleConnectWatch}
                      disabled={isSyncing}
                      className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-gray-400 px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-3 mx-auto"
                    >
                      {isSyncing ? <Activity size={20} className="animate-spin" /> : <Smartphone size={20} />}
                      {isSyncing ? "Connecting..." : "Connect Smartwatch"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-tr from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-[2rem] p-8 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/40 relative">
                          <Watch size={32} />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">Apple Watch Series 9</h3>
                          <p className="text-sm text-blue-400 font-medium">Connected & Syncing</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsWatchConnected(false)}
                        className="text-gray-500 hover:text-red-400 transition-colors text-sm font-bold"
                      >
                        Disconnect
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <WatchStat icon={<Activity size={20}/>} label="Steps Today" value={watchData.steps.toLocaleString()} unit="steps" color="text-green-400" />
                      <WatchStat icon={<Flame size={20}/>} label="Active Burn" value={Math.round(watchData.burned)} unit="kcal" color="text-orange-400" />
                      <WatchStat icon={<Clock size={20}/>} label="Duration" value={watchData.duration} unit="min" color="text-blue-400" />
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">
                      Last synced: Just now
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

// --- Subcomponents ---

const SidebarItem = ({ active, icon, label, onClick, badge }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 group ${
      active 
      ? 'bg-white text-black shadow-xl shadow-white/5' 
      : 'text-gray-500 hover:text-white hover:bg-white/5'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </div>
    {badge && (
      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter ${
        active ? 'bg-black text-white' : 'bg-purple-600 text-white'
      }`}>
        {badge}
      </span>
    )}
  </button>
);

const Header = ({ title, sub }: any) => (
  <div className="mb-12">
    <h2 className="text-4xl font-black tracking-tight mb-3 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
      {title}
    </h2>
    <p className="text-gray-500 font-medium max-w-lg">{sub}</p>
  </div>
);

const InputGroup = ({ label, value, placeholder, disabled }: any) => (
  <div className="space-y-3">
    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
      {label}
    </label>
    <input 
      type="text" 
      defaultValue={value} 
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:border-purple-500/50 outline-none transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
      }`}
    />
  </div>
);

const Toggle = ({ label, defaultChecked }: any) => (
  <div className="flex items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
    <span className="text-xs font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
    <button className={`w-12 h-6 rounded-full relative transition-all duration-500 ${defaultChecked ? 'bg-purple-600' : 'bg-white/10'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-500 ${defaultChecked ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

const MiniStat = ({ icon, label, value, sub }: any) => (
  <div className="glass border border-white/10 rounded-[2rem] p-6 hover:border-white/20 transition-all group shadow-xl">
    <div className="flex items-center gap-4 mb-4">
      <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">
        {label}
      </span>
    </div>
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-black tracking-tight">{value}</span>
      <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{sub}</span>
    </div>
  </div>
);

const WatchStat = ({ icon, label, value, unit, color }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative overflow-hidden group">
    <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
      {React.cloneElement(icon as any, { size: 80 })}
    </div>
    <div className="flex items-center gap-2 mb-4 text-gray-500 uppercase text-[10px] font-black tracking-widest">
      {icon}
      {label}
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-3xl font-black ${color}`}>{value}</span>
      <span className="text-xs font-bold text-gray-500 uppercase">{unit}</span>
    </div>
  </div>
);

const Tag = ({ label, active }: any) => (
  <button className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
    active 
      ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20' 
      : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'
  }`}>
    {label}
  </button>
);

const GoalCard = ({ label, value }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:border-purple-500/30 transition-all">
    <div>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-gray-600 group-hover:text-purple-400 group-hover:border-purple-400/30 transition-all">
      <Edit2 size={12} />
    </div>
  </div>
);

export default ProfileView;
