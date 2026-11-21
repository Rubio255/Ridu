"use client";
import { Capacitor } from "@capacitor/core";

// Ar puslapis atidarytas iOS programėlėje (ne naršyklėje)
export const isNativeApp = () => typeof window !== "undefined" && Capacitor.isNativePlatform();
