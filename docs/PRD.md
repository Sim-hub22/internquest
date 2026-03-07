# InternHub - Product Requirements Document

> Internship discovery platform with integrated quiz assessments and learning resources.

**Version:** 1.0
**Date:** March 4, 2026
**Status:** Draft

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [User Roles](#3-user-roles)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Database Schema](#5-database-schema)
6. [Route Structure](#6-route-structure)
7. [Feature Specifications](#7-feature-specifications)
   - 7.1 [User Management & Profiles](#71-user-management--profiles)
   - 7.2 [Internship Listings](#72-internship-listings)
   - 7.3 [Applications](#73-applications)
   - 7.4 [Quiz System](#74-quiz-system)
   - 7.5 [Blog / Resources](#75-blog--resources)
   - 7.6 [Notifications](#76-notifications)
   - 7.7 [Recruiter Analytics](#77-recruiter-analytics)
   - 7.8 [Admin Dashboard & Moderation](#78-admin-dashboard--moderation)
8. [Convex Backend Organization](#8-convex-backend-organization)
9. [Dependencies](#9-dependencies)
10. [Implementation Phases](#10-implementation-phases)
11. [Key Design Decisions](#11-key-design-decisions)

---

## 1. Overview

InternHub is a platform connecting students with internship opportunities. It differentiates itself through:

- **Integrated quiz assessments** -- Recruiters create quizzes for shortlisted candidates as part of the hiring pipeline.
- **Learning resources** -- Admins publish blog posts and sample quizzes to help candidates prepare.
- **Full application pipeline** -- Transparent, trackable status flow from application through acceptance.
- **Dual-channel notifications** -- Real-time in-app notifications via Convex subscriptions + email via Resend.
- **Recruiter analytics** -- Views, applications, conversion funnels, and trend charts.

### Core Value Proposition

| For            | Value                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| **Candidates** | Discover internships, apply with one click, track applications, take quizzes, access career resources |
| **Recruiters** | Post internships, manage application pipeline, assess candidates via quizzes, view analytics          |
| **Admins**     | Moderate content, manage users, publish resources, create sample quizzes                              |

---

## 2. Tech Stack

| Layer            | Technology             | Version            |
| ---------------- | ---------------------- | ------------------ |
| Framework        | Next.js (App Router)   | 16.x               |
| Backend          | Convex                 | 1.31.x             |
| Authentication   | Clerk                  | 6.x                |
| Styling          | Tailwind CSS           | v4 (CSS-first)     |
| UI Components    | shadcn/ui (radix-nova) | Latest             |
| Rich Text Editor | TipTap                 | Latest             |
| Charts           | Recharts               | 2.15.x (installed) |
| Email            | Resend                 | Latest             |
| Package Manager  | pnpm                   | Latest             |
| Language         | TypeScript (strict)    | 5.9.x              |

---

## 3. User Roles

### 3.1 Candidate (Student)

- Selects "Candidate" role during sign-up.
- Browses and searches internship listings.
- Builds a detailed profile (education, skills, experience, links).
- Applies to internships with resume upload.
- Tracks application status through the pipeline.
- Takes assigned quizzes (timed) and practices with sample quizzes.
- Receives notifications on status changes, quiz assignments, and new matching internships.

### 3.2 Recruiter

- Selects "Recruiter" role during sign-up.
- Creates and manages internship listings.
- Reviews applications, moves candidates through the pipeline.
- Creates quizzes and assigns them to shortlisted candidates.
- Grades short-answer questions.
- Views analytics on internship postings (views, applications, conversions).
- Receives notifications on new applications.

### 3.3 Admin

- Role assigned manually via Clerk dashboard (`publicMetadata.role = "admin"`).
- Monitors platform-wide statistics.
- Manages users (list, view, suspend).
- Moderates internship listings (review, remove).
- Publishes blog posts and learning resources.
- Creates sample quizzes for public practice.
- Reviews reported content.

---

## 4. Authentication & Authorization

### 4.1 Role Storage

- **Primary source:** Clerk `publicMetadata.role` field.
- **Synced to:** Convex `users` table via Clerk webhook.
- Candidates and recruiters select their role at sign-up.
- Admin role is assigned manually in the Clerk dashboard.

### 4.2 Sign-Up Flow

1. User visits `/sign-up`.
2. Custom sign-up page shows a role selector: **Candidate** or **Recruiter**.
3. Selected role is stored in Clerk `unsafeMetadata` during sign-up.
4. Clerk webhook (`user.created`) fires to Convex HTTP endpoint.
5. Convex action verifies webhook signature (svix), reads the role from metadata.
6. Convex mutation creates user in `users` table and sets `publicMetadata.role` via Clerk Backend API.

### 4.3 Route Protection (Three Layers)

| Layer                                 | Mechanism                | Purpose                                                                                                                                                                   |
| ------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Middleware (`proxy.ts`)**           | Clerk `auth.protect()`   | Redirects unauthenticated users away from protected routes. Checks session claims for role-restricted routes (`/admin/*`).                                                |
| **Layout (`(protected)/layout.tsx`)** | Auth check               | Renders role-aware sidebar, header with notification bell.                                                                                                                |
| **Convex functions**                  | `requireRole(ctx, role)` | **Authoritative enforcement.** Every mutation/query validates the caller's role from the `users` table. Even if frontend is bypassed, backend rejects unauthorized calls. |

### 4.4 Middleware Route Matchers

```
Public (no auth):    /, /internships/*, /resources/*, /sign-in/*, /sign-up/*
Protected (any auth): /profile, /settings, /notifications
Candidate only:      /candidate/*
Recruiter only:      /recruiter/*
Admin only:          /admin/*
```

### 4.5 Convex Auth Helpers

Located in `convex/lib/auth.ts`:

- `requireAuth(ctx)` -- Returns user identity or throws `ConvexError("UNAUTHENTICATED")`.
- `requireRole(ctx, role)` -- Validates user has the specified role or throws `ConvexError("FORBIDDEN")`.
- `getCurrentUser(ctx)` -- Returns the Convex user document for the authenticated user.

### 4.6 Clerk Webhook

- **Endpoint:** Convex HTTP action at `/webhooks/clerk`
- **Events:** `user.created`, `user.updated`, `user.deleted`
- **Verification:** svix signature validation in a Node.js action (`"use node"`)
- **Processing:**
  - `user.created` -- Creates user in Convex `users` table, sets `publicMetadata.role` in Clerk.
  - `user.updated` -- Syncs name, email, imageUrl changes.
  - `user.deleted` -- Soft-deletes or removes user record.

---

## 5. Database Schema

### 5.1 Users & Profiles

#### `users`

| Field       | Type                                    | Description                  |
| ----------- | --------------------------------------- | ---------------------------- |
| `clerkId`   | `string`                                | Clerk user ID (unique)       |
| `name`      | `string`                                | Full name                    |
| `email`     | `string`                                | Email address                |
| `imageUrl`  | `optional string`                       | Profile image URL from Clerk |
| `role`      | `"candidate" \| "recruiter" \| "admin"` | User role                    |
| `bio`       | `optional string`                       | Short bio                    |
| `createdAt` | `number`                                | Timestamp                    |
| `updatedAt` | `number`                                | Timestamp                    |

**Indexes:** `by_clerkId` (`clerkId`), `by_role` (`role`), `by_email` (`email`)

#### `candidateProfiles`

| Field                   | Type                       | Description                                                         |
| ----------------------- | -------------------------- | ------------------------------------------------------------------- |
| `userId`                | `id("users")`              | Reference to users table                                            |
| `headline`              | `optional string`          | Short headline, e.g., "CS Student at MIT"                           |
| `education`             | `array of object`          | `{ institution, degree, graduationYear, gpa? }`                     |
| `skills`                | `array of object`          | `{ name, proficiency: "beginner" \| "intermediate" \| "advanced" }` |
| `experience`            | `array of object`          | `{ title, company, startDate, endDate?, description }`              |
| `links`                 | `object`                   | `{ github?, linkedin?, portfolio? }`                                |
| `preferredCategories`   | `optional array of string` | Internship category preferences                                     |
| `preferredLocationType` | `optional string`          | `"remote" \| "onsite" \| "hybrid"`                                  |
| `location`              | `optional string`          | City/Country                                                        |
| `updatedAt`             | `number`                   | Timestamp                                                           |

**Indexes:** `by_userId` (`userId`)

### 5.2 Internships

#### `internships`

| Field                 | Type                               | Description                                                                                     |
| --------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `recruiterId`         | `id("users")`                      | Recruiter who created the listing                                                               |
| `title`               | `string`                           | Internship title                                                                                |
| `company`             | `string`                           | Company name                                                                                    |
| `description`         | `string`                           | Rich text HTML (TipTap)                                                                         |
| `category`            | enum                               | `"technology" \| "business" \| "design" \| "marketing" \| "finance" \| "healthcare" \| "other"` |
| `location`            | `string`                           | Location description                                                                            |
| `locationType`        | `"remote" \| "onsite" \| "hybrid"` | Work arrangement                                                                                |
| `duration`            | `string`                           | e.g., "3 months", "6 months"                                                                    |
| `stipend`             | `optional number`                  | Monthly stipend amount                                                                          |
| `requirements`        | `array of string`                  | List of requirements                                                                            |
| `status`              | `"draft" \| "open" \| "closed"`    | Listing status                                                                                  |
| `applicationDeadline` | `number`                           | Deadline timestamp                                                                              |
| `maxApplications`     | `optional number`                  | Cap on applications                                                                             |
| `viewCount`           | `number`                           | Total view count (for quick display)                                                            |
| `createdAt`           | `number`                           | Timestamp                                                                                       |
| `updatedAt`           | `number`                           | Timestamp                                                                                       |

**Indexes:**

- `by_recruiter` (`recruiterId`)
- `by_status` (`status`)
- `by_category_and_status` (`category`, `status`)
- `by_status_and_deadline` (`status`, `applicationDeadline`)
- `by_recruiter_and_status` (`recruiterId`, `status`)

**Search index:** `search_internships` on `title`, filterFields: `[category, status, locationType]`

### 5.3 Applications

#### `applications`

| Field             | Type                | Description                                                                                                       |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `internshipId`    | `id("internships")` | Target internship                                                                                                 |
| `candidateId`     | `id("users")`       | Applying candidate                                                                                                |
| `resumeStorageId` | `id("_storage")`    | Uploaded resume (Convex file storage)                                                                             |
| `coverLetter`     | `optional string`   | Cover letter text                                                                                                 |
| `status`          | enum                | `"applied" \| "under_review" \| "shortlisted" \| "quiz_assigned" \| "quiz_completed" \| "accepted" \| "rejected"` |
| `statusHistory`   | `array of object`   | `{ status, changedAt, changedBy? }` -- audit trail                                                                |
| `appliedAt`       | `number`            | Timestamp                                                                                                         |
| `updatedAt`       | `number`            | Timestamp                                                                                                         |

**Indexes:**

- `by_internship` (`internshipId`)
- `by_candidate` (`candidateId`)
- `by_internship_and_status` (`internshipId`, `status`)
- `by_candidate_and_status` (`candidateId`, `status`)

### 5.4 Quizzes

#### `quizzes`

| Field          | Type                         | Description                                 |
| -------------- | ---------------------------- | ------------------------------------------- |
| `creatorId`    | `id("users")`                | Recruiter or admin who created it           |
| `title`        | `string`                     | Quiz title                                  |
| `description`  | `optional string`            | Quiz description                            |
| `type`         | `"recruitment" \| "sample"`  | Recruitment = recruiter's, sample = admin's |
| `internshipId` | `optional id("internships")` | Linked internship (recruitment quizzes)     |
| `timeLimit`    | `optional number`            | Time limit in minutes (null = no limit)     |
| `questions`    | `array of QuizQuestion`      | See below                                   |
| `isPublished`  | `boolean`                    | Whether quiz is active                      |
| `createdAt`    | `number`                     | Timestamp                                   |
| `updatedAt`    | `number`                     | Timestamp                                   |

**QuizQuestion (embedded object):**

| Field             | Type                                  | Description                       |
| ----------------- | ------------------------------------- | --------------------------------- |
| `id`              | `string`                              | UUID for the question             |
| `type`            | `"multiple_choice" \| "short_answer"` | Question type                     |
| `question`        | `string`                              | Question text                     |
| `points`          | `number`                              | Point value                       |
| `options`         | `optional array of { id, text }`      | MCQ options                       |
| `correctOptionId` | `optional string`                     | Correct MCQ option ID             |
| `sampleAnswer`    | `optional string`                     | Reference answer for short answer |

**Indexes:**

- `by_creator` (`creatorId`)
- `by_type` (`type`)
- `by_internship` (`internshipId`)
- `by_type_and_published` (`type`, `isPublished`)

#### `quizAttempts`

| Field           | Type                                       | Description                                                          |
| --------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `quizId`        | `id("quizzes")`                            | Quiz being attempted                                                 |
| `candidateId`   | `id("users")`                              | Candidate taking the quiz                                            |
| `applicationId` | `optional id("applications")`              | Linked application (recruitment quizzes)                             |
| `answers`       | `array of object`                          | `{ questionId, answer }` -- option ID for MCQ, text for short answer |
| `score`         | `optional number`                          | Null until graded                                                    |
| `maxScore`      | `number`                                   | Maximum possible score                                               |
| `startedAt`     | `number`                                   | When candidate started                                               |
| `submittedAt`   | `optional number`                          | When submitted (null = in progress)                                  |
| `timeLimit`     | `optional number`                          | Snapshot of quiz time limit at start                                 |
| `status`        | `"in_progress" \| "submitted" \| "graded"` | Attempt status                                                       |

**Indexes:**

- `by_quiz` (`quizId`)
- `by_candidate` (`candidateId`)
- `by_application` (`applicationId`)
- `by_quiz_and_candidate` (`quizId`, `candidateId`)

### 5.5 Blog / Resources

#### `blogPosts`

| Field                 | Type                      | Description                                                                               |
| --------------------- | ------------------------- | ----------------------------------------------------------------------------------------- |
| `authorId`            | `id("users")`             | Admin author                                                                              |
| `title`               | `string`                  | Post title                                                                                |
| `slug`                | `string`                  | URL slug (unique)                                                                         |
| `content`             | `string`                  | Rich text HTML (TipTap)                                                                   |
| `excerpt`             | `string`                  | Short preview text                                                                        |
| `coverImageStorageId` | `optional id("_storage")` | Cover image (Convex file storage)                                                         |
| `category`            | enum                      | `"career_tips" \| "interview_prep" \| "industry_insights" \| "resume_guide" \| "general"` |
| `tags`                | `array of string`         | Freeform tags                                                                             |
| `status`              | `"draft" \| "published"`  | Publish status                                                                            |
| `publishedAt`         | `optional number`         | When published                                                                            |
| `createdAt`           | `number`                  | Timestamp                                                                                 |
| `updatedAt`           | `number`                  | Timestamp                                                                                 |

**Indexes:**

- `by_slug` (`slug`)
- `by_status` (`status`)
- `by_category_and_status` (`category`, `status`)
- `by_author` (`authorId`)

**Search index:** `search_posts` on `title`, filterFields: `[category, status]`

### 5.6 Notifications

#### `notifications`

| Field       | Type              | Description                                                                                                           |
| ----------- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| `userId`    | `id("users")`     | Recipient                                                                                                             |
| `type`      | enum              | `"application_status" \| "quiz_assigned" \| "quiz_graded" \| "new_internship" \| "new_application" \| "new_resource"` |
| `title`     | `string`          | Notification title                                                                                                    |
| `message`   | `string`          | Notification body                                                                                                     |
| `link`      | `optional string` | URL to navigate to                                                                                                    |
| `relatedId` | `optional string` | ID of related entity                                                                                                  |
| `isRead`    | `boolean`         | Read status                                                                                                           |
| `createdAt` | `number`          | Timestamp                                                                                                             |

**Indexes:**

- `by_user` (`userId`)
- `by_user_and_read` (`userId`, `isRead`)
- `by_user_and_type` (`userId`, `type`)

#### `emailQueue`

| Field            | Type                              | Description                       |
| ---------------- | --------------------------------- | --------------------------------- |
| `recipientEmail` | `string`                          | Email address                     |
| `recipientName`  | `string`                          | Recipient name                    |
| `subject`        | `string`                          | Email subject                     |
| `type`           | enum                              | Same as notification types        |
| `templateData`   | `any`                             | Data for email template rendering |
| `status`         | `"pending" \| "sent" \| "failed"` | Send status                       |
| `sentAt`         | `optional number`                 | When sent                         |
| `error`          | `optional string`                 | Error message if failed           |
| `createdAt`      | `number`                          | Timestamp                         |

**Indexes:** `by_status` (`status`)

### 5.7 Analytics

#### `internshipViews`

| Field          | Type                   | Description               |
| -------------- | ---------------------- | ------------------------- |
| `internshipId` | `id("internships")`    | Viewed internship         |
| `viewerId`     | `optional id("users")` | Viewer (null = anonymous) |
| `viewedAt`     | `number`               | Timestamp                 |

**Indexes:**

- `by_internship` (`internshipId`)
- `by_internship_and_date` (`internshipId`, `viewedAt`)

### 5.8 Moderation

#### `reports`

| Field        | Type                                                   | Description               |
| ------------ | ------------------------------------------------------ | ------------------------- |
| `reporterId` | `id("users")`                                          | User who reported         |
| `targetType` | `"internship" \| "user" \| "blog_post"`                | What is being reported    |
| `targetId`   | `string`                                               | ID of the reported entity |
| `reason`     | `string`                                               | Reason for report         |
| `details`    | `optional string`                                      | Additional details        |
| `status`     | `"pending" \| "reviewed" \| "resolved" \| "dismissed"` | Report status             |
| `reviewedBy` | `optional id("users")`                                 | Admin who reviewed        |
| `reviewedAt` | `optional number`                                      | When reviewed             |
| `createdAt`  | `number`                                               | Timestamp                 |

**Indexes:**

- `by_status` (`status`)
- `by_target_type_and_status` (`targetType`, `status`)

---

## 6. Route Structure

Route groups `(auth)`, `(public)`, and `(protected)` are used for **layout and auth concerns only** -- they do not create URL segments. Actual URL paths are created by real folder segments like `candidate/`, `recruiter/`, and `admin/` nested inside `(protected)/`.

```
app/
├── globals.css
├── layout.tsx                                    # Root layout: all providers
│
├── (auth)/                                       # Layout: centered, no header
│   ├── layout.tsx
│   ├── sign-in/[[...sign-in]]/page.tsx          # /sign-in
│   └── sign-up/[[...sign-up]]/page.tsx          # /sign-up  (custom role selector)
│
├── (public)/                                     # Layout: header + footer, no auth
│   ├── layout.tsx
│   ├── page.tsx                                  # /
│   ├── internships/
│   │   ├── page.tsx                              # /internships
│   │   └── [id]/page.tsx                         # /internships/:id
│   └── resources/
│       ├── page.tsx                              # /resources
│       ├── [slug]/page.tsx                       # /resources/:slug
│       └── quizzes/
│           ├── page.tsx                          # /resources/quizzes
│           └── [id]/page.tsx                     # /resources/quizzes/:id
│
├── (protected)/                                  # Layout: auth check + header + notification bell
│   ├── layout.tsx                                # Shared authenticated layout
│   ├── profile/page.tsx                          # /profile
│   ├── settings/page.tsx                         # /settings
│   ├── notifications/page.tsx                    # /notifications
│   │
│   ├── candidate/                                # /candidate/*  (actual URL segment)
│   │   ├── layout.tsx                            # Candidate sidebar navigation
│   │   ├── dashboard/page.tsx                    # /candidate/dashboard
│   │   ├── profile/
│   │   │   └── edit/page.tsx                     # /candidate/profile/edit
│   │   ├── applications/
│   │   │   ├── page.tsx                          # /candidate/applications
│   │   │   └── [id]/page.tsx                     # /candidate/applications/:id
│   │   └── quizzes/
│   │       ├── page.tsx                          # /candidate/quizzes
│   │       ├── [id]/page.tsx                     # /candidate/quizzes/:id
│   │       └── [id]/result/page.tsx              # /candidate/quizzes/:id/result
│   │
│   ├── recruiter/                                # /recruiter/*  (actual URL segment)
│   │   ├── layout.tsx                            # Recruiter sidebar navigation
│   │   ├── dashboard/page.tsx                    # /recruiter/dashboard
│   │   ├── internships/
│   │   │   ├── page.tsx                          # /recruiter/internships
│   │   │   ├── new/page.tsx                      # /recruiter/internships/new
│   │   │   ├── analytics/page.tsx                # /recruiter/internships/analytics
│   │   │   └── [id]/
│   │   │       ├── page.tsx                      # /recruiter/internships/:id
│   │   │       ├── edit/page.tsx                 # /recruiter/internships/:id/edit
│   │   │       └── applications/
│   │   │           ├── page.tsx                  # /recruiter/internships/:id/applications
│   │   │           └── [appId]/page.tsx          # /recruiter/internships/:id/applications/:appId
│   │   └── quizzes/
│   │       ├── page.tsx                          # /recruiter/quizzes
│   │       ├── new/page.tsx                      # /recruiter/quizzes/new
│   │       ├── [id]/edit/page.tsx                # /recruiter/quizzes/:id/edit
│   │       └── [id]/results/page.tsx             # /recruiter/quizzes/:id/results
│   │
│   └── admin/                                    # /admin/*  (actual URL segment)
│       ├── layout.tsx                            # Admin sidebar navigation
│       ├── dashboard/page.tsx                    # /admin/dashboard
│       ├── users/
│       │   ├── page.tsx                          # /admin/users
│       │   └── [id]/page.tsx                     # /admin/users/:id
│       ├── internships/
│       │   └── page.tsx                          # /admin/internships
│       ├── blog/
│       │   ├── page.tsx                          # /admin/blog
│       │   ├── new/page.tsx                      # /admin/blog/new
│       │   └── [id]/edit/page.tsx                # /admin/blog/:id/edit
│       ├── quizzes/
│       │   ├── page.tsx                          # /admin/quizzes
│       │   ├── new/page.tsx                      # /admin/quizzes/new
│       │   └── [id]/edit/page.tsx                # /admin/quizzes/:id/edit
│       └── reports/
│           └── page.tsx                          # /admin/reports
```

### Layout Nesting

```
Root layout (providers)
├── (auth)/layout.tsx           -> Centered, no chrome
├── (public)/layout.tsx         -> Header + footer
└── (protected)/layout.tsx      -> Auth check + header + notification bell
    ├── candidate/layout.tsx    -> Candidate sidebar nav
    ├── recruiter/layout.tsx    -> Recruiter sidebar nav
    └── admin/layout.tsx        -> Admin sidebar nav
```

---

## 7. Feature Specifications

### 7.1 User Management & Profiles

#### 7.1.1 Custom Sign-Up

- Replace default Clerk sign-up with a custom page.
- Two-step: (1) select role (Candidate/Recruiter), (2) Clerk sign-up form.
- Role is passed to Clerk via `unsafeMetadata.role`.
- Webhook syncs role to Convex and sets `publicMetadata.role` in Clerk.

#### 7.1.2 Candidate Profile

- Multi-section profile form accessible at `/candidate/profile/edit`.
- Sections: Basic Info, Education (multi-entry), Skills (multi-entry with proficiency), Experience (multi-entry), Links (GitHub, LinkedIn, Portfolio).
- Profile completeness indicator on dashboard (percentage).
- Profile viewable by recruiters when reviewing applications.

#### 7.1.3 Onboarding Wizard

After first sign-up, candidates are redirected to a profile completion wizard:

```
Step 1: Basic info (name, headline, bio, location)
Step 2: Education (add multiple entries)
Step 3: Skills (add with proficiency level)
Step 4: Experience (add multiple entries, optional)
Step 5: Links (GitHub, LinkedIn, portfolio)
```

Can be skipped and completed later.

### 7.2 Internship Listings

#### 7.2.1 Recruiter Creates Listing

- **Page:** `/recruiter/internships/new`
- **Fields:** Title, company, description (TipTap rich text), category (dropdown), location, location type, duration, stipend (optional), requirements (multi-entry), application deadline, max applications (optional).
- **Draft/Publish:** Recruiter can save as draft or publish immediately.
- **Edit:** Available at `/recruiter/internships/:id/edit` while listing is not closed.

#### 7.2.2 Public Browse

- **Page:** `/internships`
- **Features:**
  - Full-text search (Convex search index on title).
  - Filter by category (predefined list).
  - Filter by location type (remote/onsite/hybrid).
  - Sort by newest, deadline approaching, stipend.
  - Pagination (cursor-based via Convex).
- **Listing card shows:** Title, company, category badge, location type, stipend range, deadline, view count.

#### 7.2.3 Internship Detail

- **Page:** `/internships/:id`
- **Shows:** Full description (rendered HTML), requirements, company info, recruiter info, deadline, stipend.
- **Actions:**
  - Candidate: "Apply Now" button (if authenticated and role = candidate).
  - Anonymous: "Sign up to apply" CTA.
- **View tracking:** Logs entry in `internshipViews` table on page visit.

#### 7.2.4 Predefined Categories

```
technology, business, design, marketing, finance, healthcare, other
```

### 7.3 Applications

#### 7.3.1 Apply to Internship

- **Trigger:** "Apply Now" on internship detail page.
- **Form:** Resume upload (PDF, required via Convex file storage), cover letter (optional text).
- **Validation:** Cannot apply twice to the same internship. Cannot apply after deadline.
- **Result:** Application created with status `"applied"`, notification sent to recruiter.

#### 7.3.2 Application Status Pipeline

```
applied -> under_review -> shortlisted -> quiz_assigned -> quiz_completed -> accepted
                                                                           -> rejected
```

Each transition:

- Recorded in `statusHistory` array with timestamp and who changed it.
- Triggers in-app notification to the candidate.
- Triggers email notification to the candidate.

Recruiters can also reject at any stage (shortcut to `"rejected"`).

#### 7.3.3 Candidate View

- **Page:** `/candidate/applications` -- List of all applications with status badges, applied date, internship title.
- **Page:** `/candidate/applications/:id` -- Detailed view with status timeline, internship info, and quiz link (if assigned).

#### 7.3.4 Recruiter View

- **Page:** `/recruiter/internships/:id/applications` -- All applications for an internship, filterable by status.
- **Page:** `/recruiter/internships/:id/applications/:appId` -- Individual application review:
  - Candidate profile (education, skills, experience, links).
  - Resume download link.
  - Cover letter.
  - Status change buttons (advance, reject).
  - Quiz assignment button (when status = shortlisted).

#### 7.3.5 Resume Upload

- Uses Convex file storage.
- Client calls `generateUploadUrl()` mutation to get a pre-signed upload URL.
- Client uploads PDF directly to Convex storage.
- `storageId` is saved in the application document.
- Recruiter downloads resume via `ctx.storage.getUrl(storageId)`.
- File type restricted to PDF, max size 5MB (validated client-side and server-side).

### 7.4 Quiz System

#### 7.4.1 Quiz Types

| Type          | Creator   | Purpose                                                 | Audience                        |
| ------------- | --------- | ------------------------------------------------------- | ------------------------------- |
| `recruitment` | Recruiter | Assess shortlisted candidates for a specific internship | Assigned candidates only        |
| `sample`      | Admin     | Practice and preparation                                | Public (any authenticated user) |

#### 7.4.2 Question Types

**Multiple Choice:**

- Question text + 4 options (configurable).
- One correct answer.
- Auto-graded on submission.

**Short Answer:**

- Question text + optional sample answer (for recruiter reference).
- Free text response from candidate.
- Requires manual grading by recruiter.

#### 7.4.3 Quiz Builder

- **Pages:** `/recruiter/quizzes/new`, `/admin/quizzes/new`
- **Features:**
  - Add/remove/reorder questions.
  - Set points per question.
  - Set time limit (optional, in minutes).
  - Preview quiz before publishing.
  - Link to internship (recruitment quizzes only).
  - Save as draft or publish.

#### 7.4.4 Quiz Assignment (Recruitment)

- Recruiter moves application status to `"shortlisted"`.
- Recruiter clicks "Assign Quiz" on the application page.
- Selects a quiz linked to that internship.
- Application status changes to `"quiz_assigned"`.
- Candidate receives in-app + email notification with link.

#### 7.4.5 Quiz Taking

- **Page:** `/candidate/quizzes/:id`
- **Flow:**
  1. Candidate starts quiz -- `quizAttempt` created with `status: "in_progress"`, `startedAt` set.
  2. Timer starts (if time limit set), displayed prominently.
  3. Candidate answers questions, answers saved in real-time (via mutation on each answer or on navigation between questions).
  4. Candidate submits manually OR quiz auto-submits when timer expires.
  5. On submission: MCQ questions are auto-scored, status becomes `"submitted"`.
  6. Application status updates to `"quiz_completed"`.
- **Rules:**
  - One attempt per quiz per candidate (for recruitment quizzes).
  - Sample quizzes allow unlimited attempts.
  - Cannot go back after time expires.
  - Browser tab visibility change can be logged (optional anti-cheat).

#### 7.4.6 Grading

- **MCQ:** Auto-graded immediately on submission. Score = sum of points for correct answers.
- **Short Answer:** Recruiter manually grades at `/recruiter/quizzes/:id/results`.
  - Shows candidate answer alongside sample answer.
  - Recruiter assigns points (0 to max) per question.
  - When all short answers are graded, attempt status changes to `"graded"`.
  - Candidate notified with score.

#### 7.4.7 Sample Quizzes

- Admin creates quizzes with `type: "sample"`.
- Listed publicly at `/resources/quizzes`.
- Any authenticated user can take them at `/resources/quizzes/:id`.
- Instant MCQ grading, short answers show sample answer after submission.
- No time pressure (unless admin sets a time limit).

### 7.5 Blog / Resources

#### 7.5.1 Blog Editor (Admin)

- **Page:** `/admin/blog/new`, `/admin/blog/:id/edit`
- **Editor:** TipTap rich text editor with:
  - Headings (H1-H3), bold, italic, underline, strikethrough.
  - Bullet lists, ordered lists.
  - Links (URL insertion).
  - Images (uploaded to Convex file storage, inserted inline).
  - Code blocks with syntax highlighting (lowlight).
  - Blockquotes.
- **Fields:** Title, slug (auto-generated from title, editable), excerpt, category, tags, cover image upload.
- **Workflow:** Save as draft -> Preview -> Publish. Can unpublish.

#### 7.5.2 Public Blog

- **Page:** `/resources` -- Blog listing with cards showing cover image, title, excerpt, category, date.
- **Page:** `/resources/:slug` -- Full blog post rendered from HTML content.
- **Features:**
  - Filter by category.
  - Search by title (Convex search index).
  - Pagination.

#### 7.5.3 Blog Categories

```
career_tips, interview_prep, industry_insights, resume_guide, general
```

#### 7.5.4 New Resource Notifications

When an admin publishes a blog post, all users receive an in-app notification. Email sent to users who have opted in (or all users in MVP).

### 7.6 Notifications

#### 7.6.1 In-App Notifications (Convex Realtime)

- **Storage:** `notifications` table in Convex.
- **Delivery:** Client subscribes via `useQuery(api.notifications.listUnread, { userId })`.
- **Display:**
  - Notification bell icon in the header with unread count badge.
  - Dropdown showing recent notifications.
  - Full notification center at `/notifications`.
- **Actions:** Mark as read (individual or all), click to navigate to relevant page.
- **Reactivity:** New notifications appear instantly via Convex's real-time subscriptions -- no polling.

#### 7.6.2 Email Notifications (Resend)

- **Integration:** Resend SDK in a Convex Node.js action (`"use node"`).
- **Queue:** `emailQueue` table stores pending emails.
- **Processing:** `ctx.scheduler.runAfter(0, ...)` triggers email sending immediately after queue insertion. Failed emails can be retried via cron job.
- **Templates:** Simple HTML templates built in the action (no external template engine for MVP).

#### 7.6.3 Notification Events

| Event                     | Recipient                            | Title Example                                        |
| ------------------------- | ------------------------------------ | ---------------------------------------------------- |
| Application status change | Candidate                            | "Your application status updated to Shortlisted"     |
| Quiz assigned             | Candidate                            | "You've been assigned a quiz for [Internship Title]" |
| Quiz graded               | Candidate                            | "Your quiz results are ready"                        |
| New matching internship   | Candidates with matching preferences | "New internship matching your preferences: [Title]"  |
| New application           | Recruiter                            | "New application received for [Internship Title]"    |
| New blog/resource         | All users                            | "New resource: [Blog Title]"                         |

#### 7.6.4 Matching Logic for "New Matching Internship"

When an internship is published (status changes to `"open"`):

1. A scheduled action queries `candidateProfiles` where:
   - `preferredCategories` includes the internship's category, OR
   - `preferredLocationType` matches the internship's location type.
2. For each matched candidate, creates a notification and queues an email.
3. Runs asynchronously via `ctx.scheduler.runAfter(0, ...)` to avoid blocking the mutation.

### 7.7 Recruiter Analytics

#### 7.7.1 Per-Internship Analytics

**Page:** `/recruiter/internships/:id` (analytics section)

| Metric                 | Source                           | Visualization        |
| ---------------------- | -------------------------------- | -------------------- |
| Total views            | `internshipViews` count          | Number card          |
| Total applications     | `applications` count             | Number card          |
| Application rate       | Applications / Views             | Percentage           |
| Status breakdown       | `applications` grouped by status | Pie chart (Recharts) |
| Views over time        | `internshipViews` grouped by day | Line chart           |
| Applications over time | `applications` grouped by day    | Line chart           |

#### 7.7.2 Cross-Internship Dashboard

**Page:** `/recruiter/internships/analytics`

| Metric                                 | Visualization                                                  |
| -------------------------------------- | -------------------------------------------------------------- |
| Total views across all listings        | Number card                                                    |
| Total applications across all listings | Number card                                                    |
| Overall acceptance rate                | Percentage                                                     |
| Top performing internships             | Bar chart (by applications)                                    |
| Application trend (last 30 days)       | Area chart                                                     |
| Category performance comparison        | Grouped bar chart                                              |
| Conversion funnel                      | Funnel chart: Views -> Applications -> Shortlisted -> Accepted |

#### 7.7.3 View Tracking

- Each page visit to `/internships/:id` logs an `internshipViews` entry.
- Deduplicated: one view per user per internship per hour (to avoid inflating from refreshes).
- Anonymous views tracked with `viewerId: null`.
- `viewCount` on the `internships` table is incremented for quick display (denormalized).

#### 7.7.4 Charts Library

Using the already-installed `recharts` (v2.15.4) with shadcn's `chart` component:

- `LineChart` -- trends over time
- `BarChart` -- comparisons
- `PieChart` -- status breakdowns
- `AreaChart` -- cumulative trends

### 7.8 Admin Dashboard & Moderation

#### 7.8.1 Admin Dashboard

**Page:** `/admin/dashboard`

| Stat                       | Description                                          |
| -------------------------- | ---------------------------------------------------- |
| Total users                | Broken down by role (candidates, recruiters, admins) |
| Total internships          | Broken down by status (draft, open, closed)          |
| Total applications         | Broken down by status                                |
| New users this week        | Count + trend                                        |
| New applications this week | Count + trend                                        |
| New internships this week  | Count + trend                                        |
| Pending reports            | Count                                                |

#### 7.8.2 User Management

**Page:** `/admin/users`

- List all users with search and role filter.
- View user detail at `/admin/users/:id` -- profile info, activity summary.
- Actions: View profile, suspend user (future: sets a flag that Convex functions check).

#### 7.8.3 Internship Moderation

**Page:** `/admin/internships`

- List all internships (all statuses) with search and filters.
- Admin can close/remove inappropriate listings.

#### 7.8.4 Report System

**Trigger:** Users can report internships, other users, or blog posts via a "Report" button.

**Queue:** `/admin/reports`

- List pending reports sorted by date.
- Admin reviews report: view the reported content, mark as reviewed/resolved/dismissed.
- Actions: Close the internship, suspend the user, remove the blog post.

---

## 8. Convex Backend Organization

```
convex/
├── _generated/                  # Auto-generated (DO NOT edit)
├── lib/
│   ├── auth.ts                  # requireAuth, requireRole, getCurrentUser
│   ├── notifications.ts         # createNotification + queueEmail helpers
│   └── utils.ts                 # slugify, pagination helpers
├── schema.ts                    # Full schema (all tables from Section 5)
├── auth.config.ts               # Clerk JWT configuration
├── http.ts                      # HTTP router: /webhooks/clerk
├── users.ts                     # User queries/mutations (get, getByClerkId, update)
├── candidateProfiles.ts         # Profile CRUD (get, upsert)
├── internships.ts               # Listing CRUD, search, status changes
├── applications.ts              # Application CRUD, status transitions, pipeline
├── quizzes.ts                   # Quiz CRUD, publish/unpublish
├── quizAttempts.ts              # Attempt lifecycle: start, saveAnswer, submit, grade
├── blogPosts.ts                 # Blog CRUD, publish/unpublish
├── notifications.ts             # List, markRead, markAllRead, unreadCount
├── email.ts                     # Resend integration ("use node"), send email action
├── clerk.ts                     # Webhook verification + processing ("use node")
├── reports.ts                   # Report CRUD, admin review actions
├── analytics.ts                 # View tracking, aggregation queries
├── storage.ts                   # generateUploadUrl, getFileUrl
└── crons.ts                     # Scheduled jobs (email retry, internship matching)
```

### Function Patterns

All functions follow these conventions:

```typescript
// Public function -- client can call directly
export const list = query({
  args: { ... },
  returns: v.array(...),
  handler: async (ctx, args) => { ... },
});

// Internal function -- only callable from other Convex functions
export const _processWebhook = internalMutation({
  args: { ... },
  returns: v.null(),
  handler: async (ctx, args) => { ... },
});
```

- Always include `args` validators (even if empty).
- Always include `returns` validators.
- Use `ConvexError` for user-facing errors.
- Role-restricted functions call `requireRole(ctx, "recruiter")` at the start.
- Actions needing Node.js (`"use node"`) are isolated in their own files (e.g., `email.ts`, `clerk.ts`).

---

## 9. Dependencies

### New Dependencies to Install

| Package                                 | Purpose                                                 | Phase | Runtime                |
| --------------------------------------- | ------------------------------------------------------- | ----- | ---------------------- |
| `svix`                                  | Clerk webhook signature verification                    | 1     | Server (Convex action) |
| `resend`                                | Email sending via Resend API                            | 1     | Server (Convex action) |
| `@tiptap/react`                         | Rich text editor core                                   | 2     | Client                 |
| `@tiptap/starter-kit`                   | Basic editor extensions (bold, italic, headings, lists) | 2     | Client                 |
| `@tiptap/extension-image`               | Image support in editor                                 | 2     | Client                 |
| `@tiptap/extension-link`                | Link support in editor                                  | 2     | Client                 |
| `@tiptap/extension-placeholder`         | Placeholder text in editor                              | 2     | Client                 |
| `@tiptap/extension-code-block-lowlight` | Code block syntax highlighting                          | 5     | Client                 |
| `lowlight`                              | Syntax highlighting engine for code blocks              | 5     | Client                 |

### Existing Dependencies (Already Installed)

| Package                   | Used For                                |
| ------------------------- | --------------------------------------- |
| `recharts`                | Analytics charts (line, bar, pie, area) |
| `sonner`                  | Toast notifications                     |
| `lucide-react`            | Icons throughout the app                |
| `@clerk/nextjs`           | Authentication                          |
| `convex`                  | Backend                                 |
| `next-themes`             | Dark/light mode                         |
| shadcn/ui (62 components) | UI components                           |

### Environment Variables (New)

| Variable               | Purpose                         | Where Set                  |
| ---------------------- | ------------------------------- | -------------------------- |
| `CLERK_WEBHOOK_SECRET` | Verify Clerk webhook signatures | Convex dashboard (env var) |
| `RESEND_API_KEY`       | Authenticate with Resend API    | Convex dashboard (env var) |

Existing env vars (`CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, Clerk keys) remain unchanged.

---

## 10. Implementation Phases

### Phase 1: Foundation

**Goal:** Auth with roles, user sync, notification infrastructure, role-based layouts.

| #    | Task                            | Details                                                                |
| ---- | ------------------------------- | ---------------------------------------------------------------------- |
| 1.1  | Design and deploy Convex schema | All tables from Section 5                                              |
| 1.2  | Clerk webhook endpoint          | HTTP action at `/webhooks/clerk`, svix verification, user sync         |
| 1.3  | Custom sign-up page             | Role selector (Candidate/Recruiter) + Clerk sign-up form               |
| 1.4  | Auth helpers                    | `requireAuth`, `requireRole`, `getCurrentUser` in `convex/lib/auth.ts` |
| 1.5  | Update middleware (`proxy.ts`)  | Route matchers for `/candidate/*`, `/recruiter/*`, `/admin/*`          |
| 1.6  | Protected layout                | Auth check, header with notification bell, role-aware navigation       |
| 1.7  | Role-specific layouts           | Candidate, recruiter, and admin sidebar layouts                        |
| 1.8  | Notification infrastructure     | `notifications` table, queries, bell component, mark-as-read           |
| 1.9  | Resend integration              | `email.ts` action, `emailQueue` table, scheduler-based sending         |
| 1.10 | Basic user functions            | `users.ts` queries/mutations (get, getByClerkId, update)               |

**Deliverable:** Users can sign up with role selection, see role-appropriate navigation, and receive notifications.

### Phase 2: Internship Listings

**Goal:** Recruiters can post internships, candidates can browse and search.

| #    | Task                          | Details                                                                  |
| ---- | ----------------------------- | ------------------------------------------------------------------------ |
| 2.1  | Install TipTap                | `@tiptap/react`, `@tiptap/starter-kit`, extensions                       |
| 2.2  | `<RichTextEditor>` component  | Reusable TipTap editor with toolbar                                      |
| 2.3  | `<RichTextContent>` component | Read-only HTML renderer for TipTap content                               |
| 2.4  | Internship CRUD functions     | `convex/internships.ts`: create, update, updateStatus, get, list, search |
| 2.5  | Create internship page        | `/recruiter/internships/new` with TipTap editor                          |
| 2.6  | Edit internship page          | `/recruiter/internships/:id/edit`                                        |
| 2.7  | Recruiter internship list     | `/recruiter/internships` with status filters                             |
| 2.8  | Public internship browse      | `/internships` with search, category/location filters, pagination        |
| 2.9  | Internship detail page        | `/internships/:id` with view tracking                                    |
| 2.10 | View tracking                 | `internshipViews` table logging + `viewCount` denormalization            |

**Deliverable:** Recruiters can create and manage listings; candidates can discover internships.

### Phase 3: Candidate Profiles & Applications

**Goal:** Candidates build profiles, apply with resumes, recruiters manage the pipeline.

| #    | Task                              | Details                                                  |
| ---- | --------------------------------- | -------------------------------------------------------- |
| 3.1  | Candidate profile functions       | `convex/candidateProfiles.ts`: get, upsert               |
| 3.2  | Profile edit page                 | `/candidate/profile/edit` with multi-section form        |
| 3.3  | Onboarding wizard                 | Post-signup wizard (5 steps)                             |
| 3.4  | Profile completeness indicator    | Percentage on candidate dashboard                        |
| 3.5  | File storage functions            | `convex/storage.ts`: generateUploadUrl, getFileUrl       |
| 3.6  | Application submit                | Apply form on `/internships/:id` with resume upload      |
| 3.7  | Application CRUD functions        | `convex/applications.ts`: apply, updateStatus, list, get |
| 3.8  | Candidate applications page       | `/candidate/applications` with status filters            |
| 3.9  | Application detail page           | `/candidate/applications/:id` with status timeline       |
| 3.10 | Recruiter application list        | `/recruiter/internships/:id/applications`                |
| 3.11 | Recruiter application review      | `/recruiter/internships/:id/applications/:appId`         |
| 3.12 | Status change notifications       | In-app + email on every status transition                |
| 3.13 | New application notifications     | Notify recruiter on new applications                     |
| 3.14 | Matching internship notifications | Notify candidates when matching internships are posted   |

**Deliverable:** Full application pipeline from apply through acceptance, with notifications.

### Phase 4: Quiz System

**Goal:** Quiz creation, assignment, timed taking, auto + manual grading.

| #    | Task                    | Details                                                             |
| ---- | ----------------------- | ------------------------------------------------------------------- |
| 4.1  | Quiz CRUD functions     | `convex/quizzes.ts`: create, update, publish, get, list             |
| 4.2  | Quiz builder UI         | `/recruiter/quizzes/new` with question builder (MCQ + short answer) |
| 4.3  | Quiz edit page          | `/recruiter/quizzes/:id/edit`                                       |
| 4.4  | Quiz assignment flow    | From application review page, assign quiz to shortlisted candidates |
| 4.5  | Quiz attempt functions  | `convex/quizAttempts.ts`: start, saveAnswer, submit, grade          |
| 4.6  | Quiz taking page        | `/candidate/quizzes/:id` with timer, questions, submit              |
| 4.7  | Auto-submit on timeout  | Client-side timer + server-side validation                          |
| 4.8  | MCQ auto-grading        | Score calculation on submission                                     |
| 4.9  | Short answer grading UI | `/recruiter/quizzes/:id/results` with grading interface             |
| 4.10 | Quiz result page        | `/candidate/quizzes/:id/result` with score breakdown                |
| 4.11 | Quiz notifications      | Notify on assignment and grading                                    |
| 4.12 | Sample quizzes (admin)  | Admin quiz creation at `/admin/quizzes/new`                         |
| 4.13 | Public sample quizzes   | `/resources/quizzes` listing and `/resources/quizzes/:id` taking    |

**Deliverable:** Complete quiz system with creation, timed taking, grading, and results.

### Phase 5: Blog / Resources

**Goal:** Admin-authored blog with rich text, public resource pages.

| #   | Task                          | Details                                                           |
| --- | ----------------------------- | ----------------------------------------------------------------- |
| 5.1 | Install code block extensions | `@tiptap/extension-code-block-lowlight`, `lowlight`               |
| 5.2 | Blog CRUD functions           | `convex/blogPosts.ts`: create, update, publish, get, list, search |
| 5.3 | Blog editor page              | `/admin/blog/new` with TipTap, cover image upload                 |
| 5.4 | Blog edit page                | `/admin/blog/:id/edit`                                            |
| 5.5 | Admin blog list               | `/admin/blog` with draft/published filter                         |
| 5.6 | Public blog listing           | `/resources` with category filter, search, pagination             |
| 5.7 | Blog post detail              | `/resources/:slug` with rendered HTML                             |
| 5.8 | New resource notifications    | Notify all users on publish                                       |

**Deliverable:** Admin can publish rich blog posts; users can browse and read resources.

### Phase 6: Recruiter Analytics

**Goal:** Full analytics with charts for recruiter internship performance.

| #   | Task                      | Details                                                                      |
| --- | ------------------------- | ---------------------------------------------------------------------------- |
| 6.1 | Analytics query functions | `convex/analytics.ts`: viewsOverTime, applicationsByStatus, conversionFunnel |
| 6.2 | Per-internship analytics  | Section in `/recruiter/internships/:id` with charts                          |
| 6.3 | Analytics dashboard       | `/recruiter/internships/analytics` with cross-internship charts              |
| 6.4 | Chart components          | Reusable chart wrappers using Recharts + shadcn chart                        |

**Deliverable:** Recruiters see detailed analytics with line, bar, pie, and funnel charts.

### Phase 7: Admin Dashboard & Moderation

**Goal:** Platform monitoring, user management, content moderation.

| #   | Task                  | Details                                              |
| --- | --------------------- | ---------------------------------------------------- |
| 7.1 | Admin dashboard       | `/admin/dashboard` with platform-wide stats          |
| 7.2 | User management       | `/admin/users` list + `/admin/users/:id` detail      |
| 7.3 | Internship moderation | `/admin/internships` with moderation actions         |
| 7.4 | Report system         | `convex/reports.ts` + report buttons on content      |
| 7.5 | Report review queue   | `/admin/reports` with review/resolve/dismiss actions |

**Deliverable:** Admin has full platform oversight with moderation capabilities.

---

## 11. Key Design Decisions

| #   | Decision                   | Choice                                                    | Reasoning                                                                                                                                                             |
| --- | -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Role storage               | Clerk `publicMetadata` synced to Convex `users`           | Fast middleware checks (Clerk session claims) + fast DB queries (Convex). Dual enforcement.                                                                           |
| 2   | Route structure            | Real folders for URL paths, route groups for layouts only | Next.js route groups are invisible in URLs. `/candidate/dashboard` needs a real `candidate/` folder inside `(protected)/`.                                            |
| 3   | Quiz questions             | Embedded array in quiz document                           | Always loaded together, no joins needed, well within Convex document size limits for reasonable quiz lengths (< 100 questions).                                       |
| 4   | Application status history | Embedded array in application document                    | Simple audit trail without a separate table. Status changes are append-only and infrequent.                                                                           |
| 5   | File storage               | Convex built-in file storage                              | Same auth model, no external service config (S3, Cloudinary), simpler architecture.                                                                                   |
| 6   | Rich text editor           | TipTap                                                    | Lightweight, extensible, React-native. Used for both blog posts (admin) and internship descriptions (recruiter). Single reusable component.                           |
| 7   | Charts                     | Recharts (already installed)                              | No new dependency. shadcn `chart` component wraps Recharts with theme-aware styling.                                                                                  |
| 8   | Email                      | Resend via Convex Node.js action                          | Well-supported with Convex, simple API, generous free tier (100 emails/day).                                                                                          |
| 9   | In-app notifications       | Convex realtime subscription                              | Automatic push via `useQuery` -- no WebSocket setup, no polling. New notifications appear instantly.                                                                  |
| 10  | Analytics storage          | Separate `internshipViews` table                          | Avoids write conflicts (OCC) on the main `internships` table. Views are high-frequency writes that should be isolated. `viewCount` is denormalized for quick display. |
| 11  | Notification delivery      | Dual-channel (in-app + email)                             | In-app for instant awareness, email for when user is offline. Both fire on the same events.                                                                           |
| 12  | Authorization              | Three-layer (middleware + layout + Convex)                | Defense in depth. Middleware = fast redirect. Layout = UI enforcement. Convex functions = authoritative backend check that cannot be bypassed.                        |
| 13  | Incremental build          | 7 phases, MVP first                                       | Ship working auth + listings first. Each phase adds a complete feature. Enables early feedback and iteration.                                                         |

---

## Appendix A: Page Count Summary

| Area             | Pages                                                                                                                                                                        | Priority  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Auth             | 2 (sign-in, sign-up)                                                                                                                                                         | Phase 1   |
| Public           | 6 (landing, internship browse, internship detail, resources, blog post, sample quizzes)                                                                                      | Phase 1-5 |
| Shared Protected | 3 (profile, settings, notifications)                                                                                                                                         | Phase 1   |
| Candidate        | 7 (dashboard, profile edit, applications list, application detail, quizzes list, quiz take, quiz result)                                                                     | Phase 3-4 |
| Recruiter        | 11 (dashboard, internships list, new internship, internship detail, edit internship, analytics, applications list, application review, quizzes list, new quiz, quiz results) | Phase 2-6 |
| Admin            | 9 (dashboard, users list, user detail, internships, blog list, new blog, edit blog, quizzes, reports)                                                                        | Phase 5-7 |
| **Total**        | **~38 pages**                                                                                                                                                                |           |

## Appendix B: Email Templates (MVP)

Simple HTML emails for each notification type:

1. **Application Status Change** -- "Hi {name}, your application for {internship} has been updated to {status}."
2. **Quiz Assigned** -- "Hi {name}, you've been assigned a quiz for {internship}. Complete it by {deadline}."
3. **Quiz Graded** -- "Hi {name}, your quiz for {internship} has been graded. Your score: {score}/{maxScore}."
4. **New Matching Internship** -- "Hi {name}, a new internship matching your preferences was posted: {title} at {company}."
5. **New Application (Recruiter)** -- "Hi {name}, {candidate} applied to your internship: {title}."
6. **New Resource** -- "Hi {name}, a new resource has been published: {title}."

## Appendix C: Convex Cron Jobs

| Job                       | Schedule          | Purpose                                                           |
| ------------------------- | ----------------- | ----------------------------------------------------------------- |
| Email retry               | Every 5 minutes   | Retry failed emails in `emailQueue` (max 3 retries)               |
| Close expired internships | Daily at midnight | Set `status: "closed"` for internships past `applicationDeadline` |
