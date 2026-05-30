# InternQuest Design and Modelling Diagrams - PlantUML Codes

## 9.1 User Authentication and Access Control

### Activity Diagram

```plantuml
@startuml
start
:Open InternQuest;
if (Existing user?) then (No)
  :Register Account;
  :Select Role;
  :Complete Onboarding;
else (Yes)
  :Login;
endif
:Authenticate User;
if (Valid Credentials?) then (No)
  :Show Error;
  :Login;
else (Yes)
  if (Check Role) then (Candidate)
    :Candidate Dashboard;
  elseif (Recruiter)
    :Recruiter Dashboard;
  else (Admin)
    :Admin Dashboard;
  endif
endif
stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
actor User
actor Administrator

rectangle "InternQuest Authentication System" {
  usecase "Register" as UC1
  usecase "Login" as UC2
  usecase "Complete Onboarding" as UC3
  usecase "Manage Profile Access" as UC4
  usecase "Validate Credentials" as UC5
  usecase "Assign Role" as UC6
  usecase "Protect Routes" as UC7
  usecase "Manage User Access" as UC8
}

User --> UC1
User --> UC2
User --> UC3
User --> UC4
UC2 ..> UC5 : includes
UC3 ..> UC6 : includes
UC4 ..> UC7 : includes
Administrator --> UC8
@enduml
```

### ERD

```plantuml
@startuml
entity USERS {
  * clerkId : string
  --
  username : string
  name : string
  email : string
  role : string
  onboardingComplete : boolean
  isSuspended : boolean
  createdAt : number
  updatedAt : number
}

entity CANDIDATE_PROFILES {
  * userId : string
  --
  headline : string
  location : string
  updatedAt : number
}

entity NOTIFICATIONS {
  * userId : string
  --
  type : string
  title : string
  isRead : boolean
  createdAt : number
}

USERS ||--o| CANDIDATE_PROFILES : has
USERS ||--o{ NOTIFICATIONS : receives
@enduml
```

### Class Diagram

```plantuml
@startuml
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
@enduml
```

### Sequence Diagram

```plantuml
@startuml
actor User
participant "InternQuest UI" as UI
participant "Authentication Service" as Auth
database "Database" as DB

User -> UI : Enter login details
UI -> Auth : Submit credentials
Auth -> DB : Fetch user role and status
DB --> Auth : Return user data
Auth --> UI : Authentication result
UI --> User : Redirect to role dashboard
@enduml
```

## 9.2 Candidate Management Module

### Activity Diagram

```plantuml
@startuml
start
:Login as Candidate;
:Build or Update Profile;
:Search and Filter Internships;
:View Internship Details;
if (Interested?) then (No)
  :Search and Filter Internships;
else (Yes)
  :Bookmark or Apply;
  :Select Resume and Submit Application;
  :Track Application Status;
  if (Quiz Assigned?) then (Yes)
    :Take Quiz;
    :View Result;
  else (No)
    :Wait for Update;
  endif
endif
stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
actor Candidate

rectangle "Candidate Management Module" {
  usecase "Manage Profile" as UC1
  usecase "Search Internships" as UC2
  usecase "Filter Opportunities" as UC3
  usecase "Bookmark Internship" as UC4
  usecase "Submit Application" as UC5
  usecase "Track Status" as UC6
  usecase "Take Quiz" as UC7
  usecase "Access Resources" as UC8
}

Candidate --> UC1
Candidate --> UC2
Candidate --> UC3
Candidate --> UC4
Candidate --> UC5
Candidate --> UC6
Candidate --> UC7
Candidate --> UC8
@enduml
```

### ERD

```plantuml
@startuml
entity USERS {
  * userId : string
  --
  name : string
  email : string
  role : string
}

entity CANDIDATE_PROFILES {
  * profileId : string
  --
  headline : string
  education : string
  skills : string
  experience : string
}

entity CANDIDATE_RESUMES {
  * resumeId : string
  --
  label : string
  originalFilename : string
  isArchived : boolean
}

entity APPLICATIONS {
  * applicationId : string
  --
  status : string
  coverLetter : string
  appliedAt : number
}

entity INTERNSHIPS {
  * internshipId : string
  --
  title : string
  company : string
  status : string
}

entity INTERNSHIP_BOOKMARKS {
  * bookmarkId : string
  --
  createdAt : number
}

entity QUIZZES {
  * quizId : string
  --
  title : string
  type : string
}

entity QUIZ_ATTEMPTS {
  * attemptId : string
  --
  score : number
  status : string
}

USERS ||--o| CANDIDATE_PROFILES : owns
USERS ||--o{ CANDIDATE_RESUMES : uploads
USERS ||--o{ APPLICATIONS : submits
USERS ||--o{ INTERNSHIP_BOOKMARKS : creates
USERS ||--o{ QUIZ_ATTEMPTS : attempts
INTERNSHIPS ||--o{ APPLICATIONS : receives
INTERNSHIPS ||--o{ INTERNSHIP_BOOKMARKS : bookmarked_as
QUIZZES ||--o{ QUIZ_ATTEMPTS : has
@enduml
```

### Class Diagram

```plantuml
@startuml
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
@enduml
```

### Sequence Diagram

```plantuml
@startuml
actor Candidate
participant "Candidate Dashboard" as UI
participant "Backend Service" as API
database "Database" as DB

Candidate -> UI : Search internship
UI -> API : Request filtered listings
API -> DB : Query open internships
DB --> API : Return matching listings
API --> UI : Display internships
Candidate -> UI : Submit application
UI -> API : Send application details
API -> DB : Save application
DB --> API : Confirm submission
API --> UI : Show application status
@enduml
```

## 9.3 Recruiter Management Module

### Activity Diagram

```plantuml
@startuml
start
:Login as Recruiter;
:Create Internship Listing;
:Publish Listing;
:Receive Applications;
:Review Candidate Details;
if (Assign Quiz?) then (Yes)
  :Create or Select Quiz;
  :Assign Quiz;
  :Evaluate Quiz Result;
else (No)
endif
:Update Application Status;
:View Analytics;
stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
actor Recruiter

rectangle "Recruiter Management Module" {
  usecase "Create Internship" as UC1
  usecase "Manage Listings" as UC2
  usecase "Review Applications" as UC3
  usecase "Update Status" as UC4
  usecase "Create Quiz" as UC5
  usecase "Assign Quiz" as UC6
  usecase "Evaluate Results" as UC7
  usecase "View Analytics" as UC8
}

Recruiter --> UC1
Recruiter --> UC2
Recruiter --> UC3
Recruiter --> UC4
Recruiter --> UC5
Recruiter --> UC6
Recruiter --> UC7
Recruiter --> UC8
@enduml
```

### ERD

```plantuml
@startuml
entity USERS {
  * userId : string
  --
  name : string
  email : string
  role : string
}

entity INTERNSHIPS {
  * internshipId : string
  --
  title : string
  company : string
  status : string
  locationType : string
  applicationDeadline : number
}

entity APPLICATIONS {
  * applicationId : string
  --
  status : string
  appliedAt : number
  updatedAt : number
}

entity QUIZZES {
  * quizId : string
  --
  title : string
  type : string
  isPublished : boolean
}

entity QUIZ_ATTEMPTS {
  * attemptId : string
  --
  score : number
  status : string
}

entity INTERNSHIP_VIEWS {
  * viewId : string
  --
  viewerKey : string
  viewedAt : number
}

USERS ||--o{ INTERNSHIPS : posts
INTERNSHIPS ||--o{ APPLICATIONS : receives
INTERNSHIPS ||--o{ INTERNSHIP_VIEWS : tracks
INTERNSHIPS ||--o{ QUIZZES : may_have
QUIZZES ||--o{ QUIZ_ATTEMPTS : receives
APPLICATIONS }o--o| QUIZZES : assigned
@enduml
```

### Class Diagram

```plantuml
@startuml
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
@enduml
```

### Sequence Diagram

```plantuml
@startuml
actor Recruiter
participant "Recruiter Dashboard" as UI
participant "Backend Service" as API
database "Database" as DB

Recruiter -> UI : Create internship
UI -> API : Submit listing details
API -> DB : Store internship
DB --> API : Listing saved
API --> UI : Show listing
Recruiter -> UI : Review application
UI -> API : Request applicant details
API -> DB : Fetch application
DB --> API : Return application
API --> UI : Display candidate details
@enduml
```

## 9.4 Administrative Management Module

### Activity Diagram

```plantuml
@startuml
start
:Login as Admin;
:Open Admin Dashboard;
if (Select Task) then (Manage Users)
  :Suspend or Unsuspend User;
elseif (Moderate Internships)
  :Close or Approve Listing;
elseif (Manage Categories)
  :Approve or Reject Category;
elseif (Publish Resources)
  :Create or Publish Post;
else (Review Reports)
  :Resolve or Dismiss Report;
endif
stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
actor Administrator

rectangle "Administrative Management Module" {
  usecase "Manage Users" as UC1
  usecase "Suspend Account" as UC2
  usecase "Moderate Internships" as UC3
  usecase "Review Categories" as UC4
  usecase "Publish Resources" as UC5
  usecase "Create Sample Quizzes" as UC6
  usecase "Review Reports" as UC7
}

Administrator --> UC1
Administrator --> UC2
Administrator --> UC3
Administrator --> UC4
Administrator --> UC5
Administrator --> UC6
Administrator --> UC7
@enduml
```

### ERD

```plantuml
@startuml
entity USERS {
  * userId : string
  --
  name : string
  email : string
  role : string
  isSuspended : boolean
}

entity REPORTS {
  * reportId : string
  --
  targetType : string
  targetId : string
  reason : string
  status : string
}

entity BLOG_POSTS {
  * postId : string
  --
  title : string
  slug : string
  status : string
}

entity INTERNSHIP_CATEGORIES {
  * categoryId : string
  --
  name : string
  slug : string
  status : string
}

entity QUIZZES {
  * quizId : string
  --
  title : string
  type : string
}

entity INTERNSHIPS {
  * internshipId : string
  --
  title : string
  status : string
}

USERS ||--o{ REPORTS : submits
USERS ||--o{ BLOG_POSTS : authors
USERS ||--o{ INTERNSHIP_CATEGORIES : requests
USERS ||--o{ QUIZZES : creates
REPORTS }o--o| USERS : reviewed_by
INTERNSHIPS }o--o| USERS : moderated_by
@enduml
```

### Class Diagram

```plantuml
@startuml
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
@enduml
```

### Sequence Diagram

```plantuml
@startuml
actor Admin
participant "Admin Dashboard" as UI
participant "Backend Service" as API
database "Database" as DB

Admin -> UI : Open reports page
UI -> API : Request pending reports
API -> DB : Fetch reports
DB --> API : Return reports
API --> UI : Display report list
Admin -> UI : Resolve report
UI -> API : Submit moderation action
API -> DB : Update report and target
DB --> API : Confirm update
API --> UI : Show updated status
@enduml
```

## 9.5 Shared Platform Services

### Activity Diagram

```plantuml
@startuml
start
:System Event Occurs;
if (Event Type) then (Application Update)
  :Create Notification;
elseif (Quiz Assignment)
  :Create Notification;
elseif (New Internship)
  :Create Notification;
else (New Resource)
  :Create Notification;
endif
:Send In-App Notification;
:Send Email Notification;
:Update Dashboard;
stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
actor Candidate
actor Recruiter
actor Administrator
actor System

rectangle "Shared Platform Services" {
  usecase "Receive Notifications" as UC1
  usecase "View Dashboard" as UC2
  usecase "View Analytics" as UC3
  usecase "Manage Content" as UC4
  usecase "Send Email" as UC5
  usecase "Store Files" as UC6
}

Candidate --> UC1
Recruiter --> UC1
Administrator --> UC1
Candidate --> UC2
Recruiter --> UC2
Administrator --> UC2
Recruiter --> UC3
Administrator --> UC4
System --> UC5
System --> UC6
@enduml
```

### ERD

```plantuml
@startuml
entity USERS {
  * userId : string
  --
  name : string
  email : string
  role : string
}

entity NOTIFICATIONS {
  * notificationId : string
  --
  type : string
  title : string
  message : string
  isRead : boolean
}

entity CANDIDATE_RESUMES {
  * resumeId : string
  --
  label : string
  originalFilename : string
  isArchived : boolean
}

entity INTERNSHIPS {
  * internshipId : string
  --
  title : string
  status : string
}

entity INTERNSHIP_VIEWS {
  * viewId : string
  --
  viewerKey : string
  viewedAt : number
}

entity BLOG_POSTS {
  * postId : string
  --
  title : string
  status : string
}

entity APPLICATIONS {
  * applicationId : string
  --
  status : string
}

entity QUIZZES {
  * quizId : string
  --
  title : string
}

USERS ||--o{ NOTIFICATIONS : receives
USERS ||--o{ CANDIDATE_RESUMES : uploads
INTERNSHIPS ||--o{ INTERNSHIP_VIEWS : records
BLOG_POSTS }o--|| USERS : authored_by
APPLICATIONS ||--o{ NOTIFICATIONS : triggers
QUIZZES ||--o{ NOTIFICATIONS : triggers
@enduml
```

### Class Diagram

```plantuml
@startuml
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
@enduml
```

### Sequence Diagram

```plantuml
@startuml
participant "System Event" as Event
participant "Notification Service" as Notify
participant "Email Service" as Email
database "Database" as DB
participant "User Interface" as User

Event -> Notify : Trigger notification
Notify -> DB : Store notification
Notify -> Email : Send email alert
Email --> Notify : Delivery response
User -> DB : Fetch unread notifications
DB --> User : Return notification list
@enduml
```
