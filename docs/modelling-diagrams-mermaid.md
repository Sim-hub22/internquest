# InternQuest Design and Modelling Diagrams - Mermaid Codes

## 9.1 User Authentication and Access Control

### Activity Diagram

```mermaid
flowchart TD
    A([Start]) --> B[Open InternQuest]
    B --> C{Existing user?}
    C -- No --> D[Register Account]
    D --> E[Select Role]
    E --> F[Complete Onboarding]
    C -- Yes --> G[Login]
    F --> H[Authenticate User]
    G --> H
    H --> I{Valid Credentials?}
    I -- No --> J[Show Error]
    J --> G
    I -- Yes --> K{Check Role}
    K --> L[Candidate Dashboard]
    K --> M[Recruiter Dashboard]
    K --> N[Admin Dashboard]
    L --> O([End])
    M --> O
    N --> O
```

### Use Case Diagram

```mermaid
flowchart LR
    User[User]
    Admin[Administrator]
    System[System]

    User --> Register((Register))
    User --> Login((Login))
    User --> Onboarding((Complete Onboarding))
    User --> ProfileAccess((Manage Profile Access))

    System --> Validate((Validate Credentials))
    System --> AssignRole((Assign Role))
    System --> ProtectRoutes((Protect Routes))

    Admin --> ManageAccess((Manage User Access))
```

### ERD

```mermaid
erDiagram
    USERS {
        string clerkId
        string username
        string name
        string email
        string role
        boolean onboardingComplete
        boolean isSuspended
        number createdAt
        number updatedAt
    }

    CANDIDATE_PROFILES {
        string userId
        string headline
        string location
        number updatedAt
    }

    NOTIFICATIONS {
        string userId
        string type
        string title
        boolean isRead
        number createdAt
    }

    USERS ||--o| CANDIDATE_PROFILES : has
    USERS ||--o{ NOTIFICATIONS : receives
```

### Class Diagram

```mermaid
classDiagram
    class User {
        clerkId
        username
        name
        email
        role
        onboardingComplete
        login()
        updateProfile()
    }

    class AuthService {
        validateUser()
        assignRole()
        protectRoute()
    }

    class AccessControl {
        checkRole()
        allowAccess()
        denyAccess()
    }

    User --> AuthService
    AuthService --> AccessControl
```

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant UI as InternQuest UI
    participant Auth as Authentication Service
    participant DB as Database

    User->>UI: Enter login details
    UI->>Auth: Submit credentials
    Auth->>DB: Fetch user role and status
    DB-->>Auth: Return user data
    Auth-->>UI: Authentication result
    UI-->>User: Redirect to role dashboard
```

## 9.2 Candidate Management Module

### Activity Diagram

```mermaid
flowchart TD
    A([Start]) --> B[Login as Candidate]
    B --> C[Build or Update Profile]
    C --> D[Search and Filter Internships]
    D --> E[View Internship Details]
    E --> F{Interested?}
    F -- No --> D
    F -- Yes --> G[Bookmark or Apply]
    G --> H[Select Resume and Submit Application]
    H --> I[Track Application Status]
    I --> J{Quiz Assigned?}
    J -- Yes --> K[Take Quiz]
    K --> L[View Result]
    J -- No --> M[Wait for Update]
    L --> N([End])
    M --> N
```

### Use Case Diagram

```mermaid
flowchart LR
    Candidate[Candidate]

    Candidate --> ManageProfile((Manage Profile))
    Candidate --> Search((Search Internships))
    Candidate --> Filter((Filter Opportunities))
    Candidate --> Bookmark((Bookmark Internship))
    Candidate --> Apply((Submit Application))
    Candidate --> Track((Track Status))
    Candidate --> Quiz((Take Quiz))
    Candidate --> Resources((Access Resources))
```

### ERD

```mermaid
erDiagram
    USERS ||--o| CANDIDATE_PROFILES : owns
    USERS ||--o{ CANDIDATE_RESUMES : uploads
    USERS ||--o{ APPLICATIONS : submits
    USERS ||--o{ INTERNSHIP_BOOKMARKS : creates
    USERS ||--o{ QUIZ_ATTEMPTS : attempts
    INTERNSHIPS ||--o{ APPLICATIONS : receives
    INTERNSHIPS ||--o{ INTERNSHIP_BOOKMARKS : bookmarked_as
    QUIZZES ||--o{ QUIZ_ATTEMPTS : has

    USERS {
        string name
        string email
        string role
    }

    CANDIDATE_PROFILES {
        string headline
        string education
        string skills
        string experience
    }

    CANDIDATE_RESUMES {
        string label
        string originalFilename
        boolean isArchived
    }

    APPLICATIONS {
        string status
        string coverLetter
        number appliedAt
    }
```

### Class Diagram

```mermaid
classDiagram
    class Candidate {
        userId
        manageProfile()
        searchInternships()
        apply()
        trackStatus()
    }

    class CandidateProfile {
        education
        skills
        experience
        preferences
    }

    class Resume {
        label
        fileUrl
        upload()
        archive()
    }

    class Application {
        status
        coverLetter
        submit()
        viewStatus()
    }

    class QuizAttempt {
        answers
        score
        submit()
        viewResult()
    }

    Candidate --> CandidateProfile
    Candidate --> Resume
    Candidate --> Application
    Candidate --> QuizAttempt
```

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Candidate
    participant UI as Candidate Dashboard
    participant API as Backend Service
    participant DB as Database

    Candidate->>UI: Search internship
    UI->>API: Request filtered listings
    API->>DB: Query open internships
    DB-->>API: Return matching listings
    API-->>UI: Display internships
    Candidate->>UI: Submit application
    UI->>API: Send application details
    API->>DB: Save application
    DB-->>API: Confirm submission
    API-->>UI: Show application status
```

## 9.3 Recruiter Management Module

### Activity Diagram

```mermaid
flowchart TD
    A([Start]) --> B[Login as Recruiter]
    B --> C[Create Internship Listing]
    C --> D[Publish Listing]
    D --> E[Receive Applications]
    E --> F[Review Candidate Details]
    F --> G{Assign Quiz?}
    G -- Yes --> H[Create or Select Quiz]
    H --> I[Assign Quiz]
    I --> J[Evaluate Quiz Result]
    G -- No --> K[Update Application Status]
    J --> K
    K --> L[View Analytics]
    L --> M([End])
```

### Use Case Diagram

```mermaid
flowchart LR
    Recruiter[Recruiter]

    Recruiter --> CreateInternship((Create Internship))
    Recruiter --> ManageListings((Manage Listings))
    Recruiter --> ReviewApplications((Review Applications))
    Recruiter --> UpdateStatus((Update Status))
    Recruiter --> CreateQuiz((Create Quiz))
    Recruiter --> AssignQuiz((Assign Quiz))
    Recruiter --> EvaluateResults((Evaluate Results))
    Recruiter --> ViewAnalytics((View Analytics))
```

### ERD

```mermaid
erDiagram
    USERS ||--o{ INTERNSHIPS : posts
    INTERNSHIPS ||--o{ APPLICATIONS : receives
    INTERNSHIPS ||--o{ INTERNSHIP_VIEWS : tracks
    INTERNSHIPS ||--o{ QUIZZES : may_have
    QUIZZES ||--o{ QUIZ_ATTEMPTS : receives
    APPLICATIONS }o--o| QUIZZES : assigned

    USERS {
        string name
        string email
        string role
    }

    INTERNSHIPS {
        string title
        string company
        string status
        string locationType
        number applicationDeadline
    }

    APPLICATIONS {
        string status
        number appliedAt
        number updatedAt
    }

    QUIZZES {
        string title
        string type
        boolean isPublished
    }
```

### Class Diagram

```mermaid
classDiagram
    class Recruiter {
        userId
        createListing()
        reviewApplications()
        assignQuiz()
        viewAnalytics()
    }

    class Internship {
        title
        company
        status
        deadline
        publish()
        close()
    }

    class Quiz {
        title
        questions
        publish()
        assign()
    }

    class Analytics {
        viewCount
        applicationCount
        conversionRate
        generateReport()
    }

    Recruiter --> Internship
    Recruiter --> Quiz
    Recruiter --> Analytics
```

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Recruiter
    participant UI as Recruiter Dashboard
    participant API as Backend Service
    participant DB as Database

    Recruiter->>UI: Create internship
    UI->>API: Submit listing details
    API->>DB: Store internship
    DB-->>API: Listing saved
    API-->>UI: Show listing
    Recruiter->>UI: Review application
    UI->>API: Request applicant details
    API->>DB: Fetch application
    DB-->>API: Return application
    API-->>UI: Display candidate details
```

## 9.4 Administrative Management Module

### Activity Diagram

```mermaid
flowchart TD
    A([Start]) --> B[Login as Admin]
    B --> C[Open Admin Dashboard]
    C --> D{Select Task}
    D --> E[Manage Users]
    D --> F[Moderate Internships]
    D --> G[Manage Categories]
    D --> H[Publish Resources]
    D --> I[Review Reports]
    E --> J[Suspend or Unsuspend User]
    F --> K[Close or Approve Listing]
    G --> L[Approve or Reject Category]
    H --> M[Create or Publish Post]
    I --> N[Resolve or Dismiss Report]
    J --> O([End])
    K --> O
    L --> O
    M --> O
    N --> O
```

### Use Case Diagram

```mermaid
flowchart LR
    Admin[Administrator]

    Admin --> ManageUsers((Manage Users))
    Admin --> Suspend((Suspend Account))
    Admin --> ModerateInternships((Moderate Internships))
    Admin --> ReviewCategories((Review Categories))
    Admin --> PublishResources((Publish Resources))
    Admin --> CreateSampleQuizzes((Create Sample Quizzes))
    Admin --> ReviewReports((Review Reports))
```

### ERD

```mermaid
erDiagram
    USERS ||--o{ REPORTS : submits
    USERS ||--o{ BLOG_POSTS : authors
    USERS ||--o{ INTERNSHIP_CATEGORIES : requests
    USERS ||--o{ QUIZZES : creates
    REPORTS }o--o| USERS : reviewed_by
    INTERNSHIPS }o--o| USERS : moderated_by

    USERS {
        string name
        string email
        string role
        boolean isSuspended
    }

    REPORTS {
        string targetType
        string targetId
        string reason
        string status
    }

    BLOG_POSTS {
        string title
        string slug
        string status
    }

    INTERNSHIP_CATEGORIES {
        string name
        string slug
        string status
    }
```

### Class Diagram

```mermaid
classDiagram
    class Administrator {
        userId
        manageUsers()
        moderateListing()
        reviewReport()
        publishResource()
    }

    class Report {
        targetType
        reason
        status
        review()
        resolve()
    }

    class BlogPost {
        title
        status
        publish()
        unpublish()
    }

    class Category {
        name
        status
        approve()
        reject()
    }

    Administrator --> Report
    Administrator --> BlogPost
    Administrator --> Category
```

### Sequence Diagram

```mermaid
sequenceDiagram
    actor Admin
    participant UI as Admin Dashboard
    participant API as Backend Service
    participant DB as Database

    Admin->>UI: Open reports page
    UI->>API: Request pending reports
    API->>DB: Fetch reports
    DB-->>API: Return reports
    API-->>UI: Display report list
    Admin->>UI: Resolve report
    UI->>API: Submit moderation action
    API->>DB: Update report and target
    DB-->>API: Confirm update
    API-->>UI: Show updated status
```

## 9.5 Shared Platform Services

### Activity Diagram

```mermaid
flowchart TD
    A([Start]) --> B[System Event Occurs]
    B --> C{Event Type}
    C --> D[Application Update]
    C --> E[Quiz Assignment]
    C --> F[New Internship]
    C --> G[New Resource]
    D --> H[Create Notification]
    E --> H
    F --> H
    G --> H
    H --> I[Send In-App Notification]
    H --> J[Send Email Notification]
    I --> K[Update Dashboard]
    J --> K
    K --> L([End])
```

### Use Case Diagram

```mermaid
flowchart LR
    Candidate[Candidate]
    Recruiter[Recruiter]
    Admin[Administrator]
    System[System]

    Candidate --> ReceiveNotifications((Receive Notifications))
    Recruiter --> ReceiveNotifications
    Admin --> ReceiveNotifications

    Candidate --> ViewDashboard((View Dashboard))
    Recruiter --> ViewDashboard
    Admin --> ViewDashboard

    Recruiter --> ViewAnalytics((View Analytics))
    Admin --> ManageContent((Manage Content))

    System --> SendEmail((Send Email))
    System --> StoreFiles((Store Files))
```

### ERD

```mermaid
erDiagram
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ CANDIDATE_RESUMES : uploads
    INTERNSHIPS ||--o{ INTERNSHIP_VIEWS : records
    BLOG_POSTS }o--|| USERS : authored_by
    APPLICATIONS ||--o{ NOTIFICATIONS : triggers
    QUIZZES ||--o{ NOTIFICATIONS : triggers

    NOTIFICATIONS {
        string type
        string title
        string message
        boolean isRead
    }

    INTERNSHIP_VIEWS {
        string viewerKey
        number viewedAt
    }

    CANDIDATE_RESUMES {
        string label
        string originalFilename
        boolean isArchived
    }
```

### Class Diagram

```mermaid
classDiagram
    class NotificationService {
        createNotification()
        markAsRead()
        sendEmail()
    }

    class AnalyticsService {
        trackView()
        calculateMetrics()
        generateDashboard()
    }

    class StorageService {
        generateUploadUrl()
        getFileUrl()
        validateFile()
    }

    class ContentService {
        createPost()
        publishPost()
        manageData()
    }

    NotificationService --> AnalyticsService
    StorageService --> ContentService
```

### Sequence Diagram

```mermaid
sequenceDiagram
    participant Event as System Event
    participant Notify as Notification Service
    participant Email as Email Service
    participant DB as Database
    participant User as User Interface

    Event->>Notify: Trigger notification
    Notify->>DB: Store notification
    Notify->>Email: Send email alert
    Email-->>Notify: Delivery response
    User->>DB: Fetch unread notifications
    DB-->>User: Return notification list
```
