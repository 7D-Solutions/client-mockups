import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { userPreferencesService } from '../services/userPreferencesService';
import { logger } from '../utils/logger';

interface TooltipContextType {
  tooltipsEnabled: boolean;
  toggleTooltips: () => void;
  setTooltipsEnabled: (enabled: boolean) => void;
}

const TooltipContext = createContext<TooltipContextType | undefined>(undefined);

const TOOLTIP_PREFERENCE_KEY = 'ui.tooltips.enabled';

export const TooltipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tooltipsEnabled, setTooltipsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load tooltip preference from backend on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedValue = await userPreferencesService.getPreference<boolean>(
          TOOLTIP_PREFERENCE_KEY,
          true // default to enabled
        );
        setTooltipsEnabled(savedValue ?? true);
      } catch (error) {
        logger.error('Failed to load tooltip preference:', error);
        setTooltipsEnabled(true); // fallback to enabled
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, []);

  const toggleTooltips = () => {
    setTooltipsEnabled(prev => {
      const newValue = !prev;
      // Save to backend (debounced)
      userPreferencesService.savePreference(TOOLTIP_PREFERENCE_KEY, newValue);
      return newValue;
    });
  };

  const handleSetTooltipsEnabled = (enabled: boolean) => {
    setTooltipsEnabled(enabled);
    // Save to backend (debounced)
    userPreferencesService.savePreference(TOOLTIP_PREFERENCE_KEY, enabled);
  };

  return (
    <TooltipContext.Provider value={{
      tooltipsEnabled,
      toggleTooltips,
      setTooltipsEnabled: handleSetTooltipsEnabled
    }}>
      {children}
    </TooltipContext.Provider>
  );
};

export const useTooltips = () => {
  const context = useContext(TooltipContext);
  if (context === undefined) {
    throw new Error('useTooltips must be used within a TooltipProvider');
  }
  return context;
};
