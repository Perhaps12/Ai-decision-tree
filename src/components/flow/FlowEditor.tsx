"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";

import { Button } from "@/components/ui/button";
import DecisionNode from "./DecisionNode";

const nodeTypes = {
  decision: DecisionNode,
};

const initialNodes: Node[] = [
  {
    id: "1",
    type: "decision",
    position: {
      x: 250,
      y: 100,
    },
    data: {
      prompt: "Is this a support request?",
    },
  },
];

const initialEdges: Edge[] = [];

export default function FlowEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [hasLoaded, setHasLoaded] = useState(false);

  // Load workflow from localStorage once when the page opens
  useEffect(() => {
    const saved = localStorage.getItem("workflow");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        if (parsed.nodes) {
          setNodes(parsed.nodes);
        }

        if (parsed.edges) {
          setEdges(parsed.edges);
        }
      } catch {
        console.error("Failed to load workflow");
      }
    }

    setHasLoaded(true);
  }, [setNodes, setEdges]);

  // Save workflow whenever nodes or edges change
  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    localStorage.setItem(
      "workflow",
      JSON.stringify({
        nodes,
        edges,
      })
    );
  }, [nodes, edges, hasLoaded]);

  const updatePrompt = useCallback(
    (nodeId: string, prompt: string) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  prompt,
                },
              }
            : node
        )
      );
    },
    [setNodes]
  );

  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onPromptChange: updatePrompt,
    },
  }));

  const onConnect = useCallback(
    (connection: Connection) => {
        const decision =
        connection.sourceHandle === "yes"
            ? "YES"
            : "NO";

        const duplicateEdge = edges.some(
        (edge) =>
            edge.source === connection.source &&
            edge.sourceHandle === connection.sourceHandle
        );

        if (duplicateEdge) {
        return;
        }

        const newEdge: Edge = {
        ...connection,
        id: `edge-${crypto.randomUUID()}`,
        label: decision,
        data: {
            decision,
        },
        };

        setEdges((currentEdges) =>
        addEdge(newEdge, currentEdges)
        );
    },
    [edges, setEdges]
    );

  const addDecisionNode = () => {
    const id = crypto.randomUUID();

    const newNode: Node = {
      id,
      type: "decision",
      position: {
        x: Math.random() * 400,
        y: Math.random() * 300,
      },
      data: {
        prompt: "",
      },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);
  };

  return (
    <div className="h-screen w-screen">
      <div className="absolute left-4 top-4 z-10">
        <Button onClick={addDecisionNode}>
          Add Decision Node
        </Button>
      </div>

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}