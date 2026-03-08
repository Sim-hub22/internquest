import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar collapsible="icon" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
