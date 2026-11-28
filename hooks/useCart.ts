import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface CartStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setItems: (items: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addItem: (item: any) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
}

/**
 * The guest cart (signed-in donors keep theirs on the server). Kept in localStorage so a page
 * reload no longer empties it.
 */
export const useCart = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: (item) => set((state) => ({ items: [...state.items, item] })),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id)
      })),
      clearItems: () => set({ items: [] }),
    }),
    {
      name: 'yc-guest-cart',
      // Restored after mount (Navbar calls rehydrate), so the server and first client render agree.
      skipHydration: true,
      storage: createJSONStorage(() => {
        try {
          return window.localStorage;
        } catch {
          return { getItem: () => null, setItem: () => undefined, removeItem: () => undefined };
        }
      }),
      // Only real lines are kept; anything else in storage is ignored.
      partialize: (s) => ({ items: s.items.filter((i) => i && typeof i.id === 'string' && Number(i.amount) > 0) }),
    }
  )
);
