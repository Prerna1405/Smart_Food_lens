import React, { createContext, useContext, useState, ReactNode } from 'react';

type Nutrients = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type UserContextType = {
  todayTotals: Nutrients;
  updateTodayTotals: (totals: Nutrients) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [todayTotals, setTodayTotals] = useState<Nutrients>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const updateTodayTotals = (totals: Nutrients) => {
    setTodayTotals(totals);
  };

  return (
    <UserContext.Provider value={{ todayTotals, updateTodayTotals }}>
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
