import { OwnerBlogPostPreviewPage } from "@/components/blog/owner-blog-post-preview-page";
import type { Id } from "@/convex/_generated/dataModel";

export default async function AdminBlogPostPreviewRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OwnerBlogPostPreviewPage postId={id as Id<"blogPosts">} />;
}
