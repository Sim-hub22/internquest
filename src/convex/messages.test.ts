import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { modules } from "@/convex/test.setup";

import { api, internal } from "./_generated/api";
import schema from "./schema";

test("sending messages", async () => {
  const t = convexTest(schema, modules);

  await t.mutation(internal.users.upsertFromClerk, {
    data: { id: "user_1", first_name: "Sarah", last_name: "Stone" },
  });
  await t.mutation(internal.users.upsertFromClerk, {
    data: { id: "user_2", first_name: "Tom", last_name: "Reed" },
  });

  await t.withIdentity({ subject: "user_1" }).mutation(api.messages.send, {
    body: "Hi!",
  });
  await t.withIdentity({ subject: "user_2" }).mutation(api.messages.send, {
    body: "Hey!",
  });

  const messages = await t.query(api.messages.list);
  expect(messages).toMatchObject([
    { body: "Hi!", author: "Sarah Stone" },
    { body: "Hey!", author: "Tom Reed" },
  ]);
});
