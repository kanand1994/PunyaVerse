import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const stoppedRef = useRef(false);

  const connect = useCallback(() => {
    if (stoppedRef.current) return;
    const token = localStorage.getItem("pv_token");
    if (!token || !user) return;
    let ws;
    try {
      const wsUrl = BACKEND_URL.replace(/^http/, "ws") + `/api/ws/notifications?token=${token}`;
      ws = new WebSocket(wsUrl);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("WS init failed:", e);
      return;
    }
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.error === "auth_failed") { stoppedRef.current = true; return; }
        if (data.type === "connected" || data.type === "pong") return;
        setNotifications((n) => [{ ...data, _id: Date.now() }, ...n]);
        if (data.title) toast.success(data.title, { description: data.message });
      } catch {
        /* ignore malformed frame */
      }
    };

    ws.onclose = () => {
      if (stoppedRef.current) return;
      setTimeout(() => {
        if (!stoppedRef.current && localStorage.getItem("pv_token")) connect();
      }, 5000);
    };

    ws.onerror = () => {
      try { ws.close(); } catch { /* noop */ }
    };
  }, [user]);

  useEffect(() => {
    stoppedRef.current = false;
    if (user) connect();
    return () => {
      stoppedRef.current = true;
      try { wsRef.current?.close(); } catch { /* noop */ }
    };
  }, [user, connect]);

  return { notifications };
}
