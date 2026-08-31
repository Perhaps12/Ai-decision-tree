import { realtime, staticSchema } from "inngest";

export const workflowChannel = realtime.channel({
  name: ({ eventId }: { eventId: string }) =>
    `workflow:${eventId}`,

  topics: {
    active: {
      schema: staticSchema<{
        nodeId: string;
      }>(),
    },

    execution: {
      schema: staticSchema<{
        nodeId: string;
        result: "YES" | "NO";
        edgeId: string | null;
      }>(),
    },

    complete: {
      schema: staticSchema<{
        steps: {
          nodeId: string;
          result: "YES" | "NO";
          edgeId?: string;
        }[];
      }>(),
    },
  },
});