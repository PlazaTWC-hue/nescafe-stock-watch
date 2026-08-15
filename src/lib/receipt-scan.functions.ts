import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { scanReceipt } from "./receipt-scan.server";

export const scanReceiptFn = createServerFn({ method: "POST" })
  .validator((data) =>
    z
      .object({ image: z.string().startsWith("data:image/").max(12_000_000) })
      .parse(data),
  )
  .handler(async ({ data }) => scanReceipt(data.image));
