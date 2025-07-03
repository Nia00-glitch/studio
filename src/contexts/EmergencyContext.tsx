"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';
import type { Settings, Contact } from '@/lib/types';

interface EmergencyContextType {
  isEmergencyActive: boolean;
  triggerEmergency: () => void;
  deactivateEmergency: () => void;
  isOnline: boolean;
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  addContact: (contact: Omit<Contact, 'id'>) => void;
  updateContact: (contact: Contact) => void;
  deleteContact: (id: string) => void;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
}

const defaultSettings: Settings = {
  autoSendLocation: true,
  enableRecording: true,
  contacts: [],
};

export const EmergencyContext = createContext<EmergencyContextType>({
  isEmergencyActive: false,
  triggerEmergency: () => {},
  deactivateEmergency: () => {},
  isOnline: true,
  settings: defaultSettings,
  updateSettings: () => {},
  addContact: () => {},
  updateContact: () => {},
  deleteContact: () => {},
  isRecording: false,
  startRecording: () => {},
  stopRecording: () => {},
});

export const useEmergencyContext = () => {
    const context = useContext(EmergencyContext);
    if (!context) {
        throw new Error('useEmergencyContext must be used within an EmergencyProvider');
    }
    return context;
};

export const EmergencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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

  const triggerEmergency = useCallback(() => {
    setIsEmergencyActive(true);
  }, []);

  const deactivateEmergency = useCallback(() => {
    setIsEmergencyActive(false);
    setIsRecording(false); // Also stop recording when emergency is deactivated
  }, []);

  const startRecording = useCallback(() => {
    if (settings.enableRecording) {
      setIsRecording(true);
      console.log("Context: Recording started");
    } else {
      console.log("Context: Recording is disabled in settings.");
    }
  }, [settings.enableRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    console.log("Context: Recording stopped");
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
    triggerEmergency,
    deactivateEmergency,
    isOnline,
    settings,
    updateSettings,
    addContact,
    updateContact,
    deleteContact,
    isRecording,
    startRecording,
    stopRecording,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};
