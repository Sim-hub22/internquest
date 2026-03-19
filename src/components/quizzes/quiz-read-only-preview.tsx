import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ReadOnlyQuizPreviewProps = {
  quiz: {
    title: string;
    description?: string;
    timeLimit?: number;
    questions: Array<{
      id: string;
      type: "multiple_choice" | "short_answer";
      question: string;
      points: number;
      options?: Array<{
        id: string;
        text: string;
      }>;
    }>;
  };
  maxScore: number;
  questionCount: number;
  subtitle: string;
  timeLimitLabel: string;
};

export function QuizReadOnlyPreview({
  quiz,
  maxScore,
  questionCount,
  subtitle,
  timeLimitLabel,
}: ReadOnlyQuizPreviewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{quiz.title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{questionCount} questions</Badge>
          <Badge variant="outline">{maxScore} pts</Badge>
          <Badge variant="outline">{timeLimitLabel}</Badge>
        </div>
      </div>

      {quiz.description ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {quiz.description}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {quiz.questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <CardTitle className="text-base">Question {index + 1}</CardTitle>
              <Badge variant="outline">{question.points} pts</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm">{question.question}</p>

              {question.type === "multiple_choice" ? (
                <div className="grid gap-3">
                  {question.options?.map((option) => (
                    <div
                      className="rounded-lg border px-4 py-3 text-sm text-muted-foreground"
                      key={option.id}
                    >
                      {option.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  Short answer response area
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
