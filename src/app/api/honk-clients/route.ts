import { NextResponse } from "next/server";
import "server-only";
import { getHonkClients } from "@/app/lib/honk-clients";

export const dynamic = "force-dynamic";

export async function GET() {
  const clients = await getHonkClients();
  return NextResponse.json(clients);
}
