import type { Id } from "@/convex/_generated/dataModel";

export async function uploadFileToConvexStorage(
  file: File,
  generateUploadUrl: (args: Record<string, never>) => Promise<string>
) {
  const uploadUrl = await generateUploadUrl({});
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/pdf",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Upload failed");
  }

  const uploadData = (await uploadResponse.json()) as {
    storageId?: string;
  };

  if (!uploadData.storageId) {
    throw new Error("Upload response missing storageId");
  }

  return uploadData.storageId as Id<"_storage">;
}
