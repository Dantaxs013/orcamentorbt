'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ValuesVisibilityContextType {
  hideValues: boolean;
  toggleHideValues: () => void;
  formatCurrency: (amount: number) => string;
}

const ValuesVisibilityContext = createContext<ValuesVisibilityContextType>({
  hideValues: false,
  toggleHideValues: () => {},
  formatCurrency: (amount: number) => '',
});

export function ValuesVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hideValues, setHideValues] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('piatec_hide_values');
      if (saved !== null) {
        setHideValues(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleHideValues = () => {
    setHideValues((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('piatec_hide_values', String(next));
      } catch {}
      return next;
    });
  };

  const formatCurrencyWithVisibility = (amount: number) => {
    if (hideValues) return 'R$ ••••••';
    if (isNaN(amount) || amount === null || amount === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <ValuesVisibilityContext.Provider
      value={{
        hideValues,
        toggleHideValues,
        formatCurrency: formatCurrencyWithVisibility,
      }}
    >
      {children}
    </ValuesVisibilityContext.Provider>
  );
}

export function useValuesVisibility() {
  return useContext(ValuesVisibilityContext);
}
