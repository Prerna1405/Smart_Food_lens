import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Leaf, 
  Flame, 
  Zap, 
  Droplets, 
  ChefHat, 
  Clock, 
  ArrowRight, 
  LogOut, 
  User,
  Activity,
  Calendar,
  Plus
} from 'lucide-react';
import axios from 'axios';
import ProfileView from './ProfileView';

// --- Types ---
type Nutrient = {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: any;
};

type Recipe = {
  title: string;
  description: string;
  image: string;
  ingredients: Array<{ name: string; quantity: string; icon: string }>;
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

// --- API Config ---
const API_BASE = "http://localhost:8000";

const SmartFoodApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // --- Auth Logic ---
  const checkAuth = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setIsLoggedIn(true);
    } catch (e) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setShowDashboard(false);
    setShowProfile(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'register') {
        await axios.post(`${API_BASE}/api/auth/register`, authForm);
        setAuthModalMode('login');
        alert("Registration successful! Please login.");
      } else {
        const formData = new FormData();
        formData.append('username', authForm.username);
        formData.append('password', authForm.password);
        
        const res = await axios.post(`${API_BASE}/api/auth/login`, formData);
        const newToken = res.data.access_token;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setShowAuthModal(false);
        await checkAuth();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Authentication failed");
    }
  };

  // --- Generate Recipe ---
  const handleGenerate = async () => {
    if (!query) return;
    setIsLoading(true);
    setRecipe(null);
    try {
      const res = await axios.post(`${API_BASE}/api/ai/generate-recipe`, { query });
      setRecipe(res.data);
    } catch (e) {
      console.error("Error generating recipe", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch Dashboard ---
  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await axios.get(`${API_BASE}/api/scans/by-date?date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(res.data);
    } catch (e) {
      console.error("Dashboard error", e);
    }
  };

  useEffect(() => {
    if (token) checkAuth();
  }, [token]);

  useEffect(() => {
    if (isLoggedIn && showDashboard) fetchDashboard();
  }, [isLoggedIn, showDashboard]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center glass border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ChefHat size={24} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">NutriScan AI</span>
        </div>
        
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <button 
                onClick={() => {
                  setShowProfile(true);
                  setShowDashboard(false);
                }}
                className="flex items-center gap-2 mr-2 group"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${showProfile ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/10 border-white/10 group-hover:bg-white/20'}`}>
                  <User size={16} className={showProfile ? "text-purple-400" : "text-gray-300"} />
                </div>
                <span className={`text-sm font-medium transition-colors ${showProfile ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                  {user?.username}
                </span>
              </button>
              <button 
                onClick={() => {
                  setShowDashboard(!showDashboard);
                  setShowProfile(false);
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Activity size={20} className={showDashboard ? "text-purple-400" : "text-gray-400"} />
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-all">
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-full font-medium transition-all shadow-lg shadow-purple-600/20 active:scale-95">
              Login
            </button>
          )}
        </div>
      </nav>

      <main className="relative pt-32 pb-20 px-6 max-w-7xl mx-auto">
        {showProfile ? (
          <ProfileView user={user} onLogout={handleLogout} />
        ) : !showDashboard ? (
          <>
            {/* HERO SECTION */}
            <section className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent leading-none">
                  AI-Powered Smart Nutrition
                </h1>
                <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-light">
                  Generate personalized recipes and track nutrition instantly with advanced AI.
                </p>
              </motion.div>

              {/* AI Input Box */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="max-w-3xl mx-auto relative group"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-focus-within:opacity-50 transition duration-1000"></div>
                <div className="relative flex items-center bg-[#0a0a0a] border border-white/10 rounded-2xl p-2 focus-within:border-purple-500/50 transition-all">
                  <Search className="ml-4 text-gray-500" />
                  <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="Try: veg high protein dinner under 20 min..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-lg placeholder:text-gray-600"
                  />
                  <button 
                    onClick={handleGenerate}
                    className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2 group/btn active:scale-95"
                  >
                    Generate
                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            </section>

            {/* RECIPE RESULT */}
            <AnimatePresence>
              {recipe && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-5xl mx-auto mt-12 glass border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                  <div className="grid md:grid-cols-2">
                    <div className="relative overflow-hidden group">
                      <img 
                        src={recipe.image} 
                        alt={recipe.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                      <div className="absolute bottom-8 left-8">
                        <span className="bg-purple-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 inline-block">AI Generated</span>
                        <h2 className="text-4xl font-black tracking-tight leading-tight">{recipe.title}</h2>
                      </div>
                    </div>

                    <div className="p-10 bg-[#0a0a0a]/50">
                      <div className="flex items-center gap-6 mb-10 overflow-x-auto pb-4 no-scrollbar">
                        <NutrientCircle label="Calories" value={recipe.nutrition.calories} unit="kcal" color="#a855f7" icon={<Flame size={16}/>} />
                        <NutrientCircle label="Protein" value={recipe.nutrition.protein} unit="g" color="#3b82f6" icon={<Zap size={16}/>} />
                        <NutrientCircle label="Carbs" value={recipe.nutrition.carbs} unit="g" color="#10b981" icon={<Leaf size={16}/>} />
                        <NutrientCircle label="Fat" value={recipe.nutrition.fat} unit="g" color="#f59e0b" icon={<Droplets size={16}/>} />
                      </div>

                      <div className="mb-10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Plus size={20} className="text-purple-500" />
                          Ingredients
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          {recipe.ingredients.map((ing, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                              <span className="text-gray-400 text-sm">{ing.quantity}</span>
                              <span className="font-medium text-sm">{ing.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Clock size={20} className="text-blue-500" />
                          Preparation
                        </h3>
                        <div className="space-y-4">
                          {recipe.steps.map((step, i) => (
                            <div key={i} className="flex gap-4">
                              <span className="flex-shrink-0 w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold text-gray-400 border border-white/10">
                                {i + 1}
                              </span>
                              <p className="text-gray-400 text-sm leading-relaxed">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          /* DASHBOARD SECTION */
          <motion.section 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto"
          >
            <div className="flex justify-between items-end mb-12">
              <div>
                <h1 className="text-4xl font-black mb-2 tracking-tight">Healthy Eater, Welcome!</h1>
                <p className="text-gray-400">Here's your nutritional summary for today.</p>
              </div>
              <div className="flex gap-4">
                <button className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-all">
                  <Calendar size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <StatsCard label="Daily Goal" value="2000" sub="kcal" icon={<Flame className="text-orange-500" />} progress={dashboardData?.totals?.calories / 2000 * 100} />
              <StatsCard label="Protein" value={dashboardData?.totals?.protein.toFixed(0)} sub="g" icon={<Zap className="text-blue-500" />} />
              <StatsCard label="Carbs" value={dashboardData?.totals?.carbs.toFixed(0)} sub="g" icon={<Leaf className="text-green-500" />} />
              <StatsCard label="Fat" value={dashboardData?.totals?.fat.toFixed(0)} sub="g" icon={<Droplets className="text-yellow-500" />} />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass border border-white/10 rounded-[2rem] p-8">
                <h3 className="text-xl font-bold mb-6">Today's Meals</h3>
                <div className="space-y-6">
                  {dashboardData?.scans?.length > 0 ? (
                    dashboardData.scans.map((scan: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-purple-400 font-bold">
                            {scan.foodItems[0].food[0]}
                          </div>
                          <div>
                            <p className="font-bold">{scan.foodItems[0].food}</p>
                            <p className="text-xs text-gray-500">{new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-400">{scan.foodItems[0].nutrients.calories.toFixed(0)} kcal</p>
                          <p className="text-xs text-gray-500">P: {scan.foodItems[0].nutrients.protein.toFixed(0)}g | C: {scan.foodItems[0].nutrients.carbs.toFixed(0)}g</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">No meals logged yet today.</div>
                  )}
                </div>
              </div>

              <div className="glass border border-white/10 rounded-[2rem] p-8">
                <h3 className="text-xl font-bold mb-6">Recent History</h3>
                <div className="h-64 flex items-end justify-between gap-2 px-4">
                  {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className="w-full bg-gradient-to-t from-purple-600/40 to-purple-500/80 rounded-t-lg relative group"
                    >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] px-2 py-1 rounded font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        {h * 20}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-between mt-4 px-4 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-3xl font-black mb-2">{authMode === 'login' ? 'Welcome Back' : 'Join NutriScan'}</h2>
              <p className="text-gray-500 mb-8">{authMode === 'login' ? 'Login to access your personalized nutrition plan.' : 'Create an account to start tracking your smart health journey.'}</p>
              
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Username</label>
                  <input 
                    type="text" 
                    required
                    value={authForm.username}
                    onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500/50 outline-none transition-all"
                    placeholder="john_doe"
                  />
                </div>
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Email</label>
                    <input 
                      type="email" 
                      required
                      value={authForm.email}
                      onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500/50 outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 ml-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={authForm.password}
                    onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-purple-500/50 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <button className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-purple-600/20 mt-4 active:scale-95">
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              </form>

              <p className="text-center mt-6 text-sm text-gray-500">
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                <button 
                  onClick={() => setAuthModalMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-purple-400 font-bold hover:underline"
                >
                  {authMode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isLoading && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-purple-400 font-bold animate-pulse">AI is thinking...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Subcomponents ---

const NutrientCircle = ({ label, value, unit, color, icon }: any) => (
  <div className="flex-shrink-0 flex flex-col items-center">
    <div className="w-16 h-16 rounded-full border-2 border-white/5 flex flex-col items-center justify-center mb-2 relative group">
      <div 
        className="absolute inset-0 rounded-full opacity-20 group-hover:opacity-40 transition-opacity" 
        style={{ background: color, filter: 'blur(8px)' }}
      />
      <div className="z-10 text-white/80 mb-0.5">{icon}</div>
      <span className="z-10 text-xs font-bold leading-none">{Math.round(value)}</span>
      <span className="z-10 text-[8px] text-gray-500 uppercase font-black">{unit}</span>
    </div>
    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{label}</span>
  </div>
);

const StatsCard = ({ label, value, sub, icon, progress }: any) => (
  <div className="glass border border-white/10 rounded-3xl p-6 relative overflow-hidden">
    {progress !== undefined && (
      <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          className="h-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"
        />
      </div>
    )}
    <div className="flex justify-between items-start mb-4">
      <span className="text-sm font-medium text-gray-400">{label}</span>
      <div className="p-2 bg-white/5 rounded-lg border border-white/5">{icon}</div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black tracking-tight">{value || 0}</span>
      <span className="text-gray-500 text-sm font-bold uppercase">{sub}</span>
    </div>
  </div>
);

export default SmartFoodApp;
