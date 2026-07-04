"use client";

import { useContext } from "react";
import { ThemeContext } from "@/components/layout/ThemeProvider";

export const useTenant = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTenant must be used inside ThemeProvider");
  }
  return context;
};