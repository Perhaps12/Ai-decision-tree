import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function evaluateDecision(
  workflowInput: string,
  nodePrompt: string
): Promise<"YES" | "NO"> {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `
You are evaluating one decision in a workflow.

Overall workflow input:
${workflowInput}

Decision question:
${nodePrompt}

Respond with exactly one word:
YES
or
NO

Do not include any explanation.
`,
  });

  const answer = response.text?.trim().toUpperCase();

  if (answer === "YES") {
    return "YES";
  }

  if (answer === "NO") {
    return "NO";
  }

  throw new Error(`Invalid AI response: ${response.text}`);
}