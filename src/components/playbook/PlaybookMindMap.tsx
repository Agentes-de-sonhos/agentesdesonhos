import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { PlaybookSection } from "@/types/playbook";
import { PLAYBOOK_TABS } from "@/types/playbook";
import { ChevronRight } from "lucide-react";

// Color palette per depth level
const LEVEL_COLORS = [
  { bg: "hsl(var(--primary))", text: "#fff", border: "hsl(var(--primary))" },
  { bg: "#1e293b", text: "#e2e8f0", border: "#334155" },
  { bg: "#0f766e", text: "#fff", border: "#14b8a6" },
  { bg: "#7c3aed", text: "#fff", border: "#a78bfa" },
  { bg: "#c2410c", text: "#fff", border: "#f97316" },
  { bg: "#0369a1", text: "#fff", border: "#38bdf8" },
  { bg: "#4338ca", text: "#fff", border: "#818cf8" },
];

function getColor(depth: number) {
  return LEVEL_COLORS[Math.min(depth, LEVEL_COLORS.length - 1)];
}

// ── Custom Node ─────────────────────────────────────────────
interface MindMapNodeData {
  label: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: (id: string) => void;
  [key: string]: unknown;
}

function MindMapNode({ id, data }: NodeProps<Node<MindMapNodeData>>) {
  const { label, depth, hasChildren, expanded, onToggle } = data;
  const color = getColor(depth);
  const isRoot = depth === 0;

  return (
    <div
      onClick={() => hasChildren && onToggle(id)}
      className={cn(
        "flex items-center gap-2 rounded-xl border-2 shadow-lg select-none transition-all duration-200 cursor-pointer",
        isRoot ? "px-6 py-4" : "px-4 py-2.5",
        hasChildren && "hover:scale-105 hover:shadow-xl"
      )}
      style={{
        background: color.bg,
        borderColor: color.border,
        color: color.text,
        minWidth: isRoot ? 200 : 120,
        maxWidth: isRoot ? 320 : 260,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-none !w-0 !h-0" />
      <span
        className={cn(
          "font-semibold truncate flex-1",
          isRoot ? "text-base" : "text-sm"
        )}
      >
        {label}
      </span>
      {hasChildren && (
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-300",
            expanded && "rotate-90"
          )}
        />
      )}
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-none !w-0 !h-0" />
    </div>
  );
}

const nodeTypes = { mindmap: MindMapNode };

// ── Tree data structure ─────────────────────────────────────
interface TreeNode {
  id: string;
  label: string;
  children: TreeNode[];
}

function sectionsToTree(destinationName: string, sections: PlaybookSection[]): TreeNode {
  const root: TreeNode = { id: "root", label: destinationName, children: [] };

  for (const section of sections) {
    const tabInfo = PLAYBOOK_TABS.find((t) => t.key === section.tab_key);
    const tabLabel = tabInfo?.label || section.title;
    const tabNode: TreeNode = { id: `tab-${section.tab_key}`, label: tabLabel, children: [] };

    if (section.content.blocks) {
      for (const block of section.content.blocks) {
        const blockNode: TreeNode = {
          id: block.id,
          label: block.title || block.content.substring(0, 40),
          children: [],
        };
        if (block.items && block.items.length > 0) {
          for (let i = 0; i < block.items.length; i++) {
            blockNode.children.push({
              id: `${block.id}-item-${i}`,
              label: block.items[i],
              children: [],
            });
          }
        }
        tabNode.children.push(blockNode);
      }
    }

    if (tabNode.children.length > 0 || section.content.intro) {
      root.children.push(tabNode);
    }
  }

  return root;
}

// ── Layout engine ───────────────────────────────────────────
const NODE_HEIGHT = 46;
const V_GAP = 14;
const H_GAP = 220;

interface LayoutResult {
  nodes: Node<MindMapNodeData>[];
  edges: Edge[];
}

function layoutTree(
  tree: TreeNode,
  expandedSet: Set<string>,
  onToggle: (id: string) => void
): LayoutResult {
  const nodes: Node<MindMapNodeData>[] = [];
  const edges: Edge[] = [];

  function getSubtreeHeight(node: TreeNode, depth: number): number {
    if (node.children.length === 0 || !expandedSet.has(node.id)) {
      return NODE_HEIGHT;
    }
    const childHeights = node.children.map((c) => getSubtreeHeight(c, depth + 1));
    return childHeights.reduce((a, b) => a + b, 0) + (node.children.length - 1) * V_GAP;
  }

  function place(node: TreeNode, x: number, y: number, depth: number) {
    const expanded = expandedSet.has(node.id);
    const hasChildren = node.children.length > 0;

    nodes.push({
      id: node.id,
      type: "mindmap",
      position: { x, y },
      data: {
        label: node.label,
        depth,
        hasChildren,
        expanded,
        onToggle,
      },
    });

    if (hasChildren && expanded) {
      const totalH = getSubtreeHeight(node, depth);
      let currentY = y - totalH / 2 + NODE_HEIGHT / 2;

      for (const child of node.children) {
        const childH = getSubtreeHeight(child, depth + 1);
        const childY = currentY + childH / 2 - NODE_HEIGHT / 2;
        place(child, x + H_GAP, childY, depth + 1);
        edges.push({
          id: `e-${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          type: "smoothstep",
          style: { stroke: getColor(depth + 1).border, strokeWidth: 2 },
          animated: false,
        });
        currentY += childH + V_GAP;
      }
    }
  }

  place(tree, 0, 0, 0);
  return { nodes, edges };
}

// ── Main component ──────────────────────────────────────────
interface PlaybookMindMapProps {
  destinationName: string;
  sections: PlaybookSection[];
  onTabSelect?: (tabKey: string) => void;
}

export default function PlaybookMindMap({
  destinationName,
  sections,
  onTabSelect,
}: PlaybookMindMapProps) {
  const tree = useMemo(() => sectionsToTree(destinationName, sections), [destinationName, sections]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["root"]));

  const toggleNode = useCallback(
    (id: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
          // If it's a tab node, notify parent
          if (id.startsWith("tab-") && onTabSelect) {
            onTabSelect(id.replace("tab-", ""));
          }
        }
        return next;
      });
    },
    [onTabSelect]
  );

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutTree(tree, expandedIds, toggleNode),
    [tree, expandedIds, toggleNode]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

  // Sync layout when expandedIds changes
  useMemo(() => {
    // This is intentional — we use the layout results directly via key remount
  }, [layoutNodes, layoutEdges]);

  return (
    <div className="w-full h-[600px] md:h-[700px] rounded-2xl overflow-hidden border border-border bg-[#0f1117]">
      <ReactFlow
        key={JSON.stringify(expandedIds.size)}
        nodes={layoutNodes}
        edges={layoutEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls
          showInteractive={false}
          className="!bg-[#1e293b] !border-[#334155] !rounded-xl !shadow-xl [&>button]:!bg-[#1e293b] [&>button]:!border-[#334155] [&>button]:!text-slate-300 [&>button:hover]:!bg-[#334155]"
        />
        <MiniMap
          nodeColor={(n) => {
            const depth = (n.data as MindMapNodeData)?.depth ?? 0;
            return getColor(depth).bg;
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-[#1a1d2e] !border-[#334155] !rounded-xl"
        />
      </ReactFlow>
    </div>
  );
}
