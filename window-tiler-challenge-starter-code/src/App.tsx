import React, { useEffect, useState } from "react";

interface WindowItem {
  id: number;
  title: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isSnapped?: boolean;
}

type NodeId = string;

interface LayoutLeaf {
  id: NodeId;
  type: "leaf";
  windowId?: number | null;
}

interface LayoutSplit {
  id: NodeId;
  type: "split";
  orientation: "vertical" | "horizontal";
  ratio: number;
  first: LayoutNode;
  second: LayoutNode;
}

type LayoutNode = LayoutLeaf | LayoutSplit;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapPreview {
  x: number;
  y: number;
  width: number;
  height: number;
  targetNodeId?: NodeId | null;
  side: "left" | "right" | "top" | "bottom";
}

const makeId = (prefix = "n") => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8E8", "#F7DC6F"];
const WINDOW_SIZE = { width: 320, height: 200 };
const SNAP_DISTANCE = 50;

const defaultLeaf = (): LayoutLeaf => ({ id: makeId("leaf"), type: "leaf", windowId: null });

const deepClone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const RewrittenApp: React.FC = () => {
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [rootNode, setRootNode] = useState<LayoutNode | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: window.innerWidth, height: window.innerHeight });

  const [dragging, setDragging] = useState<{ windowId: number; offsetX: number; offsetY: number } | null>(null);
  const [snapPreview, setSnapPreview] = useState<SnapPreview | null>(null);

  const createWindow = () => {
    const id = Date.now();
    setWindows(prev => {
      const w: WindowItem = {
        id,
        title: `Node ${prev.length + 1}`,
        color: COLORS[prev.length % COLORS.length],
        x: Math.random() * Math.max(0, viewport.width - WINDOW_SIZE.width),
        y: Math.random() * Math.max(0, viewport.height - WINDOW_SIZE.height),
        width: WINDOW_SIZE.width,
        height: WINDOW_SIZE.height,
        isSnapped: false,
      };
      return [...prev, w];
    });
  };

  const computeBounds = (node: LayoutNode | null, x: number, y: number, width: number, height: number, map: Map<NodeId, Bounds>) => {
    if (!node) return;
    map.set(node.id, { x, y, width, height });
    if (node.type === "split") {
      if (node.orientation === "vertical") {
        const firstW = Math.floor(width * node.ratio);
        const secondW = width - firstW;
        computeBounds(node.first, x, y, firstW, height, map);
        computeBounds(node.second, x + firstW, y, secondW, height, map);
      } else {
        const firstH = Math.floor(height * node.ratio);
        const secondH = height - firstH;
        computeBounds(node.first, x, y, width, firstH, map);
        computeBounds(node.second, x, y + firstH, width, secondH, map);
      }
    }
  };

  const findDeepestNodeAtPoint = (node: LayoutNode | null, x: number, y: number, width: number, height: number, px: number, py: number): LayoutNode | null => {
    if (!node) return null;
    if (px < x || px > x + width || py < y || py > y + height) return null;
    if (node.type === "leaf") return node;
    if (node.orientation === "vertical") {
      const firstW = Math.floor(width * node.ratio);
      const childA = findDeepestNodeAtPoint(node.first, x, y, firstW, height, px, py);
      if (childA) return childA;
      return findDeepestNodeAtPoint(node.second, x + firstW, y, width - firstW, height, px, py);
    }
    const firstH = Math.floor(height * node.ratio);
    const childA = findDeepestNodeAtPoint(node.first, x, y, width, firstH, px, py);
    if (childA) return childA;
    return findDeepestNodeAtPoint(node.second, x, y + firstH, width, height - firstH, px, py);
  };

  const hitTestForPreview = (px: number, py: number): SnapPreview | null => {
    const map = new Map<NodeId, Bounds>();
    if (rootNode) computeBounds(rootNode, 0, 0, viewport.width, viewport.height, map);

    const targetNode = rootNode ? findDeepestNodeAtPoint(rootNode, 0, 0, viewport.width, viewport.height, px, py) : null;

    if (targetNode) {
      const b = map.get(targetNode.id)!;
      const distLeft = px - b.x;
      const distRight = b.x + b.width - px;
      const distTop = py - b.y;
      const distBottom = b.y + b.height - py;
      const minD = Math.min(distLeft, distRight, distTop, distBottom);
      if (minD > SNAP_DISTANCE) return null;
      if (minD === distLeft) return { x: b.x, y: b.y, width: Math.round(b.width / 2), height: b.height, targetNodeId: targetNode.id, side: "left" };
      if (minD === distRight) return { x: b.x + Math.round(b.width / 2), y: b.y, width: Math.round(b.width / 2), height: b.height, targetNodeId: targetNode.id, side: "right" };
      if (minD === distTop) return { x: b.x, y: b.y, width: b.width, height: Math.round(b.height / 2), targetNodeId: targetNode.id, side: "top" };
      return { x: b.x, y: b.y + Math.round(b.height / 2), width: b.width, height: Math.round(b.height / 2), targetNodeId: targetNode.id, side: "bottom" };
    }

    if (px <= SNAP_DISTANCE) return { x: 0, y: 0, width: Math.round(viewport.width / 2), height: viewport.height, targetNodeId: null, side: "left" };
    if (px >= viewport.width - SNAP_DISTANCE) return { x: Math.round(viewport.width / 2), y: 0, width: Math.round(viewport.width / 2), height: viewport.height, targetNodeId: null, side: "right" };
    if (py <= SNAP_DISTANCE) return { x: 0, y: 0, width: viewport.width, height: Math.round(viewport.height / 2), targetNodeId: null, side: "top" };
    if (py >= viewport.height - SNAP_DISTANCE) return { x: 0, y: Math.round(viewport.height / 2), width: viewport.width, height: Math.round(viewport.height / 2), targetNodeId: null, side: "bottom" };
    return null;
  };

  const makeSplit = (existingNode: LayoutNode, newLeafOnFirst: boolean, orientation: "vertical" | "horizontal") : LayoutNode => {
    const existingClone = deepClone(existingNode);
    const newLeaf: LayoutLeaf = { id: makeId("leaf"), type: "leaf", windowId: null };
    const first = newLeafOnFirst ? newLeaf : existingClone;
    const second = newLeafOnFirst ? existingClone : newLeaf;
    return { id: makeId("split"), type: "split", orientation, ratio: 0.5, first, second } as LayoutSplit;
  };

  const insertIntoLayout = (windowId: number, targetNodeId: NodeId | null, side: "left" | "right" | "top" | "bottom") => {
    setRootNode(prev => {
      const orientation = (side === "left" || side === "right") ? "vertical" : "horizontal";

      if (!prev) {
        const empty = defaultLeaf();
        const winLeaf: LayoutLeaf = { id: makeId("leaf"), type: "leaf", windowId };
        const newFirstIsWindow = (side === "left" || side === "top");
        const first = newFirstIsWindow ? winLeaf : empty;
        const second = newFirstIsWindow ? empty : winLeaf;
        return { id: makeId("split"), type: "split", orientation, ratio: 0.5, first, second } as LayoutSplit;
      }

      if (targetNodeId == null) {
        const existingClone = deepClone(prev);
        const winLeaf: LayoutLeaf = { id: makeId("leaf"), type: "leaf", windowId };
        const newFirstIsWindow = (side === "left" || side === "top");
        const first = newFirstIsWindow ? winLeaf : existingClone;
        const second = newFirstIsWindow ? existingClone : winLeaf;
        return { id: makeId("split"), type: "split", orientation, ratio: 0.5, first, second } as LayoutSplit;
      }

      const replaceNode = (node: LayoutNode | null, targetId: NodeId): LayoutNode | null => {
        if (!node) return null;
        if (node.id === targetId) {
          if (node.type === "leaf") {
            if (node.windowId == null) {
              return { ...node, windowId: windowId } as LayoutLeaf;
            }
            const newLeafForWindow: LayoutLeaf = { id: makeId("leaf"), type: "leaf", windowId };
            const existingClone = deepClone(node);
            const newFirstIsWindow = (side === "left" || side === "top");
            const first = newFirstIsWindow ? newLeafForWindow : existingClone;
            const second = newFirstIsWindow ? existingClone : newLeafForWindow;
            return { id: makeId("split"), type: "split", orientation, ratio: 0.5, first, second } as LayoutSplit;
          }

          const newLeafForWindow: LayoutLeaf = { id: makeId("leaf"), type: "leaf", windowId };
          const existingClone = deepClone(node);
          const newFirstIsWindow = (side === "left" || side === "top");
          const first = newFirstIsWindow ? newLeafForWindow : existingClone;
          const second = newFirstIsWindow ? existingClone : newLeafForWindow;
          return { id: makeId("split"), type: "split", orientation, ratio: 0.5, first, second } as LayoutSplit;
        }

        if (node.type === "split") {
          const replacedFirst = replaceNode(node.first, targetId);
          const replacedSecond = replaceNode(node.second, targetId);
          if (replacedFirst === node.first && replacedSecond === node.second) return node;
          return { ...node, first: replacedFirst ?? node.first, second: replacedSecond ?? node.second } as LayoutSplit;
        }

        return node;
      };

      const newRoot = replaceNode(prev, targetNodeId);
      return newRoot ?? prev;
    });

    setWindows(prev => prev.map(w => (w.id === windowId ? { ...w, isSnapped: true } : w)));
  };

  const removeWindowFromLayout = (windowId: number) => {
    const remove = (node: LayoutNode | null): LayoutNode | null => {
      if (!node) return null;
      if (node.type === "leaf") {
        if (node.windowId === windowId) return null;
        return node;
      }

      const f = remove(node.first);
      const s = remove(node.second);

      if (!f && !s) return null;
      if (!f && s) return s;
      if (!s && f) return f;

      return { ...node, first: f, second: s } as LayoutSplit;
    };

    setRootNode(prev => remove(prev));
    setWindows(prev => prev.map(w => (w.id === windowId ? { ...w, isSnapped: false } : w)));
  };

  const deleteWindow = (windowId: number) => {
    removeWindowFromLayout(windowId);
    setWindows(prev => prev.filter(w => w.id !== windowId));
  };

  const onMouseDownWindow = (e: React.MouseEvent, w: WindowItem) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging({ windowId: w.id, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top });
  };

  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (!dragging) return;
      setWindows(prev => prev.map(w => {
        if (w.id !== dragging.windowId) return w;
        const nx = Math.max(0, Math.min(ev.clientX - dragging.offsetX, viewport.width - w.width));
        const ny = Math.max(0, Math.min(ev.clientY - dragging.offsetY, viewport.height - w.height));
        return { ...w, x: nx, y: ny };
      }));

      const preview = hitTestForPreview(ev.clientX, ev.clientY);
      setSnapPreview(preview);
    };

    const onUp = () => {
      if (dragging) {
        if (snapPreview && dragging.windowId != null) {
          insertIntoLayout(dragging.windowId, snapPreview.targetNodeId ?? null, snapPreview.side);
          setSnapPreview(null);
        }
      }
      setDragging(null);
      setSnapPreview(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, viewport, snapPreview, rootNode]);

  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const nodeToElements = (node: LayoutNode | null, x: number, y: number, width: number, height: number): React.ReactNode[] => {
    if (!node) return [];
    if (node.type === "leaf") {
      if (node.windowId == null) return [];
      const w = windows.find(p => p.id === node.windowId);
      if (!w) return [];
      return [(
        <div key={node.id}
          className="absolute shadow-lg"
          style={{ left: x, top: y, width, height, backgroundColor: w.color, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ height: 36, background: '#6b7280', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 8px', cursor: 'grab' }}>
            <button onClick={() => deleteWindow(w.id)} style={{ color: 'white', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ paddingTop: 20, textAlign: 'center', color: 'white', fontWeight: 700 }}>{w.title}</div>
        </div>
      )];
    }

    if (node.orientation === "vertical") {
      const firstW = Math.floor(width * node.ratio);
      const secondW = width - firstW;
      return [
        ...nodeToElements(node.first, x, y, firstW, height),
        ...nodeToElements(node.second, x + firstW, y, secondW, height)
      ];
    }

    const firstH = Math.floor(height * node.ratio);
    const secondH = height - firstH;
    return [
      ...nodeToElements(node.first, x, y, width, firstH),
      ...nodeToElements(node.second, x, y + firstH, width, secondH)
    ];
  };

  const snappedElements = nodeToElements(rootNode, 0, 0, viewport.width, viewport.height);

  const floatingElements = windows.filter(w => !w.isSnapped).map(w => (
    <div key={w.id}
      className="absolute shadow-lg"
      style={{ left: w.x, top: w.y, width: w.width, height: w.height, backgroundColor: w.color, borderRadius: 12, overflow: 'hidden', zIndex: dragging?.windowId === w.id ? 2000 : 10 }}>
      <div style={{ height: 36, background: '#6b7280', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0 8px', cursor: 'grab' }} onMouseDown={(e) => onMouseDownWindow(e, w)}>
        <button onClick={() => deleteWindow(w.id)} style={{ color: 'white', border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
      </div>
      <div style={{ paddingTop: 20, textAlign: 'center', color: 'white', fontWeight: 700 }}>{w.title}</div>
    </div>
  ));

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f3f4f6', overflow: 'hidden' }}>
      {snapPreview && (
        <div style={{ position: 'absolute', left: snapPreview.x, top: snapPreview.y, width: snapPreview.width, height: snapPreview.height, background: 'rgba(0,0,0,0.18)', pointerEvents: 'none', zIndex: 9999 }} />
      )}

      {snappedElements}
      {floatingElements}

      <button onClick={createWindow} style={{ position: 'fixed', right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28, background: '#4b5563', color: 'white', fontSize: 28, border: 'none' }}>+</button>
    </div>
  );
};

export default RewrittenApp;
