"use client";
/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useMutation, useQuery } from "convex/react";
import {
  EyeIcon,
  ImagePlusIcon,
  SaveIcon,
  SendIcon,
  SquarePenIcon,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { RichTextContent } from "@/components/rich-text-content";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Badge } from "@/components/ui/badge";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  BLOG_CATEGORIES,
  hasMeaningfulRichText,
  slugifyPostTitle,
  toBlogCategoryLabel,
} from "@/lib/blog";

type BlogPostFormProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      postId: Id<"blogPosts">;
    };

type BlogPostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  category: (typeof BLOG_CATEGORIES)[number];
  tagsText: string;
  content: string;
  coverImageStorageId: string;
};

const DEFAULT_VALUES: BlogPostFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  category: "general",
  tagsText: "",
  content: "",
  coverImageStorageId: "",
};

const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
});

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function BlogPostForm(props: BlogPostFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState<
    string | null
  >(null);
  const [submitIntent, setSubmitIntent] = useState<
    "draft" | "preview" | "publish" | "save" | "unpublish" | null
  >(null);
  const createPost = useMutation(api.blogPosts.create);
  const updatePost = useMutation(api.blogPosts.update);
  const publishPost = useMutation(api.blogPosts.publish);
  const unpublishPost = useMutation(api.blogPosts.unpublish);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const resolveImageUpload = useMutation(api.storage.resolveImageUpload);
  const existingPost = useQuery(
    api.blogPosts.getForAdmin,
    props.mode === "edit" ? { postId: props.postId } : "skip"
  );
  const form = useForm<BlogPostFormValues>({
    defaultValues: DEFAULT_VALUES,
  });
  const titleValue = form.watch("title");
  const status = existingPost?.status ?? "draft";

  useEffect(() => {
    if (slugManuallyEdited) {
      return;
    }

    const nextSlug = slugifyPostTitle(titleValue);
    if (form.getValues("slug") === nextSlug) {
      return;
    }

    form.setValue("slug", nextSlug);
  }, [form, slugManuallyEdited, titleValue]);

  useEffect(() => {
    if (!existingPost || props.mode !== "edit") {
      return;
    }

    form.reset({
      title: existingPost.title,
      slug: existingPost.slug,
      excerpt: existingPost.excerpt,
      category: existingPost.category,
      tagsText: existingPost.tags.join(", "),
      content: existingPost.content,
      coverImageStorageId: existingPost.coverImageStorageId ?? "",
    });
    setSlugManuallyEdited(
      existingPost.slug !== slugifyPostTitle(existingPost.title)
    );
    setCoverImagePreviewUrl(existingPost.coverImageUrl ?? null);
  }, [existingPost, form, props.mode]);

  const validateForPublish = () => {
    let hasError = false;
    form.clearErrors();

    const values = form.getValues();
    const normalizedSlug = slugifyPostTitle(values.slug);

    if (!values.title.trim()) {
      form.setError("title", { message: "Post title is required" });
      hasError = true;
    }

    if (!normalizedSlug) {
      form.setError("slug", { message: "Post slug is required" });
      hasError = true;
    } else if (normalizedSlug !== values.slug) {
      form.setValue("slug", normalizedSlug);
    }

    if (!values.excerpt.trim()) {
      form.setError("excerpt", { message: "Post excerpt is required" });
      hasError = true;
    }

    if (!hasMeaningfulRichText(values.content)) {
      form.setError("content", { message: "Post content is required" });
      hasError = true;
    }

    return !hasError;
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please choose an image file");
    }

    if (file.size > IMAGE_SIZE_LIMIT) {
      throw new Error("Images must be 10MB or smaller");
    }

    const uploadUrl = await generateUploadUrl({});
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      throw new Error("Image upload failed");
    }

    const { storageId } = (await response.json()) as {
      storageId: Id<"_storage">;
    };
    const url = await resolveImageUpload({ storageId });

    return { storageId, url };
  };

  const handleInlineImageUpload = async () => {
    const input = window.document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });

    if (!file) {
      return null;
    }

    try {
      const uploaded = await uploadImage(file);
      toast.success("Inline image uploaded");
      return uploaded.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
      return null;
    }
  };

  const savePost = async (intent: "draft" | "preview" | "publish" | "save") => {
    const values = form.getValues();
    const shouldValidate =
      intent === "publish" || intent === "save" || status === "published";

    if (shouldValidate && !validateForPublish()) {
      return;
    }

    setSubmitIntent(intent);

    try {
      const payload = {
        title: values.title,
        slug: slugifyPostTitle(values.slug),
        excerpt: values.excerpt,
        content: values.content,
        category: values.category,
        tags: splitTags(values.tagsText),
        coverImageStorageId: values.coverImageStorageId
          ? (values.coverImageStorageId as Id<"_storage">)
          : undefined,
      };

      const draft =
        intent === "draft" ||
        intent === "preview" ||
        (props.mode === "edit" && status === "draft" && intent !== "publish");

      let postId: Id<"blogPosts">;

      if (props.mode === "create") {
        postId = await createPost({
          ...payload,
          draft,
        });
      } else {
        await updatePost({
          postId: props.postId,
          ...payload,
          draft,
        });
        postId = props.postId;
      }

      if (intent === "publish") {
        await publishPost({ postId });
        toast.success("Resource published");
        router.push("/admin/blog" as Route);
        router.refresh();
        return;
      }

      if (intent === "preview") {
        toast.success("Draft saved for preview");
        router.push(`/admin/blog/${postId}/preview` as Route);
        router.refresh();
        return;
      }

      toast.success(intent === "save" ? "Changes saved" : "Draft saved");
      if (props.mode === "create") {
        router.push(`/admin/blog/${postId}/edit` as Route);
      } else {
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save resource";
      toast.error(message);
    } finally {
      setSubmitIntent(null);
    }
  };

  const handleCoverImageSelection = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadImage(file);
      form.setValue("coverImageStorageId", uploaded.storageId, {
        shouldDirty: true,
      });
      setCoverImagePreviewUrl(uploaded.url);
      toast.success("Cover image uploaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      toast.error(message);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status === "published" ? "Published" : "Draft"}
            </Badge>
            {existingPost?.publishedAt ? (
              <Badge variant="outline">
                Published{" "}
                {DATE_FORMATTER.format(new Date(existingPost.publishedAt))}
              </Badge>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {props.mode === "create"
              ? "Create Resource"
              : status === "published"
                ? "Edit Published Resource"
                : "Edit Draft Resource"}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Build editorial posts for the public resources hub with rich text,
            code examples, and uploaded imagery.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {status === "published" ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={submitIntent !== null}
                onClick={() => void savePost("save")}
              >
                {submitIntent === "save" ? <Spinner /> : <SaveIcon />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitIntent !== null}
                onClick={() => void savePost("preview")}
              >
                {submitIntent === "preview" ? <Spinner /> : <EyeIcon />}
                Preview
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={submitIntent !== null}
                onClick={async () => {
                  if (props.mode !== "edit") {
                    return;
                  }

                  setSubmitIntent("unpublish");
                  try {
                    await unpublishPost({ postId: props.postId });
                    toast.success("Resource moved back to draft");
                    router.refresh();
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Failed to unpublish resource";
                    toast.error(message);
                  } finally {
                    setSubmitIntent(null);
                  }
                }}
              >
                {submitIntent === "unpublish" ? <Spinner /> : null}
                Unpublish
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={submitIntent !== null}
                onClick={() => void savePost("draft")}
              >
                {submitIntent === "draft" ? <Spinner /> : <SaveIcon />}
                Save Draft
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitIntent !== null}
                onClick={() => void savePost("preview")}
              >
                {submitIntent === "preview" ? <Spinner /> : <EyeIcon />}
                Preview
              </Button>
              <Button
                type="button"
                disabled={submitIntent !== null}
                onClick={() => void savePost("publish")}
              >
                {submitIntent === "publish" ? <Spinner /> : <SendIcon />}
                Publish
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={!!form.formState.errors.title}>
                  <FieldLabel htmlFor="post-title">Title</FieldLabel>
                  <Input
                    id="post-title"
                    placeholder="How to stand out in internship interviews"
                    {...form.register("title")}
                  />
                  <FieldError errors={[form.formState.errors.title]} />
                </Field>

                <Field data-invalid={!!form.formState.errors.slug}>
                  <FieldLabel htmlFor="post-slug">Slug</FieldLabel>
                  <FieldContent>
                    <Input
                      id="post-slug"
                      placeholder="how-to-stand-out-in-internship-interviews"
                      {...form.register("slug", {
                        onChange: () => setSlugManuallyEdited(true),
                      })}
                    />
                    <FieldDescription>
                      Auto-filled from the title until you edit it manually.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.slug]} />
                  </FieldContent>
                </Field>

                <Field data-invalid={!!form.formState.errors.excerpt}>
                  <FieldLabel htmlFor="post-excerpt">Excerpt</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="post-excerpt"
                      rows={4}
                      placeholder="A concise teaser that appears on resource cards and notifications."
                      {...form.register("excerpt")}
                    />
                    <FieldDescription>
                      Keep it sharp and scannable. This doubles as the publish
                      notification body.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.excerpt]} />
                  </FieldContent>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Article Body</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field data-invalid={!!form.formState.errors.content}>
                <FieldLabel>Content</FieldLabel>
                <RichTextEditor
                  mode="blog"
                  value={form.watch("content")}
                  onChangeAction={(value) =>
                    form.setValue("content", value, { shouldDirty: true })
                  }
                  placeholder="Write the article, drop in examples, and add code blocks where they help."
                  onImageUploadAction={handleInlineImageUpload}
                />
                <FieldDescription>
                  Blog mode supports inline uploads, formatting, quotes, and
                  syntax-highlighted code blocks.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.content]} />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel>Category</FieldLabel>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(value) =>
                      form.setValue(
                        "category",
                        value as BlogPostFormValues["category"],
                        { shouldDirty: true }
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {toBlogCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="post-tags">Tags</FieldLabel>
                  <FieldContent>
                    <Input
                      id="post-tags"
                      placeholder="resume, networking, interviews"
                      {...form.register("tagsText")}
                    />
                    <FieldDescription>
                      Comma-separated tags for quick scanning and future
                      discovery features.
                    </FieldDescription>
                  </FieldContent>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cover Image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageSelection}
              />

              {coverImagePreviewUrl ? (
                <div className="overflow-hidden rounded-3xl border bg-muted/30">
                  <img
                    src={coverImagePreviewUrl}
                    alt="Blog cover preview"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed bg-muted/20 p-8 text-sm text-muted-foreground">
                  Add a wide cover image to give the resources page a stronger
                  editorial feel.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlusIcon />
                  Upload Cover Image
                </Button>
                {form.watch("coverImageStorageId") ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      form.setValue("coverImageStorageId", "", {
                        shouldDirty: true,
                      });
                      setCoverImagePreviewUrl(null);
                    }}
                  >
                    Remove Image
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle>Live Excerpt Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3">
                <Badge variant="outline">
                  {toBlogCategoryLabel(form.watch("category"))}
                </Badge>
                <h2 className="text-2xl font-semibold tracking-tight">
                  {form.watch("title").trim() || "Untitled resource"}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {form.watch("excerpt").trim() ||
                    "Your excerpt will appear here and on the public resources grid."}
                </p>
              </div>

              <Separator />

              {hasMeaningfulRichText(form.watch("content")) ? (
                <RichTextContent
                  html={form.watch("content")}
                  className="line-clamp-6"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Start writing to preview how the opening of the article will
                  read.
                </p>
              )}

              <div className="flex gap-3">
                <Button asChild variant="ghost">
                  <Link href={"/admin/blog" as Route}>
                    <SquarePenIcon />
                    Back to Blog
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
