import { NextResponse } from "next/server";
import { getClientSubscriptionToken } from "inngest/react";

import { inngest } from "@/inngest/client";
import { workflowChannel } from "@/inngest/channels";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json(
      { error: "eventId is required" },
      { status: 400 }
    );
  }

  const token = await getClientSubscriptionToken(
    inngest,
    {
      channel: workflowChannel({ eventId }),
      topics: ["active", "execution", "complete"],
    }
  );

  return NextResponse.json(token);
}