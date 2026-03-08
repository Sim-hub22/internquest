import { Message } from "@/components/message";

export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-muted p-4 lg:p-6 dark:bg-background">
      <Message />
    </div>
  );
}
