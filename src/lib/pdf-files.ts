const MAX_PDF_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type FileLike = {
  name: string;
  size: number;
  type: string;
};

export { MAX_PDF_FILE_SIZE_BYTES };

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getPdfValidationMessage(
  file: FileLike | null,
  label: string,
  required = false
) {
  if (!file) {
    return required ? `Please upload your ${label.toLowerCase()} (PDF)` : null;
  }

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const isPdf = fileType.includes("pdf") || fileName.endsWith(".pdf");

  if (!isPdf) {
    return `${label} must be a PDF file`;
  }

  if (file.size > MAX_PDF_FILE_SIZE_BYTES) {
    return `${label} must be 5MB or smaller`;
  }

  return null;
}
