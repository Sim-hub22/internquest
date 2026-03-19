import { BlogPostForm } from "@/components/blog/blog-post-form";
import type { Id } from "@/convex/_generated/dataModel";

export default async function EditAdminBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BlogPostForm mode="edit" postId={id as Id<"blogPosts">} />;
}
