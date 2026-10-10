"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const DEFAULT_STYLE = "Japandi";

export type StyleSelection = {
  style: string;
  // Raw setState from the provider — identity is stable across renders,
  // so consumers can safely depend on it inside effects.
  setStyle: (next: string) => void;
};

const StyleSelectionContext = createContext<StyleSelection | null>(null);

/**
 * Optional shared style selection. Wrap a page section (or page) so the
 * RoomGenerator and any style-picking UI read and write ONE style state.
 * Outside a provider both fall back to their own local state, so existing
 * usages (e.g. the home page generator) behave exactly as before.
 */
export function StyleSelectionProvider({ initialStyle = DEFAULT_STYLE, children }: { initialStyle?: string; children: ReactNode }) {
  const [style, setStyle] = useState(initialStyle);
  const value = useMemo<StyleSelection>(() => ({ style, setStyle }), [style]);
  return <StyleSelectionContext.Provider value={value}>{children}</StyleSelectionContext.Provider>;
}

export function useOptionalStyleSelection() {
  return useContext(StyleSelectionContext);
}
