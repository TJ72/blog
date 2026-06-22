"use client";

import { ThemeProvider } from "next-themes";

// Client boundary for next-themes. `attribute="class"` toggles `.dark` on
// <html>; `defaultTheme="system"` + `enableSystem` means: follow the OS until
// the user picks a theme, then persist that choice in localStorage.
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
