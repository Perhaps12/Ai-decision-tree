import type { Edge, Node } from "@xyflow/react";
import { workflowChannel } from "@/inngest/channels";
import { inngest } from "../client";
import { evaluateDecision } from "@/lib/llm";
import type {
  Decision,
  DecisionEdgeData,
  DecisionNodeData,
  ExecutionStep,
} from "@/types/workflow";

type WorkflowEventData = {
  rootNodeId: string;
  workflowInput: string;
  nodes: Node<DecisionNodeData>[];
  edges: Edge<DecisionEdgeData>[];
};

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    triggers: {
      event: "workflow/run",
    },
  },
  async ({ event, step }) => {
    if (!event.data) {
      throw new Error("workflow/run event is missing data");
    }

    const {
      rootNodeId,
      workflowInput,
      nodes,
      edges,
    } = event.data as WorkflowEventData;

    const channel = workflowChannel({
      eventId: event.id,
    });

    const executionSteps: ExecutionStep[] = [];

    let currentNodeId: string | null = rootNodeId;

    while (currentNodeId) {
      const currentNode = nodes.find(
        (node) => node.id === currentNodeId
      );

      if (!currentNode) {
        throw new Error(
          `Could not find node ${currentNodeId}`
        );
      }

      const nodeId = currentNode.id;

      await step.realtime.publish(
        `active-${nodeId}`,
        channel.active,
        {
          nodeId,
        }
      );

      

      // Evaluate this decision node with Gemini.
      // Each node gets its own durable Inngest step.
      const result = await step.run(
        `evaluate-${nodeId}`,
        async (): Promise<Decision> => {
          return evaluateDecision(
            workflowInput,
            currentNode.data.prompt
          );
        }
      );

      // Find the YES or NO edge selected by the AI.
      const matchingEdge = edges.find(
        (edge) =>
          edge.source === nodeId &&
          edge.data?.decision === result
      );

      // Record this node in the execution history.
      executionSteps.push({
        nodeId,
        result,
        edgeId: matchingEdge?.id,
      });

      // Tell the frontend that this node has finished
      // and which branch was chosen.
      await step.realtime.publish(
        `publish-${nodeId}`,
        channel.execution,
        {
          nodeId,
          result,
          edgeId: matchingEdge?.id ?? null,
        }
      );

      // If there is no matching outgoing edge,
      // the workflow ends here.
      if (!matchingEdge) {
        currentNodeId = null;
      } else {
        await step.sleep(
          `rate-limit-delay-${nodeId}`,
          "15s"
        );

        currentNodeId = matchingEdge.target;
      }
    }

    // Notify the frontend that the entire workflow is done.
    await step.realtime.publish(
      "publish-complete",
      channel.complete,
      {
        steps: executionSteps,
      }
    );

    return {
      steps: executionSteps,
    };
  }
);