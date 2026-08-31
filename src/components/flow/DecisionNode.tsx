"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type DecisionNodeData = {
  prompt: string;
  isRoot?: boolean;
  isActive?: boolean;
  onPromptChange?: (nodeId: string, prompt: string) => void;
};

export default function DecisionNode({
  id,
  data,
}: NodeProps) {
  const nodeData = data as DecisionNodeData;

  return (
    <Card
      className={`w-72 ${
        nodeData.isActive ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          {nodeData.isRoot ? "Root Decision Node" : "Decision Node"}
        </CardTitle>

        {nodeData.isRoot && (
          <div className="text-xs font-medium">
            START
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          className="nodrag"
          value={nodeData.prompt}
          placeholder="Enter a YES/NO question..."
          onChange={(e) =>
            nodeData.onPromptChange?.(id, e.target.value)
          }
        />

        <div className="flex justify-between text-xs font-medium">
          <span>NO</span>
          <span>YES</span>
        </div>
      </CardContent>

      <Handle
        type="target"
        position={Position.Top}
        id="input"
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{
          left: "25%",
        }}
      />

      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{
          left: "75%",
        }}
      />
    </Card>
  );
}