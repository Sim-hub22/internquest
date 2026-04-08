"use client";

import { useParams } from "next/navigation";

import { QuizBuilderForm } from "@/components/quizzes/quiz-builder-form";
import type { Id } from "@/convex/_generated/dataModel";

export default function EditAdminQuizPage() {
  const params = useParams<{ id: string }>();

  return (
    <QuizBuilderForm
      mode="edit"
      quizId={params.id as Id<"quizzes">}
      scope="admin"
    />
  );
}
