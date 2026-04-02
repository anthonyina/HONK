"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ContextValue = {
  rightAction: ReactNode;
  setRightAction: (node: ReactNode) => void;
};

const HeaderActionsContext = createContext<ContextValue>({
  rightAction: null,
  setRightAction: () => {},
});

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [rightAction, setRightAction] = useState<ReactNode>(null);
  return (
    <HeaderActionsContext.Provider value={{ rightAction, setRightAction }}>
      {children}
    </HeaderActionsContext.Provider>
  );
}

export function useHeaderActions() {
  return useContext(HeaderActionsContext);
}
