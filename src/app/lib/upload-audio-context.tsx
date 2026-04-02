"use client";

import { createContext, useContext, useState } from "react";

type ContextValue = {
  handler: ((file: File) => void) | null;
  setHandler: (fn: ((file: File) => void) | null) => void;
};

const UploadAudioContext = createContext<ContextValue>({
  handler: null,
  setHandler: () => {},
});

export function UploadAudioProvider({ children }: { children: React.ReactNode }) {
  const [handler, setHandlerState] = useState<((file: File) => void) | null>(null);
  // wrap so React doesn't treat the function as an updater
  const setHandler = (fn: ((file: File) => void) | null) => setHandlerState(() => fn);
  return (
    <UploadAudioContext.Provider value={{ handler, setHandler }}>
      {children}
    </UploadAudioContext.Provider>
  );
}

export function useUploadAudio() {
  return useContext(UploadAudioContext);
}
