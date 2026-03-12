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

interface ApplicationStatusEmailProps {
  name: string;
  internshipTitle: string;
  status: string;
}

export function ApplicationStatusEmail({
  name,
  internshipTitle,
  status,
}: ApplicationStatusEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>
          Your application for {internshipTitle} has been updated
        </Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">
              Application Update
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, your application for <strong>{internshipTitle}</strong>{" "}
              has been updated to <strong>{status}</strong>.
            </Text>
            <Text className="text-sm text-gray-500">
              Log in to InternQuest to view the full details of your
              application.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
