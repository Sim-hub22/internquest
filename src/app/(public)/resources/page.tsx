import { preloadQuery } from "convex/nextjs";

import { ResourcesBrowse } from "@/components/blog/resources-browse";
import { api } from "@/convex/_generated/api";

const PAGE_SIZE = 9;

export default async function PublicResourcesPage() {
  const preloadedPosts = await preloadQuery(api.blogPosts.listPublic, {
    paginationOpts: {
      numItems: PAGE_SIZE,
      cursor: null,
    },
  });

  return <ResourcesBrowse preloadedPosts={preloadedPosts} />;
}
