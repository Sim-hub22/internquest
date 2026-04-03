"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  Controller,
  type Path,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v3";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
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

const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const draftQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "short_answer"]),
  question: z.string(),
  points: z.number(),
  options: z.array(optionSchema),
  correctOptionId: z.string(),
  sampleAnswer: z.string(),
});

const draftQuizSchema = z.object({
  title: z.string(),
  description: z.string(),
  timeLimit: z.string(),
  questions: z.array(draftQuestionSchema),
});

type QuizBuilderFormValues = z.infer<typeof draftQuizSchema>;

const DEFAULT_VALUES: QuizBuilderFormValues = {
  title: "",
  description: "",
  timeLimit: "",
  questions: [createInitialQuestion()],
};

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

function getPublishQuizSchema(scope: QuizBuilderFormProps["scope"]) {
  return draftQuizSchema.superRefine((values, ctx) => {
    if (!values.title.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quiz title is required",
        path: ["title"],
      });
    }

    if (values.timeLimit && Number(values.timeLimit) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Time limit must be greater than zero",
        path: ["timeLimit"],
      });
    }

    if (values.questions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A quiz must include at least one question",
        path: ["questions"],
      });
    }

    values.questions.forEach((question, questionIndex) => {
      if (!question.question.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question ${questionIndex + 1} must have text`,
          path: ["questions", questionIndex, "question"],
        });
      }

      if (question.points <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Question points must be greater than zero",
          path: ["questions", questionIndex, "points"],
        });
      }

      if (scope === "admin" && question.type === "short_answer") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Sample quizzes can only include multiple choice questions",
          path: ["questions", questionIndex, "type"],
        });
      }

      if (question.type !== "multiple_choice") {
        return;
      }

      if (question.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Multiple choice questions need at least two options",
          path: ["questions", questionIndex, "options"],
        });
      }

      question.options.forEach((option, optionIndex) => {
        if (!option.text.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Option text is required",
            path: ["questions", questionIndex, "options", optionIndex, "text"],
          });
        }
      });

      const optionIds = new Set(question.options.map((option) => option.id));
      if (
        !question.correctOptionId ||
        !optionIds.has(question.correctOptionId)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Select the correct answer",
          path: ["questions", questionIndex, "correctOptionId"],
        });
      }
    });
  });
}

function applyPublishErrors(
  error: z.ZodError<QuizBuilderFormValues>,
  setError: (
    name: Path<QuizBuilderFormValues>,
    error: { message: string }
  ) => void
) {
  for (const issue of error.issues) {
    if (!issue.path.length || !issue.message) {
      continue;
    }

    setError(issue.path.join(".") as Path<QuizBuilderFormValues>, {
      message: issue.message,
    });
  }
}

export function QuizBuilderForm(props: QuizBuilderFormProps) {
  const router = useRouter();
  const questionTypes =
    props.scope === "admin"
      ? QUESTION_TYPES.filter((item) => item.value === "multiple_choice")
      : QUESTION_TYPES;
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
  const form = useForm<QuizBuilderFormValues>({
    resolver: zodResolver(draftQuizSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const questionsArray = useFieldArray({
    control: form.control,
    name: "questions",
    keyName: "fieldId",
  });
  const questions =
    useWatch({
      control: form.control,
      name: "questions",
    }) ?? DEFAULT_VALUES.questions;

  useEffect(() => {
    if (
      !recruiterQuiz ||
      props.scope !== "recruiter" ||
      props.mode !== "edit"
    ) {
      return;
    }

    form.reset({
      title: recruiterQuiz.title,
      description: recruiterQuiz.description ?? "",
      timeLimit:
        recruiterQuiz.timeLimit !== undefined
          ? String(recruiterQuiz.timeLimit)
          : "",
      questions: recruiterQuiz.questions.map((question) => ({
        id: question.id,
        type: question.type,
        question: question.question,
        points: question.points,
        options: question.options ? [...question.options] : [],
        correctOptionId: question.correctOptionId ?? "",
        sampleAnswer: question.sampleAnswer ?? "",
      })),
    });
  }, [form, props.mode, props.scope, recruiterQuiz]);

  const destination =
    props.scope === "recruiter" ? "/recruiter/quizzes" : "/admin/quizzes";
  const isSubmitting = submitIntent !== null;

  const updateQuestion = (
    questionIndex: number,
    updater: (question: QuestionDraft) => QuestionDraft
  ) => {
    const current = form.getValues(`questions.${questionIndex}`);
    form.setValue(`questions.${questionIndex}`, updater(current), {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const save = async (intent: "draft" | "publish") => {
    form.clearErrors();

    const values = form.getValues();

    if (intent === "publish") {
      const validationResult = getPublishQuizSchema(props.scope).safeParse(
        values
      );

      if (!validationResult.success) {
        applyPublishErrors(validationResult.error, form.setError);
        return;
      }
    }

    setSubmitIntent(intent);

    try {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        timeLimit: values.timeLimit ? Number(values.timeLimit) : undefined,
        questions: values.questions.map((question) => ({
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
          draft: intent === "draft",
          ...payload,
        });
        quizId = props.quizId;
      } else {
        quizId = await createQuiz({
          draft: intent === "draft",
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

  return (
    <form
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 lg:p-6"
      onSubmit={(event) => event.preventDefault()}
    >
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
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => router.push(destination as Route)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => void save("draft")}
          >
            {submitIntent === "draft" ? <Spinner /> : null}
            Save Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => void save("publish")}
          >
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
            <Field data-invalid={!!form.formState.errors.title}>
              <FieldLabel htmlFor="quiz-title">Title</FieldLabel>
              <Input
                id="quiz-title"
                placeholder="Frontend screening challenge"
                aria-invalid={!!form.formState.errors.title}
                {...form.register("title")}
              />
              <FieldError errors={[form.formState.errors.title]} />
            </Field>

            <Field>
              <FieldLabel htmlFor="quiz-description">Description</FieldLabel>
              <Textarea
                id="quiz-description"
                placeholder="Tell candidates what this quiz evaluates."
                rows={4}
                {...form.register("description")}
              />
            </Field>

            <Field data-invalid={!!form.formState.errors.timeLimit}>
              <FieldLabel htmlFor="quiz-time-limit">
                Time Limit (minutes)
              </FieldLabel>
              <FieldContent>
                <Input
                  id="quiz-time-limit"
                  type="number"
                  min={1}
                  placeholder="20"
                  aria-invalid={!!form.formState.errors.timeLimit}
                  {...form.register("timeLimit")}
                />
                <FieldDescription>
                  Leave blank if the quiz should be untimed.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.timeLimit]} />
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            questionsArray.append(createQuestion("multiple_choice"))
          }
        >
          <PlusIcon data-icon="inline-start" />
          Add MCQ
        </Button>
        {props.scope === "recruiter" ? (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              questionsArray.append(createQuestion("short_answer"))
            }
          >
            <PlusIcon data-icon="inline-start" />
            Add Short Answer
          </Button>
        ) : null}
      </div>

      {questionsArray.fields.map((field, index) => {
        const question = questions[index] ?? createInitialQuestion();
        const questionErrors = form.formState.errors.questions?.[index];

        return (
          <Card key={field.fieldId}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-base">Question {index + 1}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (questionsArray.fields.length === 1) {
                    return;
                  }

                  questionsArray.remove(index);
                }}
              >
                <Trash2Icon />
                <span className="sr-only">Remove question</span>
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={!!questionErrors?.type}>
                  <FieldLabel>Question Type</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`questions.${index}.type`}
                    render={({ field: controllerField }) => (
                      <Select
                        value={controllerField.value}
                        onValueChange={(value) => {
                          form.clearErrors(`questions.${index}`);
                          updateQuestion(index, () =>
                            createQuestion(
                              value as QuestionDraft["type"],
                              question.id
                            )
                          );
                        }}
                      >
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={!!questionErrors?.type}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {questionTypes.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[questionErrors?.type]} />
                </Field>

                <Field data-invalid={!!questionErrors?.question}>
                  <FieldLabel>Prompt</FieldLabel>
                  <Textarea
                    rows={3}
                    placeholder="Write the question candidates will answer."
                    aria-invalid={!!questionErrors?.question}
                    {...form.register(`questions.${index}.question`)}
                  />
                  <FieldError errors={[questionErrors?.question]} />
                </Field>

                <Field data-invalid={!!questionErrors?.points}>
                  <FieldLabel>Points</FieldLabel>
                  <Controller
                    control={form.control}
                    name={`questions.${index}.points`}
                    render={({ field: controllerField }) => (
                      <Input
                        type="number"
                        min={1}
                        aria-invalid={!!questionErrors?.points}
                        value={controllerField.value}
                        onChange={(event) =>
                          controllerField.onChange(
                            Number(event.target.value) || 1
                          )
                        }
                      />
                    )}
                  />
                  <FieldError errors={[questionErrors?.points]} />
                </Field>
              </FieldGroup>

              <Separator />

              {question.type === "multiple_choice" ? (
                <div className="flex flex-col gap-4">
                  {question.options.map((option, optionIndex) => {
                    const optionErrors =
                      questionErrors?.options?.[optionIndex]?.text;

                    return (
                      <div
                        key={option.id}
                        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_auto]"
                      >
                        <Field data-invalid={!!optionErrors}>
                          <FieldLabel>Option {optionIndex + 1}</FieldLabel>
                          <Input
                            placeholder="Option label"
                            aria-invalid={!!optionErrors}
                            {...form.register(
                              `questions.${index}.options.${optionIndex}.text`
                            )}
                          />
                          <FieldError errors={[optionErrors]} />
                        </Field>

                        <Field data-invalid={!!questionErrors?.correctOptionId}>
                          <FieldLabel>Answer Key</FieldLabel>
                          <Controller
                            control={form.control}
                            name={`questions.${index}.correctOptionId`}
                            render={({ field: controllerField }) => (
                              <Select
                                value={controllerField.value}
                                onValueChange={controllerField.onChange}
                              >
                                <SelectTrigger
                                  className="w-full"
                                  aria-invalid={
                                    !!questionErrors?.correctOptionId
                                  }
                                >
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
                            )}
                          />
                          <FieldError
                            errors={[questionErrors?.correctOptionId]}
                          />
                        </Field>

                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              updateQuestion(index, (current) => {
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
                    );
                  })}

                  {questionErrors?.options?.message ? (
                    <FieldError errors={[questionErrors.options]} />
                  ) : null}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      updateQuestion(index, (current) => ({
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
                    {...form.register(`questions.${index}.sampleAnswer`)}
                  />
                </Field>
              )}
            </CardContent>
          </Card>
        );
      })}
    </form>
  );
}
