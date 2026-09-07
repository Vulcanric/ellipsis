import { create } from "zustand";

type UIState = { theme: "light" | "dark"; setTheme: (theme: "light" | "dark") => void };

export const useUIStore = create<UIState>((set) => ({
  theme: "light",
  setTheme: (theme) => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ellipsis-theme", theme);
    set({ theme });
  },
}));
