"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProvider as FlowbiteThemeProvider } from "flowbite-react";
import { setStore } from "flowbite-react/store";
import { flowbiteClearTheme, flowbiteTheme } from "./flowbiteTheme";

// Flowbite emits Tailwind v3 class names unless told otherwise, and next-themes
// owns the `.dark` class, so Flowbite only has to generate the dark variants.
setStore({ version: 4, dark: true });

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FlowbiteThemeProvider theme={flowbiteTheme} clearTheme={flowbiteClearTheme}>
        {children}
      </FlowbiteThemeProvider>
    </NextThemesProvider>
  );
}

export default Providers;
