"use client";

import { create } from "zustand";

interface ChatState {
  open: boolean;
  /** A question another screen asked Finn to answer ("Ask Finn about it") */
  pending: string | null;
  setOpen: (open: boolean) => void;
  ask: (question: string) => void;
  takePending: () => string | null;
}

export const useChatStore = create<ChatState>()((set, get) => ({
  open: false,
  pending: null,
  setOpen: (open) => set({ open }),
  ask: (question) => set({ open: true, pending: question }),
  takePending: () => {
    const q = get().pending;
    if (q) set({ pending: null });
    return q;
  },
}));
