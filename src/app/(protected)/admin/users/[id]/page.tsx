import { AdminUserDetailPage } from "@/components/admin/admin-user-detail-page";
import type { Id } from "@/convex/_generated/dataModel";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AdminUserDetailPage userId={id as Id<"users">} />;
}
