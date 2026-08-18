import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** ส่งข้อความแจ้งเตือนเข้าไลน์กลุ่มผ่าน LINE Messaging API (push message) */
export const sendLineAlert = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ message: z.string().min(1).max(4500) }).parse(data))
  .handler(async ({ data }) => {
    const token = process.env["LINE_CHANNEL_ACCESS_TOKEN"];
    const to = process.env["LINE_GROUP_ID"];
    if (!token || !to) {
      return { ok: false, reason: "missing-config" as const };
    }

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages: [{ type: "text", text: data.message }] }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, reason: "line-error" as const, detail: detail.slice(0, 300) };
    }
    return { ok: true as const };
  });
