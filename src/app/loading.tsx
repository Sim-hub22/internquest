import { Spinner } from "@/components/ui/spinner";

export default function LoadingPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center">
      <Spinner className="size-10 text-primary" />
    </div>
  );
}
