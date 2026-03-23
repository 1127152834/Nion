"use client";

import { createContext, useContext } from "react";

import type { SettingsSection } from "./settings-sections";

type SettingsDialogContextValue = {
  activeSection: SettingsSection;
  goToSection: (section: SettingsSection) => void;
};

const SettingsDialogContext = createContext<SettingsDialogContextValue | null>(
  null,
);

export const SettingsDialogProvider = SettingsDialogContext.Provider;

export function useSettingsDialog() {
  const context = useContext(SettingsDialogContext);
  if (!context) {
    throw new Error("useSettingsDialog must be used within SettingsDialogProvider");
  }
  return context;
}

