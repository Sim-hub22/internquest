import { cache } from "react";

import { auth } from "@clerk/nextjs/server";

export const getAuthToken = cache(async () => {
  return (await (await auth()).getToken()) ?? undefined;
});
