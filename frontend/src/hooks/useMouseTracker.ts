import { useEffect, useRef } from "react";
import { pb } from "../pocketbase";

const COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#f97316",
  "#14b8a6",
  "#ef4444",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
];

function getOrCreate(key: string, factory: () => string): string {
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const value = factory();
  localStorage.setItem(key, value);
  return value;
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function randomUsername() {
  const adj = [
    "Swift",
    "Quiet",
    "Bold",
    "Bright",
    "Cool",
    "Dark",
    "Witty",
    "Calm",
    "Keen",
    "Zesty",
  ];
  const noun = [
    "Fox",
    "Bear",
    "Wolf",
    "Hawk",
    "Lion",
    "Tiger",
    "Panda",
    "Eagle",
    "Lynx",
    "Otter",
  ];
  return (
    adj[Math.floor(Math.random() * adj.length)] +
    noun[Math.floor(Math.random() * noun.length)]
  );
}

export interface MyInfo {
  myUserId: string;
  username: string;
  color: string;
}

export function useMouseTracker(): MyInfo {
  const userId = getOrCreate("cursor_userId", randomId);
  const color = getOrCreate("cursor_color", randomColor);
  const username = getOrCreate("cursor_username", randomUsername);

  const recordIdRef = useRef<string | null>(null);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function createRecord(x = 0, y = 0) {
      try {
        const record = await pb.collection("cursor").create({
          Userid: userId,
          usename: username,
          color,
          x,
          y,
          active: true,
        });
        if (mounted) {
          recordIdRef.current = record.id;
          localStorage.setItem("cursor_recordId", record.id);
        }
      } catch (err) {
        console.error("[MouseTracker] Failed to create cursor record:", err);
      }
    }

    async function initRecord() {
      const existing = localStorage.getItem("cursor_recordId");
      if (existing) {
        try {
          await pb
            .collection("cursor")
            .update(existing, { active: true, x: 0, y: 0 });
          if (mounted) recordIdRef.current = existing;
          return;
        } catch {
          localStorage.removeItem("cursor_recordId");
        }
      }
      try {
        const found = await pb
          .collection("cursor")
          .getFirstListItem(`Userid = "${userId}"`);
        await pb
          .collection("cursor")
          .update(found.id, { active: true, x: 0, y: 0 });
        if (mounted) {
          recordIdRef.current = found.id;
          localStorage.setItem("cursor_recordId", found.id);
        }
        return;
      } catch {}
      await createRecord();
    }

    initRecord();

    function scheduleUpdate(x: number, y: number) {
      if (!recordIdRef.current) return;
      if (throttleRef.current) clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(async () => {
        if (!mounted || !recordIdRef.current) return;
        try {
          await pb.collection("cursor").update(recordIdRef.current, { x, y });
        } catch (err: any) {
          if (err?.status === 404) {
            recordIdRef.current = null;
            localStorage.removeItem("cursor_recordId");
            if (mounted) await createRecord(x, y);
          }
        }
      }, 50);
    }

    function onMouseMove(e: MouseEvent) {
      const dist = Math.hypot(
        e.clientX - lastXRef.current,
        e.clientY - lastYRef.current,
      );
      if (dist < 5) return;
      lastXRef.current = e.clientX;
      lastYRef.current = e.clientY;
      scheduleUpdate(e.clientX, e.clientY);
    }

    function onVisibilityChange() {
      if (!recordIdRef.current) return;
      pb.collection("cursor")
        .update(recordIdRef.current, { active: !document.hidden })
        .catch(() => {});
    }

    function cleanup() {
      const id = recordIdRef.current;
      recordIdRef.current = null;
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
      if (!id) return;
      localStorage.removeItem("cursor_recordId");
      pb.collection("cursor")
        .delete(id)
        .catch(() => {});
    }

    function onBeforeUnload() {
      const id = recordIdRef.current;
      if (!id) return;
      const url = pb.buildUrl(`/api/collections/cursor/records/${id}`);
      fetch(url, { method: "DELETE", keepalive: true }).catch(() => {});
    }

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      mounted = false;
      cleanup();
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [userId, username, color]);

  return { myUserId: userId, username, color };
}
