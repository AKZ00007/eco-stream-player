import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import NotificationPopup from './NotificationPopup';

interface NotificationContextProps {
  showNotification: (message?: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string>('');

  const hide = useCallback(() => setVisible(false), []);

  const showNotification = useCallback((msg?: string) => {
    if (msg) {
      setMessage(msg);
    } else {
      const msgs = [
        'Feature coming soon!',
        'Stay tuned!',
        'Exciting feature on the way!',
        "We're working on this!"
      ];
      setMessage(msgs[Math.floor(Math.random() * msgs.length)]);
    }
    setVisible(true);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationPopup
        visible={visible}
        message={message}
        onClose={hide}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextProps => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
};
