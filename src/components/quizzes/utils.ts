export function formatMinutesLabel(value: number | null | undefined) {
  if (!value) {
    return "Untimed";
  }

  return `${value} min`;
}

export function formatScore(
  value: number | null | undefined,
  maxScore: number
) {
  if (value === null || value === undefined) {
    return `Pending / ${maxScore}`;
  }

  return `${value} / ${maxScore}`;
}

export function formatTimeRemaining(deadlineAt: number | null | undefined) {
  if (!deadlineAt) {
    return null;
  }

  const diff = Math.max(0, deadlineAt - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function toDisplayLabel(value: string) {
  return value
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatDate(value: number | null | undefined) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
