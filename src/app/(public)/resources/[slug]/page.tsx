import { ResourcePostPage } from "@/components/blog/resource-post-page";

export default async function PublicResourcePostRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ResourcePostPage slug={slug} />;
}
