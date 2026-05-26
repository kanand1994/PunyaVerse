import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { BACKEND_URL } from "@/lib/api";
import { toast } from "sonner";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem("pv_token");
    if (!token || !user) return;
    const wsUrl = BACKEND_URL.replace(/^http/, "ws") + `/api/ws/notifications?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "connected" || data.type === "pong") return;
        setNotifications((n) => [{ ...data, _id: Date.now() }, ...n]);
        if (data.title) toast.success(data.title, { description: data.message });
      } catch { /* noop */ }
    };
    ws.onclose = () => {
      // Reconnect after 3s if user still logged in
      setTimeout(() => { if (localStorage.getItem("pv_token")) connect(); }, 3000);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* noop */ } };
  }, [user]);

  useEffect(() => {
    if (user) connect();
    return () => { try { wsRef.current?.close(); } catch { /* noop */ } };
  }, [user, connect]);

  return { notifications };
}
