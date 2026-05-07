import { useCallback, useEffect, useRef, useState } from "react";
import { pb } from "../pocketbase";
import type { CursorMeta, CursorPos } from "../types";

const LERP = 0.18;

export interface UseCursorsResult {
  cursors: CursorMeta[];
  registerEl: (userId: string, el: HTMLElement | null) => void;
}

function startRaf(
  rafRef: React.MutableRefObject<number | null>,
  posRef: React.MutableRefObject<Map<string, CursorPos>>,
  domRef: React.MutableRefObject<Map<string, HTMLElement>>,
) {
  if (rafRef.current !== null) return; // already running

  function animate() {
    posRef.current.forEach((pos, userId) => {
      const el = domRef.current.get(userId);
      if (!el) return;
      pos.displayX += (pos.targetX - pos.displayX) * LERP;
      pos.displayY += (pos.targetY - pos.displayY) * LERP;
      el.style.transform = `translate(${Math.round(pos.displayX)}px, ${Math.round(pos.displayY)}px)`;
    });

    if (posRef.current.size > 0) {
      rafRef.current = requestAnimationFrame(animate);
    } else {
      rafRef.current = null; // stop the loop
    }
  }

  rafRef.current = requestAnimationFrame(animate);
}

export function useCursors(myUserId: string): UseCursorsResult {
  const [cursors, setCursors] = useState<CursorMeta[]>([]);
  const posRef = useRef<Map<string, CursorPos>>(new Map());
  const domRef = useRef<Map<string, HTMLElement>>(new Map());
  const rafRef = useRef<number | null>(null);

  const registerEl = useCallback((userId: string, el: HTMLElement | null) => {
    if (el) domRef.current.set(userId, el);
    else domRef.current.delete(userId);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    let unsub: (() => void) | null = null;

    function onSseEvent(e: any) {
      if (e.record.Userid === myUserId) return;

      if (e.action === "delete" || e.record.active === false) {
        posRef.current.delete(e.record.Userid);
        domRef.current.delete(e.record.Userid);
        setCursors((prev) =>
          prev.filter((c) => c.userId !== e.record.Userid),
        );
        return;
      }

      const existing = posRef.current.get(e.record.Userid);
      if (!existing) {
        posRef.current.set(e.record.Userid, {
          displayX: e.record.x,
          displayY: e.record.y,
          targetX: e.record.x,
          targetY: e.record.y,
        });
        setCursors((prev) => [
          ...prev.filter((c) => c.userId !== e.record.Userid),
          {
            userId: e.record.Userid,
            username: e.record.usename,
            color: e.record.color,
          },
        ]);
        startRaf(rafRef, posRef, domRef);
      } else {
        existing.targetX = e.record.x;
        existing.targetY = e.record.y;
        startRaf(rafRef, posRef, domRef);
      }
    }

    async function subscribe() {
      unsub = await pb.collection("cursor").subscribe("*", onSseEvent);
    }

    subscribe().catch(console.error);

    return () => {
      unsub?.();
    };
  }, [myUserId]);

  return { cursors, registerEl };
}
