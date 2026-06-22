"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "./ThemeProvider";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ServiceWorkerRegistration />
        {children}
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
