export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6 md:p-10">
      {children}
    </div>
  );
}
