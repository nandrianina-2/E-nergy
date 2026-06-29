import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Conversation, Message } from "@/lib/models";
import { auth } from "@/lib/auth/config";

export const maxDuration = 60; // durée max autorisée par Vercel pour cette fonction
const POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 15000; // garde la connexion active à travers les proxys/CDN

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Non authentifié", { status: 401 });
  }

  const { id } = await params;

  await connectDB();

  const conversation = await Conversation.findById(id);
  if (!conversation) {
    return new Response("Conversation introuvable", { status: 404 });
  }

  const isStaff = session.user.role === "admin" || session.user.role === "super_admin";

  if (!isStaff && conversation.userId.toString() !== session.user.id) {
    return new Response("Accès refusé", { status: 403 });
  }
  if (
    session.user.role === "admin" &&
    conversation.organizationId.toString() !== session.user.organizationId
  ) {
    return new Response("Conversation introuvable", { status: 404 });
  }

  // Dernier message déjà connu côté client, pour ne renvoyer que les nouveaux
  const sinceParam = req.nextUrl.searchParams.get("since");
  let lastSeenAt = sinceParam ? new Date(sinceParam) : new Date(0);

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      }

      send("connected", { ok: true });

      const pollInterval = setInterval(async () => {
        if (closed) return;
        try {
          const newMessages = await Message.find({
            conversationId: id,
            createdAt: { $gt: lastSeenAt },
          })
            .populate("senderId", "name avatarUrl")
            .sort({ createdAt: 1 });

          if (newMessages.length > 0) {
            lastSeenAt = newMessages[newMessages.length - 1].createdAt;
            send("messages", { messages: newMessages });
          }
        } catch (err) {
          console.error("[SSE] Erreur de polling :", err);
        }
      }, POLL_INTERVAL_MS);

      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        send("heartbeat", { ts: Date.now() });
      }, HEARTBEAT_INTERVAL_MS);

      // Vercel coupe les fonctions après maxDuration : on ferme proprement
      // avant la coupure pour que le client se reconnecte sans erreur visible.
      const closeTimeout = setTimeout(() => {
        send("reconnect", { reason: "max_duration" });
        cleanup();
      }, (maxDuration - 5) * 1000);

      function cleanup() {
        if (closed) return;
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        clearTimeout(closeTimeout);
        try {
          controller.close();
        } catch {
          // déjà fermé, rien à faire
        }
      }

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // désactive le buffering sur certains proxys (nginx)
    },
  });
}
