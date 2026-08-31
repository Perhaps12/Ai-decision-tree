import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      rootNodeId,
      workflowInput,
      nodes,
      edges,
    } = body;

    if (!rootNodeId) {
      return NextResponse.json(
        { error: "A root node must be selected." },
        { status: 400 }
      );
    }

    if (!workflowInput.trim()) {
      return NextResponse.json(
        { error: "Workflow input is required." },
        { status: 400 }
      );
    }

    const { ids } = await inngest.send({
      name: "workflow/run",
      data: {
        rootNodeId,
        workflowInput,
        nodes,
        edges,
      },
    });

    return NextResponse.json({
      success: true,
      eventId: ids[0],
    });
  } catch (error) {
    console.error("Failed to start workflow:", error);

    return NextResponse.json(
      { error: "Failed to start workflow." },
      { status: 500 }
    );
  }
}