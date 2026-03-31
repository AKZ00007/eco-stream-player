import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import VideoPlayer from './VideoPlayer';
import { usePlayerStore } from '../store/usePlayerStore';

export default function PlayerRoot() {
  const state = usePlayerStore((s) => s.state);
  const prevStateRef = useRef(state);

  // Hook 1: Push dummy state to window.history when player opens
  useEffect(() => {
    if (prevStateRef.current === 'CLOSED' && state !== 'CLOSED') {
      // Player opened! Push a dummy layer to the browser history
      window.history.pushState({ playerOpen: true }, '');
    } else if (prevStateRef.current !== 'CLOSED' && state === 'CLOSED') {
      // Player was manually closed (e.g. by dragging or clicking X).
      // We must consume the dummy state if it's still there to avoid trapping the user.
      if (window.history.state?.playerOpen) {
        window.history.back();
      }
    }
    prevStateRef.current = state;
  }, [state]);

  // Hook 2: Intercept the Android/Phone back button via popstate
  useEffect(() => {
    const handlePopState = () => {
      // The browser actually already popped the state off the stack.
      // If the player is currently open, this pop should CLOSE the player.
      const currentStoreState = usePlayerStore.getState().state;
      if (currentStoreState !== 'CLOSED') {
        usePlayerStore.getState().closePlayer();
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
