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
import { useRealtime } from "inngest/react";
import { workflowChannel } from "@/inngest/channels";

import { Button } from "@/components/ui/button";
import DecisionNode from "./DecisionNode";
import { Textarea } from "../ui/textarea";

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

function wouldCreateCycle(
  source: string,
  target: string,
  edges: Edge[]
) {
  const visited = new Set<string>();

  function canReach(
    current: string,
    goal: string
  ): boolean {
    if (current === goal) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const outgoingEdges = edges.filter(
      (edge) => edge.source === current
    );

    return outgoingEdges.some((edge) =>
      canReach(edge.target, goal)
    );
  }

  return canReach(target, source);
}

export default function FlowEditor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [rootNodeId, setRootNodeId] = useState<string | null>("1");

  const [selectedNodeId, setSelectedNodeId] =
  useState<string | null>(null);

  const [workflowInput, setWorkflowInput] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<
    { nodeId: string; result: "YES" | "NO" ; edgeId?: string | null;}[]
  >([]);
  const executedEdgeIds = new Set(
    executionLog
      .map((step) => step.edgeId)
      .filter(Boolean)
  );

  const [eventId, setEventId] =
  useState<string | null>(null);

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

        if (parsed.rootNodeId) {
          setRootNodeId(parsed.rootNodeId);
        }

        if (typeof parsed.workflowInput === "string") {
          setWorkflowInput(parsed.workflowInput);
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
        rootNodeId,
        workflowInput,
        nodes,
        edges,
      })
    );
  }, [nodes, edges, rootNodeId, workflowInput, hasLoaded]);

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

  const nodesWithCallbacks = nodes.map((node) => {
    const executionStep = executionLog.find(
      (step) => step.nodeId === node.id
    );

    return {
      ...node,
      data: {
        ...node.data,
        onPromptChange: updatePrompt,
        isRoot: node.id === rootNodeId,

        // Currently being evaluated
        isActive: node.id === activeNodeId,

        // Already evaluated during this run
        isVisited: !!executionStep,

        // YES or NO chosen at this node
        selectedDecision: executionStep?.result,
      },
    };
  });

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      // Prevent self-connections
      if (connection.source === connection.target) {
        return;
      }

      // Prevent cycles
      if (
        wouldCreateCycle(
          connection.source,
          connection.target,
          edges
        )
      ) {
        return;
      }

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

  const runMockWorkflow = async () => {
    if (!rootNodeId) {
      return;
    }

    setIsRunning(true);
    setExecutionLog([]);

    let currentNodeId: string | null = rootNodeId;

    while (currentNodeId) {
      const currentNode = nodes.find(
        (node) => node.id === currentNodeId
      );

      if (!currentNode) {
        break;
      }

      setActiveNodeId(currentNodeId);

      // Pause so you can visually see traversal
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Temporary fake AI answer
      const result: "YES" | "NO" =
        Math.random() > 0.5 ? "YES" : "NO";

      const nextEdge = edges.find(
        (edge) =>
          edge.source === currentNodeId &&
          edge.data?.decision === result
      );

      setExecutionLog((current) => [
        ...current,
        {
          nodeId: currentNodeId!,
          result,
          edgeId: nextEdge?.id ?? null,
        },
      ]);

      if (!nextEdge) {
        currentNodeId = null;
      } else {
        currentNodeId = nextEdge.target;
      }
    }

    setActiveNodeId(null);
    setIsRunning(false);
  };

  const runWorkflow = async () => {
    if (!rootNodeId || isRunning) {
      return;
    }

    setIsRunning(true);
    setExecutionLog([]);
    setActiveNodeId(null);

    try {
      const response = await fetch("/api/workflow/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rootNodeId,
          workflowInput,
          nodes,
          edges,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to run workflow");
      }

      setEventId(data.eventId);

      console.log("Workflow started:", data.eventId);
    } catch (error) {
      console.error(error);
      setIsRunning(false);
    }
  };

  const realtimeChannel = eventId
    ? workflowChannel({ eventId })
    : undefined;

  const {
    messages,
    connectionStatus,
    runStatus,
  } = useRealtime({
    channel: realtimeChannel,
    topics: [
      "active",
      "execution",
      "complete",
    ] as const,

    token: eventId
      ? () =>
          fetch(
            `/api/realtime-token?eventId=${eventId}`
          ).then((response) => {
            if (!response.ok) {
              throw new Error(
                "Failed to get realtime token"
              );
            }

            return response.json();
          })
      : undefined,

    enabled: !!eventId,
  });

  useEffect(() => {
    for (const message of messages.delta) {
      // Realtime also sends run lifecycle messages.
      // We only want our published topic data here.
      if (message.kind !== "data") {
        continue;
      }

      if (message.topic === "active") {
        setActiveNodeId(message.data.nodeId);
      }

      if (message.topic === "execution") {
        setActiveNodeId(null);

        setExecutionLog((current) => [
          ...current,
          {
            nodeId: message.data.nodeId,
            result: message.data.result,
            edgeId: message.data.edgeId,
          },
        ]);
      }

      if (message.topic === "complete") {
        setActiveNodeId(null);
        setIsRunning(false);
      }
    }
  }, [messages.delta]);

  const displayedEdges = edges.map((edge) => {
    const wasExecuted = executedEdgeIds.has(edge.id);

    return {
      ...edge,
      animated: wasExecuted,
      style: wasExecuted
        ? {
            stroke: "#1d4ed8",
            strokeWidth: 3,
          }
        : undefined,
    };
  });

  const exportWorkflow = () => {
    const workflow = {
      rootNodeId,
      workflowInput,
      nodes,
      edges,
    };

    const blob = new Blob(
      [JSON.stringify(workflow, null, 2)],
      {
        type: "application/json",
      }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "workflow.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  const importWorkflow = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    const workflow = JSON.parse(text);

    setNodes(workflow.nodes ?? []);
    setEdges(workflow.edges ?? []);
    setRootNodeId(workflow.rootNodeId ?? null);
    setWorkflowInput(workflow.workflowInput ?? "");
  };

  return (
    <div className="h-screen w-screen">
      <div className="absolute left-4 top-4 z-10 w-[calc(24rem+3rem)] space-y-3">
        <div className="rounded-xl border bg-background p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">
            Workflow Input
          </div>

          <Textarea
            value={workflowInput}
            onChange={(e) => setWorkflowInput(e.target.value)}
            placeholder="Enter the text or context that the AI should evaluate..."
            className="min-h-28 w-full"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={addDecisionNode}>
            Add Decision Node
          </Button>

          <Button
            variant="secondary"
            disabled={!selectedNodeId}
            onClick={() => {
              if (selectedNodeId) {
                setRootNodeId(selectedNodeId);
              }
            }}
          >
            Set as Root
          </Button>

          <Button onClick={runMockWorkflow}>
            Mock Run
          </Button>

          <Button
            disabled={!rootNodeId || !workflowInput.trim() || isRunning}
            onClick={runWorkflow}
          >
            {isRunning ? "Running..." : "Run Workflow"}
          </Button>
        </div>
      </div>

      <div className="absolute bottom-4 left-16 z-10 w-[20rem] space-y-3">
        <Button onClick={exportWorkflow}>
          Export JSON
        </Button>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground ring-offset-background transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          Import JSON
          <input
            type="file"
            accept=".json,application/json"
            onChange={importWorkflow}
            className="hidden"
          />
        </label>
      </div>
      

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={displayedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => {
          setSelectedNodeId(node.id);
        }}
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