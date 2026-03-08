"use client";

import React, { useState, useTransition } from "react";

import { useMutation, useQuery } from "convex/react";
import { MessageSquareText, SendHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export function Message() {
  const messages = useQuery(api.messages.list);
  const isLoading = messages === undefined;
  const messageList = messages ?? [];

  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, startTransition] = useTransition();
  const sendMessage = useMutation(api.messages.send);
  const trimmedMessage = newMessageText.trim();

  async function handleSendMessage(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (trimmedMessage.length === 0 || isSending) {
      return;
    }

    startTransition(async () => {
      await sendMessage({ body: trimmedMessage });
    });
    setNewMessageText("");
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span>Convex Chat</span>
            <Badge variant="secondary" className="ml-auto">
              Realtime
            </Badge>
          </CardTitle>
          <CardDescription>
            Messages update instantly for everyone online.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ScrollArea className="h-[50vh] rounded-lg border bg-muted/20 p-3">
            {isLoading ? (
              <ul className="flex flex-col gap-3" aria-label="Loading messages">
                {Array.from({ length: 4 }).map((_, index) => (
                  <li
                    key={`message-skeleton-${index}`}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-5/6" />
                  </li>
                ))}
              </ul>
            ) : messageList.length === 0 ? (
              <Empty className="border-0 p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <MessageSquareText />
                  </EmptyMedia>
                  <EmptyTitle>No messages yet</EmptyTitle>
                  <EmptyDescription>
                    Start the conversation by sending the first message.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-3">
                {messageList.map((message) => (
                  <li
                    key={message._id}
                    className="rounded-lg border bg-background p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{message.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message._creationTime).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-foreground">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter>
          <form className="flex w-full gap-2" onSubmit={handleSendMessage}>
            <Input
              value={newMessageText}
              onChange={(event) => setNewMessageText(event.target.value)}
              placeholder="Write a message..."
              disabled={isSending}
              aria-label="Message body"
            />
            <Button
              type="submit"
              disabled={trimmedMessage.length === 0 || isSending}
            >
              <SendHorizontal data-icon="inline-start" />
              {isSending ? "Sending..." : "Send"}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}
