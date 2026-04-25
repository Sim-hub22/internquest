function stripPdfExtension(filename: string) {
  return filename.replace(/\.pdf$/i, "");
}

export function deriveResumeLabel(
  originalFilename: string,
  explicitLabel?: string
) {
  const trimmedLabel = explicitLabel?.trim();
  if (trimmedLabel) {
    return trimmedLabel;
  }

  const trimmedFilename = originalFilename.trim();
  if (!trimmedFilename) {
    return "Resume";
  }

  const withoutExtension = stripPdfExtension(trimmedFilename).trim();
  return withoutExtension || "Resume";
}
