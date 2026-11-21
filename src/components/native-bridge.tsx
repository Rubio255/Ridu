"use client";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/native";
import { PushNotifications } from "@capacitor/push-notifications";

// Programėlėje: paspaudus pranešimą atidaromas susijęs puslapis
export function NativeBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;
    const h = PushNotifications.addListener("pushNotificationActionPerformed", (a) => {
      const url = (a.notification.data as { url?: string } | undefined)?.url;
      if (url && url.startsWith("/")) location.href = url;
    });
    return () => { h.then((x) => x.remove()); };
  }, []);
  return null;
}
