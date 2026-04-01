import { useEffect } from 'react';
import { X } from 'lucide-react';
import './NotificationPopup.css';

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
  autoDismiss?: boolean;
  duration?: number;
}

export default function NotificationPopup({ visible, message, onClose, autoDismiss = true, duration = 3000 }: Props) {
  // Auto dismiss timer
  useEffect(() => {
    if (visible && autoDismiss) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, autoDismiss, duration, onClose]);

  if (!visible) return null;

  // Determine mobile vs desktop based on window width
  const isMobile = window.innerWidth < 768;

  return (
    <div className={isMobile ? 'popup-mobile' : 'popup-desktop'}>
      <div className="popup-content">
        <span>{message}</span>
        <button className="popup-close" onClick={onClose} aria-label="Close notification">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
