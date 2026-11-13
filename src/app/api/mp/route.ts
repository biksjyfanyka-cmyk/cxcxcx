import { join, leave, sync } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "bad json" }, { status: 400 });
  }
  switch (body.action) {
    case "join":
      return Response.json(join(body.room, body.name, body.team));
    case "sync":
      return Response.json(sync(body as Parameters<typeof sync>[0]));
    case "leave":
      leave(body.room, body.id);
      return Response.json({ ok: true });
    default:
      return Response.json({ error: "unknown action" }, { status: 400 });
  }
}
