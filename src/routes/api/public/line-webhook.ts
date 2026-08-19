import { createFileRoute } from "@tanstack/react-router";

type LineSource = { type?: string; groupId?: string; roomId?: string; userId?: string };
type LineEvent = { type?: string; replyToken?: string; source?: LineSource };

/** Webhook สำหรับ LINE — ตอบกลับ groupId ให้เอาไปตั้งค่า LINE_GROUP_ID */
export const Route = createFileRoute("/api/public/line-webhook")({
  server: {
    handlers: {
      GET: async () => new Response("ok"),
      POST: async ({ request }) => {
        const token = process.env["LINE_CHANNEL_ACCESS_TOKEN"];
        let body: { events?: LineEvent[] } = {};
        try {
          body = (await request.json()) as { events?: LineEvent[] };
        } catch {
          return new Response("ok");
        }

        for (const ev of body.events ?? []) {
          const src = ev.source ?? {};
          const id = src.groupId ?? src.roomId ?? src.userId ?? "";
          console.log("[line-webhook]", ev.type, src.type, id);
          if (!token || !ev.replyToken) continue;
          const label = src.groupId ? "groupId" : src.roomId ? "roomId" : "userId";
          await fetch("https://api.line.me/v2/bot/message/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              replyToken: ev.replyToken,
              messages: [{ type: "text", text: `${label}:\n${id}` }],
            }),
          });
        }

        return new Response("ok");
      },
    },
  },
});
