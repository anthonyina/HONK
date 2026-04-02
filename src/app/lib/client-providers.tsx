"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { type PropsWithChildren, useEffect } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { honkTheme } from "@/app/lib/honk-theme";
import { HeaderActionsProvider } from "@/app/lib/header-actions-context";
import { UploadAudioProvider } from "@/app/lib/upload-audio-context";

export default function ClientProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const { head } = document;

    if (!head || typeof head.removeChild !== "function") {
      return;
    }

    const originalRemoveChild = head.removeChild.bind(head);

    const safeRemoveChild: typeof head.removeChild = (child) => {
      if (!child || child.parentNode !== head) {
        return child;
      }

      return originalRemoveChild(child);
    };

    head.removeChild = safeRemoveChild;

    return () => {
      head.removeChild = originalRemoveChild;
    };
  }, []);

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ThemeProvider theme={honkTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools initialIsOpen={false} />
          <HeaderActionsProvider>
            <UploadAudioProvider>
              {children}
            </UploadAudioProvider>
          </HeaderActionsProvider>
        </QueryClientProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
