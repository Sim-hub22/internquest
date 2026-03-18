"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type QuestionDraft = {
  id: string;
  type: "multiple_choice" | "short_answer";
  question: string;
  points: number;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
  sampleAnswer: string;
};

const QUESTION_TYPES = [
  { label: "Multiple Choice", value: "multiple_choice" },
  { label: "Short Answer", value: "short_answer" },
] as const;

const INITIAL_QUESTION_ID = "question-initial";
const INITIAL_OPTION_IDS = ["option-initial-1", "option-initial-2"] as const;

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function createOption(id?: string) {
  return {
    id: id ?? randomId("option"),
    text: "",
  };
}

function createQuestion(
  type: "multiple_choice" | "short_answer",
  id?: string
): QuestionDraft {
  return {
    id: id ?? randomId("question"),
    type,
    question: "",
    points: 1,
    options: type === "multiple_choice" ? [createOption(), createOption()] : [],
    correctOptionId: "",
    sampleAnswer: "",
  };
}

function createInitialQuestion(): QuestionDraft {
  return {
    id: INITIAL_QUESTION_ID,
    type: "multiple_choice",
    question: "",
    points: 1,
    options: [
      createOption(INITIAL_OPTION_IDS[0]),
      createOption(INITIAL_OPTION_IDS[1]),
    ],
    correctOptionId: "",
    sampleAnswer: "",
  };
}

type QuizBuilderFormProps =
  | {
      scope: "recruiter";
      mode: "create";
    }
  | {
      scope: "recruiter";
      mode: "edit";
      quizId: Id<"quizzes">;
    }
  | {
      scope: "admin";
      mode: "create";
    };

export function QuizBuilderForm(props: QuizBuilderFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    createInitialQuestion(),
  ]);
  const [submitIntent, setSubmitIntent] = useState<"draft" | "publish" | null>(
    null
  );
  const createQuiz = useMutation(api.quizzes.create);
  const updateQuiz = useMutation(api.quizzes.update);
  const publishQuiz = useMutation(api.quizzes.publish);
  const recruiterQuiz = useQuery(
    api.quizzes.getForRecruiter,
    props.scope === "recruiter" && props.mode === "edit"
      ? { quizId: props.quizId }
      : "skip"
  );

  useEffect(() => {
    if (
      !recruiterQuiz ||
      props.scope !== "recruiter" ||
      props.mode !== "edit"
    ) {
      return;
    }

    setTitle(recruiterQuiz.title);
    setDescription(recruiterQuiz.description ?? "");
    setTimeLimit(
      recruiterQuiz.timeLimit !== undefined
        ? String(recruiterQuiz.timeLimit)
        : ""
    );
    setQuestions(
      recruiterQuiz.questions.map((question) => ({
        id: question.id,
        type: question.type,
        question: question.question,
        points: question.points,
        options: question.options ? [...question.options] : [],
        correctOptionId: question.correctOptionId ?? "",
        sampleAnswer: question.sampleAnswer ?? "",
      }))
    );
  }, [props.mode, props.scope, recruiterQuiz]);

  const destination =
    props.scope === "recruiter" ? "/recruiter/quizzes" : "/admin/quizzes";

  const isSubmitting = submitIntent !== null;

  const save = async (intent: "draft" | "publish") => {
    setSubmitIntent(intent);

    try {
      const payload = {
        title,
        description: description || undefined,
        timeLimit: timeLimit ? Number(timeLimit) : undefined,
        questions: questions.map((question) => ({
          id: question.id,
          type: question.type,
          question: question.question,
          points: question.points,
          ...(question.type === "multiple_choice"
            ? {
                options: question.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                })),
                correctOptionId: question.correctOptionId,
              }
            : {
                sampleAnswer: question.sampleAnswer || undefined,
              }),
        })),
      };

      let quizId: Id<"quizzes">;

      if (props.mode === "edit") {
        await updateQuiz({
          quizId: props.quizId,
          ...payload,
        });
        quizId = props.quizId;
      } else {
        quizId = await createQuiz({
          ...payload,
          type: props.scope === "recruiter" ? "recruitment" : "sample",
        });
      }

      if (intent === "publish") {
        await publishQuiz({ quizId });
      }

      toast.success(
        intent === "publish"
          ? "Quiz published successfully"
          : "Quiz saved as draft"
      );
      router.push(destination as Route);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save quiz";
      toast.error(message);
    } finally {
      setSubmitIntent(null);
    }
  };

  const updateQuestion = (
    questionId: string,
    updater: (question: QuestionDraft) => QuestionDraft
  ) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId ? updater(question) : question
      )
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.scope === "recruiter"
              ? props.mode === "edit"
                ? "Edit Recruitment Quiz"
                : "Create Recruitment Quiz"
              : "Create Sample Quiz"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Build timed quizzes with multiple choice and short answer questions.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => save("draft")}
          >
            {submitIntent === "draft" ? <Spinner /> : null}
            Save Draft
          </Button>
          <Button disabled={isSubmitting} onClick={() => save("publish")}>
            {submitIntent === "publish" ? <Spinner /> : null}
            Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="quiz-title">Title</FieldLabel>
              <Input
                id="quiz-title"
                placeholder="Frontend screening challenge"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="quiz-description">Description</FieldLabel>
              <Textarea
                id="quiz-description"
                placeholder="Tell candidates what this quiz evaluates."
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="quiz-time-limit">
                Time Limit (minutes)
              </FieldLabel>
              <FieldContent>
                <Input
                  id="quiz-time-limit"
                  type="number"
                  min={1}
                  placeholder="20"
                  value={timeLimit}
                  onChange={(event) => setTimeLimit(event.target.value)}
                />
                <FieldDescription>
                  Leave blank if the quiz should be untimed.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() =>
            setQuestions((current) => [
              ...current,
              createQuestion("multiple_choice"),
            ])
          }
        >
          <PlusIcon data-icon="inline-start" />
          Add MCQ
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setQuestions((current) => [
              ...current,
              createQuestion("short_answer"),
            ])
          }
        >
          <PlusIcon data-icon="inline-start" />
          Add Short Answer
        </Button>
      </div>

      {questions.map((question, index) => (
        <Card key={question.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <CardTitle className="text-base">Question {index + 1}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setQuestions((current) =>
                  current.length === 1
                    ? current
                    : current.filter((item) => item.id !== question.id)
                )
              }
            >
              <Trash2Icon />
              <span className="sr-only">Remove question</span>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FieldGroup>
              <Field>
                <FieldLabel>Question Type</FieldLabel>
                <Select
                  value={question.type}
                  onValueChange={(value) =>
                    updateQuestion(question.id, () =>
                      createQuestion(value as QuestionDraft["type"])
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {QUESTION_TYPES.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Prompt</FieldLabel>
                <Textarea
                  rows={3}
                  placeholder="Write the question candidates will answer."
                  value={question.question}
                  onChange={(event) =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      question: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Points</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  value={question.points}
                  onChange={(event) =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      points: Number(event.target.value) || 1,
                    }))
                  }
                />
              </Field>
            </FieldGroup>

            <Separator />

            {question.type === "multiple_choice" ? (
              <div className="flex flex-col gap-4">
                {question.options.map((option, optionIndex) => (
                  <div
                    key={option.id}
                    className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_auto]"
                  >
                    <Field>
                      <FieldLabel>Option {optionIndex + 1}</FieldLabel>
                      <Input
                        placeholder="Option label"
                        value={option.text}
                        onChange={(event) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            options: current.options.map((item) =>
                              item.id === option.id
                                ? { ...item, text: event.target.value }
                                : item
                            ),
                          }))
                        }
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Answer Key</FieldLabel>
                      <Select
                        value={question.correctOptionId}
                        onValueChange={(value) =>
                          updateQuestion(question.id, (current) => ({
                            ...current,
                            correctOptionId: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Correct option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {question.options.map((item, itemIndex) => (
                              <SelectItem key={item.id} value={item.id}>
                                Option {itemIndex + 1}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>

                    <div className="flex items-end">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          updateQuestion(question.id, (current) => {
                            if (current.options.length <= 2) {
                              return current;
                            }

                            const nextOptions = current.options.filter(
                              (item) => item.id !== option.id
                            );

                            return {
                              ...current,
                              options: nextOptions,
                              correctOptionId:
                                current.correctOptionId === option.id
                                  ? ""
                                  : current.correctOptionId,
                            };
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={() =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      options: [...current.options, createOption()],
                    }))
                  }
                >
                  <PlusIcon data-icon="inline-start" />
                  Add Option
                </Button>
              </div>
            ) : (
              <Field>
                <FieldLabel>Sample Answer Guidance</FieldLabel>
                <Textarea
                  rows={4}
                  placeholder="Optional rubric note for manual grading."
                  value={question.sampleAnswer}
                  onChange={(event) =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      sampleAnswer: event.target.value,
                    }))
                  }
                />
              </Field>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
