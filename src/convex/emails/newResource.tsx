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

interface NewResourceEmailProps {
  name: string;
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
}

export function NewResourceEmail({
  name,
  postTitle,
  postExcerpt,
  postUrl,
}: NewResourceEmailProps) {
  return (
    <Html lang="en">
      <Tailwind config={{ presets: [pixelBasedPreset] }}>
        <Head />
        <Preview>New resource published: {postTitle}</Preview>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl p-5">
            <Heading className="text-2xl text-gray-800">
              New Resource Published
            </Heading>
            <Text className="text-base text-gray-800">
              Hi {name}, a new resource has been published on InternQuest.
            </Text>
            <Text className="text-base text-gray-800">
              <strong>{postTitle}</strong>
            </Text>
            <Text className="text-base text-gray-600">{postExcerpt}</Text>
            <Text className="text-sm text-gray-500">
              Read it here: <a href={postUrl}>{postUrl}</a>
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
