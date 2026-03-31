import { create } from 'zustand';

interface LayoutState {
  isSidebarExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (val: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  isSidebarExpanded: false,
  toggleSidebar: () => set((state) => ({ isSidebarExpanded: !state.isSidebarExpanded })),
  setSidebarExpanded: (val) => set({ isSidebarExpanded: val }),
}));
