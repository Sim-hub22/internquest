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

interface NewInternshipEmailProps {
  name: string;
  internshipTitle: string;
  company: string;
  internshipUrl: string;
}

export function NewInternshipEmail({
  name,
  internshipTitle,
  company,
  internshipUrl,
}: NewInternshipEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>
          New internship matching your preferences: {internshipTitle}
        </Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">
              New Matching Internship
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, a new internship matching your preferences has been
              posted.
            </Text>
            <Text className="text-base text-gray-800">
              <strong>{internshipTitle}</strong> at <strong>{company}</strong>
            </Text>
            <Text className="text-sm text-gray-500">
              View the listing: <a href={internshipUrl}>{internshipUrl}</a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
