export type Decision = "YES" | "NO";

export type DecisionNodeData = {
  prompt: string;
};

export type DecisionEdgeData = {
  decision: Decision;
};