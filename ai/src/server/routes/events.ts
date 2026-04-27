import type { Server, IncomingMessage, ServerResponse } from "node:http";
import { subscribe, type QuestNotificationEvent } from "../eventBus.js";

const HEARTBEAT_MS = 25_000;

let eventSeq = 0;

function eventId(): string {
  eventSeq += 1;
  return `${Date.now()}-${eventSeq}`;
}

function handleEvents(req: IncomingMessage, res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.write(": connected\n\n");

  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, HEARTBEAT_MS);
  if (typeof heartbeat.unref === "function") heartbeat.unref();

  const unsubscribe = subscribe((event: QuestNotificationEvent) => {
    const data = JSON.stringify(event.payload);
    res.write(`event: ${event.kind}\nid: ${eventId()}\ndata: ${data}\n\n`);
  });

  const cleanup = () => {
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);
  req.on("error", cleanup);
}

export function register(server: Server): void {
  server.addRoute("GET", "/api/v1/events", handleEvents);
}
