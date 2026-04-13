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
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 space-y-2">
        <div className="p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center text-2xl font-black shadow-xl shadow-purple-500/20 group-hover:scale-105 transition-transform overflow-hidden">
                {user?.username?.[0].toUpperCase()}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Edit2 size={16} />
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{user?.username}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
          <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 text-xs font-bold transition-all active:scale-95">
            Edit Profile
          </button>
        </div>

        <nav className="space-y-1">
          <SidebarItem active={activeTab === 'account'} icon={<User size={18}/>} label="Account" onClick={() => setActiveTab('account')} />
          <SidebarItem active={activeTab === 'dashboard'} icon={<Activity size={18}/>} label="Activity Dashboard" onClick={() => setActiveTab('dashboard')} />
          <SidebarItem active={activeTab === 'preferences'} icon={<Settings size={18}/>} label="Preferences" onClick={() => setActiveTab('preferences')} />
          <SidebarItem active={activeTab === 'devices'} icon={<Watch size={18}/>} label="Connected Devices" onClick={() => setActiveTab('devices')} badge={isWatchConnected ? "1" : null} />
          <SidebarItem active={activeTab === 'security'} icon={<Shield size={18}/>} label="Security" onClick={() => setActiveTab('security')} />
          <div className="pt-4 mt-4 border-t border-white/5">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all font-medium group"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Logout
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-[600px] glass border border-white/10 rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'account' && (
            <motion.div 
              key="account"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Header title="Account Settings" sub="Manage your profile information and email preferences." />
              
              <div className="grid gap-6">
                <InputGroup label="Full Name" value={user?.username} placeholder="Your Name" />
                <InputGroup label="Email Address" value={user?.email} placeholder="email@example.com" disabled />
                <div className="pt-4">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Email Notifications</h4>
                  <div className="space-y-4">
                    <Toggle label="Weekly nutrition report" defaultChecked />
                    <Toggle label="Daily meal reminders" defaultChecked />
                    <Toggle label="New recipe alerts" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Header title="Activity Insights" sub="Track your nutritional and fitness progress over time." />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MiniStat icon={<Flame className="text-orange-500"/>} label="Total Calories" value="14,820" sub="kcal" />
                <MiniStat icon={<Zap className="text-blue-500"/>} label="Avg Protein" value="124" sub="g/day" />
                <MiniStat icon={<TrendingUp className="text-green-500"/>} label="Current Streak" value="12" sub="days" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 h-80">
                <h4 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2">
                  <TrendingUp size={16} />
                  Weekly Calorie Intake
                </h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_ACTIVITY}>
                    <defs>
                      <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 12}} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                      itemStyle={{color: '#fff'}}
                    />
                    <Area type="monotone" dataKey="calories" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorCal)" />
                  </AreaChart>
                </ResponsiveContainer>
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
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
      active 
        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <div className="flex items-center gap-3">
      <span className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
    {badge && (
      <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-black">{badge}</span>
    )}
    {!active && <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 transition-all" />}
  </button>
);

const Header = ({ title, sub }: any) => (
  <div className="mb-10">
    <h3 className="text-3xl font-black tracking-tight mb-2">{title}</h3>
    <p className="text-gray-500 font-light">{sub}</p>
  </div>
);

const InputGroup = ({ label, value, placeholder, disabled }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-1">{label}</label>
    <div className="relative">
      <input 
        type="text" 
        defaultValue={value}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500/50 outline-none transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
        }`}
      />
      {disabled && <Shield size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600" />}
    </div>
  </div>
);

const Toggle = ({ label, defaultChecked }: any) => (
  <label className="flex items-center justify-between group cursor-pointer">
    <span className="text-gray-400 group-hover:text-white transition-colors">{label}</span>
    <div className="relative">
      <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
      <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
    </div>
  </label>
);

const MiniStat = ({ icon, label, value, sub }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/10 transition-all cursor-default">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-white/5 rounded-xl border border-white/5">{icon}</div>
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-black">{value}</span>
      <span className="text-[10px] text-gray-500 font-bold uppercase">{sub}</span>
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
