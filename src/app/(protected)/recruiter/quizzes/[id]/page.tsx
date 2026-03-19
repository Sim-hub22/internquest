"use client";

import { useParams } from "next/navigation";

import { OwnerQuizPreviewPage } from "@/components/quizzes/owner-quiz-preview-page";
import type { Id } from "@/convex/_generated/dataModel";

export default function RecruiterQuizPreviewRoute() {
  const params = useParams<{ id: string }>();

  return (
    <OwnerQuizPreviewPage
      quizId={params.id as Id<"quizzes">}
      scope="recruiter"
    />
  );
}
