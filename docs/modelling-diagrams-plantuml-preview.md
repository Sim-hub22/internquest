# InternQuest PlantUML Diagram Previews

This file uses the original PlantUML codes from `modelling-diagrams-plantuml.md`.
Each preview is rendered through the public PlantUML server URL.

## 9.1 User Authentication and Access Control

### Activity Diagram

![Activity Diagram](https://www.plantuml.com/plantuml/svg/PL71QiCm3BtxAtHCVo4vh27hOJ1MbjB1Zfwj9cQE7MIPxlCdk-qetSKyIK_lFU5jOasS5wygKEr-nG0lWP72UyR4dN8dQ7O_Bh4B4-I4zBG1deNLlCMD0cX7d6IA1BqnCGTPaUO1FHg6CNgizH2NrICZxCDNr6H5h5Fe4qBpYQdglCR91Ma6wqwgxNCnOMUqB1t5zfBaGtjdOI2qPQXzUanpcECPTaIHkdlHUwUYCynelckys_wWnTYAMw6KnBSQddMQQ-YYM9IAm8Y6ifEph_I_-ZyTcjukBbo95J-GwicNDt5SrLQmVCel)

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

![Use Case Diagram](https://www.plantuml.com/plantuml/svg/RPBDIaCn48NtUOgX-nRiFowabwu4HQtK_PXCqq3kH39p5oA-kxabXHJSPSxvE3bCiXF5h4CVJQIJWYR8mPyLNCXaDIGsQ3LbE0hbUknS7pY8PYoJCIE7x2F1v96LChyD90hTe6TY3HR757Z_5gL-0Zy6O12oA8K_a2yvb2U00iVzNUiz9H-u6lFMsAV-Av8IlF1dmkm2-uejMkmP6Jt1QqwdKBfrrf981PSj-84nE2nv-qnkR8pnogrQhXC9dk6G8bLxtThb8YsRAFwWT0tO_DDetEHjdQtvDUOYJwSFbpqqmxmT5ksmDCM5sMmyh-0U0jiuE98YBwgylfMNLTwqyirprkYjsH6xyYl-0000)

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

![ERD](https://www.plantuml.com/plantuml/svg/XL9DYuCm5BpxAt9Uy0zugbWBWKKNjUSIpMCRDX-IF1TAxN_lar8mKjfBuCrCc9cNx08AZvFH2LXKU677jcnQTaqO-sA31l_79SjOGA_iBu5fIiSKm5jXO4riPp12wJNWdOu4plPEU4b3uSoe0HUsTwGIbcWLsYcCO2N821yy20IP8w5sCZtu9T0ej-0jUJOgychFztbNddwQ-i2_osUzfSQBTcSGKYiRXTLk4AYSNMDlJQkwumTUv1slgmz-U1aZBxeVRqg5XY9zsW9vFzvkdjFKpQzgP-mimbfrtUJCc8S1r3-4P4Uhfszn1m00)

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

![Class Diagram](https://www.plantuml.com/plantuml/svg/LL0n3i8m3DppYemmz0i8nCI6G3mW9AP4TUFASK48yNUS55Lbik_YyvsppU9OnXwDHvUplMHW-pRMUWJk3a6xKQdaUj3sLw1t4RKoOO6KhkGunDJkgHyGf918RKohTT4FmGaScMuHGPcF-NdjHhcVWH_HGxLyE8nbj6IeIXsARJfHbLaxC0buET4e_tkyXvptb4G3JU7luBjPvn3fEGrL722zPgXRwirDira6CijmzMrfOhQGWdxQ5m00)

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

![Sequence Diagram](https://www.plantuml.com/plantuml/svg/NP1DQWCn38NtFeMOVIxGHKd3j91b6t80ZIqw1aSEajppLvgaX6Rbd-_vlIVlrL1iN5h2R5tWh2JfwbSrrokomNHa8-7FGMfmFaw0wij_oTkmbTZFQBKpd4X-QgPD6YWLD5nG2QRvljlOV4Wfyc3twfRm0kyH1Qr_LuP2XhLfSk0uR5nm6ikb6cIX4ddeV2Ekc0_EFyZo2YCyfJS2v08-e0rDpdSFeo-o8NnJHhkxpL-Hfu64T3JRgeGY7eL5gKBPmFejhA2kIqSfQKzS_4j_0G00)

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

![Activity Diagram](https://www.plantuml.com/plantuml/svg/XL7BJiGm3BpdAtpi_iBsmEw2a93G2YWFSJIjkxMQ9bNi2C7NamT2lN6nd9c9FROFeXWqBjQKnEpl_OKTeC0rke47L6hD_XJP3k03lAmPWOVWHxQPwGX3Fq7ImYrRfG1tBaKd4w-I-5Ucpmq4DwJ8DZ4yGbDm4gNXQWSwaOFcx7S6uB-oP8MWUISfufFtyu9XpWQFwsg_sbh2Kg_mH18NAfMw-B6m5WdtgEnT4Ju7xESj2fsYHibaTlaO-HkE8dnn6wE_pVD_d0cogAtlCd9kQpKZrMkTAx5lc2oCVwiiYhJeqTGewbTpI7awoGy0)

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

![Use Case Diagram](https://www.plantuml.com/plantuml/svg/PPBBJiCm403l_efLxptGzmcrL4BYKF4eVC3YR9DL7DkornSG_qu2QN7nTMRajLVUHi4WgJFAq4b070Ik6u6A0sbXPnLgSG7sQ2kkK4YfGQ2j3S7aGk605clgo0eSN9KCJU1J0QH86cDV_dfu2kx4WyG8R_kRl3WI1jt0WnKADZRiurZDykgUJU_XqNlNNzkoC9sxUTxTETTs6Dhil35RN0rDxnqBxBmth75uxrWjy-ere6xXA2ZfF6nrvR4bU4xyCSfrBdTQKupmGj6be2-ttQWlfVxsDvtU_YpaFvaLP5wGHK6M1LaLP5sGZTgIhVg_y0q0)

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

![ERD](https://www.plantuml.com/plantuml/svg/ZPJBKeD044NtVCMihSeFi18JB2dpG48sRb8JQ9EkpCjvgD7uxuuFua1DIZSikYvzRjzkk3IMQkiuIq1Oj0UoMkRLahmbX5mGPq0NBKc9iHh5rjT68_yGb4DO14wHXGKjMI1uJxhUusm-AIPPdQ_BQd5TJFCEfBHyG0OHrWveor3qUQrhg4KfmgBP8sEc9tjHe154yuUNAb-kPYSh6epZCIUCRg0tfTIuHK7PjNS-Z0HDffiTFi5ddutqUL0HmBEod1RZh2uMyuvBbMBuFLO4xhTaNM-wHZw1deAreCFoLnjeC-kBml4Dw01RpEkycYzlYhAZel3l2xD35O7wTnZqcLnHSUZ5FZ0MWwsl5elRMLRTTbGVo9vJlOym6mtKdlD_johkxq-RUdJu-X_Nzg2Y5_3PRPtLTJuhwzCMV9vSsTW66gdXrrHqykzlvtWSZUGnTkmfaS_2XBAto1scn2acQJiGzcx6Kzs6enreefcdFw4EjFtnqsvqauHN4cThQC3VTbHwnaAtScZNr2JT8izOsNd99OZM_vO-0000)

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

![Class Diagram](https://www.plantuml.com/plantuml/svg/PP5BRiCm34JtFeMNxI9NA19q5Q2BVj03CDAa8IBB0aav_Q1thoGNYE6iH0wbno6rLIEnF8JE1LBj7obwzcJeVxg-pmhP-n8C5Ea3pp8UEU3klYWA4dVQHuD4FN7Ifb9AuQj59kJERqQMQ-MtM_F_MQqDV7PaFCRAFNC8MiNF1654Xv8amH5I4xsoNg5vc0c13WZbhCXtgL5EOIG_cof6USBIngxuvBbdUw_DQ0dSE46UO6MiAkV3mDOW4-DoEyvBvkzTkJmaQnoAUe5KaBfHS8kedeFDYEkkDvk7cysiolEmAt4nnggoCDPj4NtvuJy0)

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

![Sequence Diagram](https://www.plantuml.com/plantuml/svg/RP7FJiCm38VlUGfhzxq01pIwNdO3AXx0JJngaQOXTeRszhWJVnh4BV9dV_ufFeXYqJf7XrwN0aTCWGCgkMnrzfmnAUn-oj2ZJEE29Um01LvERL-7_erIW87AXJtTUXuUJyv6SKGXsFLVhnlgE-T-rVjxyy6T3MFn4t1IAaacpixA1araz9dUAud2cQDn2X1PbDEhk9LRMzzPrrEbSeKbKzfun1dRRqnQIu8PrKyc-2FwJjEpv8ZNHlDFvZhEh80vH_QelAGczB1-oWP284MERUO1BzGOchJ79Psvp23h9f6LDpc7QVbeLjXbjOexs6gxxoS0)

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

![Activity Diagram](https://www.plantuml.com/plantuml/svg/JL11JiGm3Bpd5JwsNsWFRBLmG5eXOBL874FNsreAJXGxNS7hSI8XzMRFU3nZ7qHzrl8TN2lSS8eBCNY1Tvnp8SKykk6OqIl2CrlBibA24uaIByQzbgz0ikuGKo9j25DAWMQl55aQl17UuUZvIjUwxX7LKp2ARj1D8hGml1NwVUX1LsJeFb5w1_1l7pESCU2iRMgip4xL-gVDXr9dAs8dI0awEWo2qBt4tg5vtznmIIt0BY2SrMkfCJzgo8bz-56Q3H2DoHrCQ4_w0m00)

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

![Use Case Diagram](https://www.plantuml.com/plantuml/svg/RP8zJmCn38Rt_0hhzWxqUqAjAWOaEd2ex5REf9PItobnYW3ntxahFOW8w_C-YLzPtaJ5eEdaZQSN1MqXi3igD1p8AhTYq6eRe2OR4Yi5OuO0nNc2weV27WKTdKWKzcsJF5NmOG1I98knDtU1K0dkfPSb7hch02CSTZUvzFq9F71K5XUloZHNQZeplSAswpnR70gEsYpN3bqpZ7jIr3GAyt_wF2P-lyQBFDx6o4xoU9d7TsVqQNXVKqnUnmcht7c-z1JqRyfsDDRcqvZVhKqcjvST_2NJWimACY_8eY3BWgmAiZORagQ_W2y0)

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

![ERD](https://www.plantuml.com/plantuml/svg/ZLD1JiCm4Bpd5JuZvGCvDO98M409RGfIBvMRhDeLZctiJL5e-tVSGgYJvi35X_7ipiokFN4aB3MrZ40HKiiMysmsP_k8iHlMEB2yOWbpP55jF1R7_b2YXX24Mg0C0QjbG3X6NMy-BRBPT7xFyqu15O5LRejcHCVNo9vGgMiZL1j2tZurBaIaBWMXLaLhUiN268a_LtSWAedgTAsQUWqsy9Zc-IE_JGl-FErC1fKZBgyTdFbGfNJfprXZAa5zy2Bwik3BPTRfVJJuzPznq20XkhnPItHRE1MljT-2K0ELLLeKsLDU_6KZWjhGMAvIMmWJ38EExNNrohEthlSEuNEayGa6-m2zFPx1uNH-tkBX4CTwttiy2JFQaOj2x9VMsr_2B9I0EnYbNjbE65bHle-IknKbh1RjQYjs47LGmBYCDv3kMJfgJpu4xOHpk55GHHDGbV-8tm00)

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

![Class Diagram](https://www.plantuml.com/plantuml/svg/NL51Zi8m3Bpt5Jtk7lW2OiK9YGlzGJQrMal12RPJnAxsxpZf0gMtoTYU6JixKSUQpw7nmOcq7NZEgC3jRzEsMO0FlG7Fu1IEA8eqV7mQmp0XNBzI2kYTOYIfj6dWGAUCF_LPUyY5cw8l3N_Dly-1p8Dan5ID53L0yOddvEXco79f5WCzk3uWbMhAtm5bhCe-H86bOl5yqxfaa1fiDJb7N8u-4zRvadaVCsdfVUtte7oa2LYCwUmaHWn0m0OxI95rrdsTSRFPBfPT5Khc5VNCqko0UlkOEm00)

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

![Sequence Diagram](https://www.plantuml.com/plantuml/svg/RP51QiCm44NtEiNWVIxGHKbTKmXqKMnwWB4qr4CLMP563hbznccS8iXE_F_dwMkqpu99oj4Rj38dwCccmaB9HDNPSiGWq3naw31Fuup9DO0PlWzrhaNxIy71G6bXIxVCszV1E1GSCHCqtVrqixhMc7_qxbLvy0BlYL08EAWOyiJHgAocWjGTodXa0SzPEFo08q7ssQocPhfsZUXBgdbLTm_0vtqouqBkRswxUPZcyqP-KgodXUaC6ADdYy9pg9hrT2gKPVDr7y_AVP3OgM9KxNgIaaBbLnKxpj7Z1PJlsArxsYxPw-Br8wy0)

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

![Activity Diagram](https://www.plantuml.com/plantuml/svg/JT3DRi8m30VmUvx2n_8AvG8gbqcW8JuU853JUalZo4wPzlPpbgBj5il_NsnvezbBdgVWVX-ktVD04Rp2jfyehbtxdZ3M0dPUnnjxwTUE7j2SCU0zmyNhvmhoQB7cuACV4AwAeYi7q9vdDTy32roZBaLfhnq6nVBDWNiKdn7UOaQ9EbAgjWkiMEGs9U4dmfuqKnp-qJgkCpsm45RtYfiyuKTPSGby_ydZV0kaemMKPxaliXCiYnXyzO-ikIfeJlWa_3AIM785XOSwQaSwaUhIDXDxUjXLERcDlUt4Fm00)

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

![Use Case Diagram](https://www.plantuml.com/plantuml/svg/RP9DQyCm38Rl_XKYznxMpzjeoMc7mfRI7-3PMY98x2397NJily_TbfA2ZtxU1xr8U2zgMTFGcnu_53G2KzifU69qIZ4OwpGo7Fn0WKJPvfSnjz26jaUePWbT48uss1O730h7w5EF5NmPW2Jeh6JzBuUp84i5Lk1SFytpKv8HWuU3Sp45_LUM3oEYnzo6y18KEKX7upHgDVSQl11-GftLDZBX9AtdqcjwxqawQ51YOdUNDdEfPhprdUmmvfNV4bslTt5Rg6nmZAoJiJFVnZmS41QBvz_5ItHPfAiYNHVffaYtHRep-tpk_05-0000)

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

![ERD](https://www.plantuml.com/plantuml/svg/ZPEnReCm48Ptdi9p9Lw0AMs5KgGgK21B5cJ2YLW2c_ZEhMZ8kzTf2W7AmCBm--U-kz_d3HBNPEhA0Kc2MhPF_3XX5uUn9sOGT50mZo5f8KkhkQxzI5x3M8IQYseiQ5LD308JWmt80cx5ScMFkNIkJi-C_IYCqvwgeL6Q5hYsqn8eRPj9yRiwjMlWgEHOiMEImOVoWB-yXzii2fE1toXSf0kQJeMLATSXWbtgnxlaBOYor-VKtuPnuFUq8oSebMvNvBmU-B4F3eS1SJRYUyr0D4bsgVs-ef04Mk99DAk2-j_dVSkwpdNLPRX-Qp1vBGYdnwCByXWtT59wvbZErxDhS3Q0ytfzE1uxsZqXGATluAgieVjx0hVVFmLyGP7bhJFEO6QhLG7QrldrRUoMszVq0m00)

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

![Class Diagram](https://www.plantuml.com/plantuml/svg/RL4x3i8m3DrxYeumS0N4Pq9YG0WE45eh1ALnP3iWXBWxRXe-bTZyRB-FamMB8KcThnflcEjbsxdWMCW8KlsewZenqARLeZF1M3WgvCcqnzY2hi5MrrsmkKTmTN3RGqIIt8Zfv1sVzy2Og07jFQjYDMnb3yrWGGxt25d3C0OjD9ea_gWM0qP_7UciFDeTSb5ouk6NMm9aSWfVzA6lzGIBTC_qOBeHsyH8cErwwmiqCb37ppIRpSirVmRlU7z6R-jg0Q7LFtW1)

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

![Sequence Diagram](https://www.plantuml.com/plantuml/svg/NP5DJiCm48NtFiKe-rw01Mg3XTGLg54FCB67n2B-gJqkulOC8K6ObQttlXa_FHyBO-Rg5uM6OuQJzIwe99epBc5Ww5O9D9PvZ9Xj1rZWUcwP7iqx1Gi3vRipj3AdrxEoo3XY8UZqTbijtIlri_RmABlW0LuI1SYKOkO22ITI8eifIyIzqArIOH38kZ3jeFfs1TAzCC_4PlvrH3hy6UUQGpkrFwnTIGj-RYOihl2_Q1SgSRdJHZIvXZfwn-2ZfOpiOW1fKOucs3L92_iueBGabK_4RSQd6DvSzb1NkiqupF5ZCop8Xt4jwYXLoBTz0G00)

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

![Activity Diagram](https://www.plantuml.com/plantuml/svg/XL2x4e903EplAr92uGz80wCMDZY-Fk2489c1kvjBqC6lDueL1LRPoMvsifkps2X3tvalCElpo88zx1xe10vLDKJE33MGJ9lB6305QT51KeJGKMM5l8DhgArWQW3McuWAeVH2pO_E37QC7vVZG2yecEdkUlNxVr3Y4_PEC3fkAIph9_K9sG-nMdh6rTHeL9tglT8SCy54xNfBtPoPWiBMSdlpDjQP5kU3oVL0Mtm3)

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

![Use Case Diagram](https://www.plantuml.com/plantuml/svg/RP9FJyCm3CNl-HJMxZlG_JcYJMNSc2Ogk9l4RIsbYPIuGnFYkvD1LhLqnsV__6I_P1S5W_ITLPPg0V4Gk6a530VImjufrE83bEWC6nJA-fLqw5aePBqt7JkE4Z2fNAikKQXJwkg4hh44Ywh5G0PE5gNseOEAmfarnGLyAO0-aiQOiEHEV2OuUk6QDLuNIGn6U2iVnk0xqoSyOMm_F0QJYM96x1tQYx2-UQp6n0iwR0XAxuISP68z9Yfo1WuTiitTpQIRRYLuPait-wtwLcf839RBnz-zXyo6oYIreVf_ifXD5dSdvzpgBhTMVo-JvMOgjsgNpaq_uWS0)

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

![ERD](https://www.plantuml.com/plantuml/svg/fLF1Se8m5Bpp5JbtXX_W95LiCxL00TiPBqwGLynCI6WIx53ntnkjj80u7dh9OVEok--zpKHf8dLLC0kufhf6ozYBOhIt4Bf3bGA9C-GWfINbkS5isnoS5D05eI2KTG4fMAVWOBNSVf3WEPww2GxyLeCBJT_fXcWg-8YMhikUbk5XFQ00fKZUWwYAW1ofKc6C4DvnC7Nz6PwvYRUEl7ZvxBKk9AYgW15zHbBezIOapIadR4uP30T1bIitMxg3SN7i9rxanuyuR6Kfro2vsj9ohFLXgsPLkb9ZW_rZNhzYxwsbtr7u724-mY2VeExUdC3CrGRZLP62xD3VBuA7THZ4IKjS2gN_vzWDmyKW2QGisVKWNATwMUBLwdUJ7nNzkctDlFu9UjFOjjWFakcOF6p0x57rgoxJuw2gP89aokekzrn-iPKJhv2ckZFHWx3jfZd_EmUHIc-5X6oTrbPlI5UScdxo7AIosZ7Sgfi0pyn__mO0)

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

![Class Diagram](https://www.plantuml.com/plantuml/svg/RP7DJa8n48NtVOgxr0MlO22YEucHuFxGZZ1XRakcSp76-EuELp1LM9xJCz_yT5eDQaCl8GfgxHR5-8qZZ4jUaXuuKlSPkYugmQXzlRbrkuVkPlM5a4PPAQU77Yokli89ESkG3-DOMvufukwLwNsiYv0uY3Tu8bDFZkQ6CgbxSzJjka1J2rrQKMoeHPxpgxqKf9NAYMAFB7IM1mWd3nszbdTVib6sovMVIxMnSZ-iXUlsL_V8Fi0SXX_EjSjD9dSNwuT_enypVxk7gP_Hl-GR)

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

![Sequence Diagram](https://www.plantuml.com/plantuml/svg/TP5DZi8m38NtEONLFHTWWH0g8yrc5XGEu6aDOobrAzkjrDjFI8j45gpyypxdFIb7SrIV-XZ6LBdb4SMXQXPpwk4yatW5Q6jNCZ-3yvrRT1u46jAPMyfi5fOIFlV8iQ3o9dJe-8j6KDLRbyNwL9xVZ1I-nKdlkDq_Lo7aNB0xRAQmXwlouv5eUOiNDZLnzIanZGzAduWrQe98Eg0yO2Jri0gxTxEQ8i-a2oZPE8XHo4bVFb_axHzCeeHTOMSXwS-NChw72_caKY0GsJmSKuZqE_y0)

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
