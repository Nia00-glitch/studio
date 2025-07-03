"use client";

import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Settings, Contact } from '@/lib/types';

interface EmergencyContextType {
  isEmergencyActive: boolean;
  activateEmergency: () => void;
  deactivateEmergency: () => void;
  isOnline: boolean;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;
}

const defaultSettings: Settings = {
  autoSendLocation: true,
  enableRecording: true,
  contacts: [],
};

export const EmergencyContext = createContext<EmergencyContextType>({
  isEmergencyActive: false,
  activateEmergency: () => {},
  deactivateEmergency: () => {},
  isOnline: true,
  settings: defaultSettings,
  updateSettings: () => {},
  addContact: () => {},
  updateContact: () => {},
  deleteContact: () => {},
});

export const EmergencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [settings, setSettings] = useLocalStorage<Settings>('nia-settings', defaultSettings);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
        setIsOnline(navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
    }
    
    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        }
    };
  }, []);

  const activateEmergency = useCallback(() => {
    setIsEmergencyActive(true);
  }, []);

  const deactivateEmergency = useCallback(() => {
    setIsEmergencyActive(false);
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const addContact = (contact: Omit<Contact, 'id'>) => {
    if (settings.contacts.length >= 3) return;
    const newContact = { ...contact, id: Date.now().toString() };
    setSettings(prev => ({ ...prev, contacts: [...prev.contacts, newContact] }));
  };

  const updateContact = (updatedContact: Contact) => {
    setSettings(prev => ({
      ...prev,
      contacts: prev.contacts.map(c => c.id === updatedContact.id ? updatedContact : c),
    }));
  };

  const deleteContact = (id: string) => {
    setSettings(prev => ({
      ...prev,
      contacts: prev.contacts.filter(c => c.id !== id),
    }));
  };

  const value = {
    isEmergencyActive,
    activateEmergency,
    deactivateEmergency,
    isOnline,
    settings,
    updateSettings,
    addContact,
    updateContact,
    deleteContact,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
