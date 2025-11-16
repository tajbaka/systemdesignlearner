import type { Edge, PlacedNode } from "@/app/components/types";

type Snapshot = { nodes: PlacedNode[]; edges: Edge[] };

export class UndoStack {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];

  push(snapshot: Snapshot) {
    this.past.push(structuredClone(snapshot));
    this.future = [];
  }

  undo(current: Snapshot): Snapshot | null {
    if (this.past.length === 0) return null;
    const prev = this.past.pop()!;
    this.future.push(structuredClone(current));
    return structuredClone(prev);
  }

  redo(current: Snapshot): Snapshot | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(structuredClone(current));
    return structuredClone(next);
  }
}
