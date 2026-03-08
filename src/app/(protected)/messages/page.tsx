import { Message } from "@/components/message";

export default function MessagesPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted p-4 sm:p-6 lg:p-12 dark:bg-background">
      <Message />
    </div>
  );
}
