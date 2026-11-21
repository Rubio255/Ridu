"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile apsauga nuo robotų prisijungimo formoje (nemokama).
// Veikia tik nustačius NEXT_PUBLIC_TURNSTILE_SITE_KEY; tada Supabase nustatymuose įjunkite „Enable Captcha protection“ (Turnstile).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type Turnstile = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id: string) => void };
declare global { interface Window { turnstile?: Turnstile } }

export function useCaptcha() {
  const [token, setToken] = useState<string | undefined>();
  const widget = useRef<string | null>(null);
  const reset = useCallback(() => {
    setToken(undefined);
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, []);
  return { token, setToken, widget, reset, ready: !SITE_KEY || !!token };
}

export function Captcha({ c }: { c: ReturnType<typeof useCaptcha> }) {
  const box = useRef<HTMLDivElement>(null);
  const { setToken, widget } = c;
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    const el = box.current;
    const draw = () => {
      if (!window.turnstile || el.childElementCount) return;
      widget.current = window.turnstile.render(el, {
        sitekey: SITE_KEY, language: "lt", appearance: "interaction-only",
        callback: (t: string) => setToken(t), "expired-callback": () => setToken(undefined), "error-callback": () => setToken(undefined),
      });
    };
    if (window.turnstile) { draw(); return; }
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true; s.onload = draw;
    document.head.appendChild(s);
  }, [setToken, widget]);
  return SITE_KEY ? <div ref={box} className="min-h-0 justify-self-center" /> : null;
}
