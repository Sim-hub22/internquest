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

interface NewApplicationEmailProps {
  recruiterName: string;
  candidateName: string;
  internshipTitle: string;
  applicationUrl: string;
}

export function NewApplicationEmail({
  recruiterName,
  candidateName,
  internshipTitle,
  applicationUrl,
}: NewApplicationEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>New application received for {internshipTitle}</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">
              New Application Received
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {recruiterName}, <strong>{candidateName}</strong> has applied
              to your internship posting <strong>{internshipTitle}</strong>.
            </Text>
            <Text className="text-sm text-gray-500">
              Review the application:{" "}
              <a href={applicationUrl}>{applicationUrl}</a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
