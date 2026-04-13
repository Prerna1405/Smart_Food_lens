import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import moment from 'moment';
import { useAuth } from './AuthContext';

export type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ScanEntry = {
  id: string;
  created_at: string;
  food_name: string;
  nutrients: Nutrients;
  date: string;
};

export type UserProfile = {
  id: string;
  dietary_preferences: string[];
  restrictions: string[];
  health_goals: string;
  daily_calorie_target: number;
  daily_protein_target: number;
  daily_carb_target: number;
  daily_fat_target: number;
};

type UserContextType = {
  userProfile: UserProfile | null;
  todayTotals: Nutrients;
  todayScans: ScanEntry[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  addScan: (scanData: any) => Promise<boolean>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<boolean>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayTotals, setTodayTotals] = useState<Nutrients>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [todayScans, setTodayScans] = useState<ScanEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    // 🛡️ DEV BYPASS HANDLING
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      console.log('📱 [DEV BYPASS] Using mock data for UserContext');
      setUserProfile({
        id: user.id,
        dietary_preferences: ['Vegan'],
        restrictions: ['Peanuts'],
        health_goals: 'Lose Weight',
        daily_calorie_target: 1800,
        daily_protein_target: 120,
        daily_carb_target: 200,
        daily_fat_target: 60
      });
      setTodayScans([]);
      setTodayTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      return;
    }

    setIsLoading(true);
    try {
      const today = moment().format('YYYY-MM-DD');
      
      // Fetch profile and scans in parallel
      const [profileRes, scansRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).single(),
        supabase.from('scans').select('*').eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false })
      ]);
      
      if (profileRes.data) {
        setUserProfile(profileRes.data);
      } else if (profileRes.error && profileRes.error.code === 'PGRST116') {
        // Profile doesn't exist, create default
        const defaultProfile = {
          id: user.id,
          dietary_preferences: [],
          restrictions: [],
          health_goals: 'Maintain Weight',
          daily_calorie_target: 2000,
          daily_protein_target: 150,
          daily_carb_target: 250,
          daily_fat_target: 70
        };
        const { data } = await supabase.from('user_profiles').insert(defaultProfile).select().single();
        if (data) setUserProfile(data);
      }

      if (scansRes.data) {
        const scans: ScanEntry[] = scansRes.data.map(item => ({
          id: item.id,
          created_at: item.created_at,
          food_name: item.food_name,
          date: item.date,
          nutrients: {
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
          }
        }));

        const totals = scans.reduce((acc, scan) => ({
          calories: acc.calories + scan.nutrients.calories,
          protein: acc.protein + scan.nutrients.protein,
          carbs: acc.carbs + scan.nutrients.carbs,
          fat: acc.fat + scan.nutrients.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

        setTodayTotals(totals);
        setTodayScans(scans);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateProfile = async (profile: Partial<UserProfile>) => {
    if (!user) return false;
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      setUserProfile(prev => prev ? { ...prev, ...profile } : null);
      return true;
    }
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(profile)
        .eq('id', user.id);
      
      if (error) throw error;
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  };

  const addScan = async (scanData: any) => {
    if (!user) return false;
    if (user.id === '00000000-0000-0000-0000-000000000000') {
      const newScan: ScanEntry = {
        id: Math.random().toString(),
        created_at: new Date().toISOString(),
        food_name: scanData.food_name,
        date: scanData.date,
        nutrients: {
          calories: scanData.nutrients.calories,
          protein: scanData.nutrients.protein,
          carbs: scanData.nutrients.carbs,
          fat: scanData.nutrients.fat,
        }
      };
      setTodayScans(prev => [newScan, ...prev]);
      setTodayTotals(prev => ({
        calories: prev.calories + newScan.nutrients.calories,
        protein: prev.protein + newScan.nutrients.protein,
        carbs: prev.carbs + newScan.nutrients.carbs,
        fat: prev.fat + newScan.nutrients.fat,
      }));
      return true;
    }
    try {
      const { error } = await supabase
        .from('scans')
        .insert({
          user_id: user.id,
          food_name: scanData.food_name,
          calories: scanData.nutrients.calories,
          protein: scanData.nutrients.protein,
          carbs: scanData.nutrients.carbs,
          fat: scanData.nutrients.fat,
          date: scanData.date,
        });

      if (error) throw error;
      
      await refreshData();
      return true;
    } catch (error) {
      console.error('Error adding scan:', error);
      return false;
    }
  };


  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <UserContext.Provider value={{ userProfile, todayTotals, todayScans, isLoading, refreshData, addScan, updateProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
