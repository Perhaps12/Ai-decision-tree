import type { Edge, Node } from "@xyflow/react";

export type Decision = "YES" | "NO";

export type DecisionNodeData = {
  prompt: string;
};

export type DecisionEdgeData = {
  decision: Decision;
};

export type Workflow = {
  rootNodeId: string | null;
  workflowInput: string;
  nodes: Node<DecisionNodeData>[];
  edges: Edge<DecisionEdgeData>[];
};

export type ExecutionStep = {
  nodeId: string;
  result: Decision;
  edgeId?: string;
};

export type WorkflowExecutionResult = {
  steps: ExecutionStep[];
};

export type WorkflowRunEventData = {
  rootNodeId: string;
  workflowInput: string;
  nodes: Node<DecisionNodeData>[];
  edges: Edge<DecisionEdgeData>[];
};