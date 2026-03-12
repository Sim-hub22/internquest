"use client";

import { useParams } from "next/navigation";

import { InternshipForm } from "@/components/internships/internship-form";
import { Id } from "@/convex/_generated/dataModel";

export default function EditInternshipPage() {
  const params = useParams<{ id: string }>();

  return (
    <InternshipForm mode="edit" internshipId={params.id as Id<"internships">} />
  );
}
