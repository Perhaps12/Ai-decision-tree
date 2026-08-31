import { inngest } from "../client";

export const helloWorld = inngest.createFunction(
  {
    id: "hello-world",
    triggers: { event: "test/hello" },
  },
  async ({ event, step }) => {
    const result = await step.run("say-hello", async () => {
      return {
        message: "Hello from Inngest!",
        data: event.data,
      };
    });

    return result;
  }
);