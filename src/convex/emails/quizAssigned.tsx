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

interface QuizAssignedEmailProps {
  name: string;
  internshipTitle: string;
  quizTitle: string;
  quizUrl: string;
}

export function QuizAssignedEmail({
  name,
  internshipTitle,
  quizTitle,
  quizUrl,
}: QuizAssignedEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>
          You&apos;ve been assigned a quiz for {internshipTitle}
        </Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">Quiz Assigned</Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, you have been assigned a quiz as part of the selection
              process for <strong>{internshipTitle}</strong>.
            </Text>
            <Text className="text-base text-gray-800">
              Quiz: <strong>{quizTitle}</strong>
            </Text>
            <Text className="text-sm text-gray-500">
              Log in to InternQuest to take the quiz:{" "}
              <a href={quizUrl}>{quizUrl}</a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
