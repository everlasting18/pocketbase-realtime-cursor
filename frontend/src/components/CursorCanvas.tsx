import { CursorDot } from "./CursorDot";
import type { CursorMeta } from "../types";

interface Props {
  cursors: CursorMeta[];
  registerEl: (userId: string, el: HTMLElement | null) => void;
}

export function CursorCanvas({ cursors, registerEl }: Props) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {cursors.map((c) => (
        <CursorDot
          key={c.userId}
          cursor={c}
          onRef={(el) => registerEl(c.userId, el)}
        />
      ))}
    </div>
  );
}
