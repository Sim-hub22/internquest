import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Tailwind,
  Text,
  pixelBasedPreset,
} from "@react-email/components";

interface QuizGradedEmailProps {
  name: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  resultsUrl: string;
}

export function QuizGradedEmail({
  name,
  quizTitle,
  score,
  maxScore,
  resultsUrl,
}: QuizGradedEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>Your quiz results for {quizTitle} are ready</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">
              Quiz Results Ready
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, your quiz <strong>{quizTitle}</strong> has been graded.
            </Text>
            <Text className="text-base text-gray-800">
              Score:{" "}
              <strong>
                {score} / {maxScore}
              </strong>
            </Text>
            <Text className="text-sm text-gray-500">
              View your full results: <a href={resultsUrl}>{resultsUrl}</a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
