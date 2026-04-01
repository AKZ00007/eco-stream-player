import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import VideoPlayer from './VideoPlayer';
import { usePlayerStore } from '../store/usePlayerStore';

export default function PlayerRoot() {
  const state = usePlayerStore((s) => s.state);
  const prevStateRef = useRef(state);

  // Hook 1: Push dummy state to window.history when player opens FULL
  useEffect(() => {
    if (prevStateRef.current !== 'FULL' && state === 'FULL') {
      // Player maximized! Push a dummy layer to the browser history
      window.history.pushState({ playerFull: true }, '');
    } else if (prevStateRef.current === 'FULL' && state !== 'FULL') {
      // Player was manually minimized or closed.
      // Consume the dummy state if it's still there.
      if (window.history.state?.playerFull) {
        window.history.back();
      }
    }
    prevStateRef.current = state;
  }, [state]);

  // Hook 2: Intercept the Android/Phone back button via popstate
  useEffect(() => {
    const handlePopState = () => {
      const currentStoreState = usePlayerStore.getState().state;
      // If the hardware back button is pressed while FULL, minimize the player instead of closing.
      // If it's MINI, let the normal browser back navigation happen without closing the player.
      if (currentStoreState === 'FULL') {
        usePlayerStore.getState().minimizePlayer();
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {state !== 'CLOSED' && <VideoPlayer key="global-player" />}
    </AnimatePresence>
  );
}
