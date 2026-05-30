# InternQuest PlantUML Codes - Clean Report Version

Use these versions if the original diagrams show spacing, overlap, or icon issues. These snippets remove entity/class icons, use Arial, reduce font size, and improve layout consistency.

## 9.1 User Authentication and Access Control

### Activity Diagram

```plantuml
@startuml
skinparam defaultFontName Arial
skinparam defaultFontSize 14
skinparam ArrowFontSize 12
skinparam ActivityFontSize 14
skinparam ConditionStyle diamond

start
:Open InternQuest;

if (Existing user?) then (Yes)
  :Login;
else (No)
  :Register Account;
  :Select Role;
  :Complete Onboarding;
endif

:Authenticate User;

if (Valid Credentials?) then (Yes)
  if (User Role?) then (Candidate)
    :Candidate Dashboard;
  elseif (Recruiter)
    :Recruiter Dashboard;
  else (Admin)
    :Admin Dashboard;
  endif
else (No)
  :Show Error Message;
  :Return to Login;
endif

stop
@enduml
```

### Use Case Diagram

```plantuml
@startuml
left to right direction
skinparam defaultFontName Arial
skinparam defaultFontSize 14
skinparam packageStyle rectangle

actor User
actor Administrator

rectangle "User Authentication and Access Control" {
  usecase "Register" as UC1
  usecase "Login" as UC2
  usecase "Complete\nOnboarding" as UC3
  usecase "Manage\nProfile Access" as UC4
  usecase "Validate\nCredentials" as UC5
  usecase "Assign Role" as UC6
  usecase "Protect Routes" as UC7
  usecase "Manage\nUser Access" as UC8
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
hide circle
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam classFontSize 14
skinparam classAttributeFontSize 13
skinparam linetype ortho

entity "USERS" as USERS {
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

entity "CANDIDATE_PROFILES" as CANDIDATE_PROFILES {
  * userId : string
  --
  headline : string
  location : string
  updatedAt : number
}

entity "NOTIFICATIONS" as NOTIFICATIONS {
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
hide circle
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam classAttributeIconSize 0
skinparam classFontSize 14
skinparam classAttributeFontSize 13
skinparam linetype ortho

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
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam SequenceMessageAlign center

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

## Reusable Fixes

Add these lines near the top of any PlantUML diagram if text appears too spaced out or overlaps:

```plantuml
skinparam defaultFontName Arial
skinparam defaultFontSize 13
skinparam classAttributeIconSize 0
hide circle
```

For ERD and class diagrams, `hide circle` removes the green `E` or `C` icon that can overlap with the title. For class diagrams, `classAttributeIconSize 0` removes small attribute icons that can disturb spacing.
