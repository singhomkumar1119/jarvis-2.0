import { createServerFn } from "@tanstack/react-start";

export const getTokenBalance = createServerFn({ method: "GET" })
  .handler(async () => {
    return { balance: 999999, starting: 999999 };
  });
