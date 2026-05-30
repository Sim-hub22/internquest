# Artefact Designs: SRS and Testing Tables

## 9.1 User Authentication and Access Control

The User Authentication and Access Control sub-system focuses on managing secure access to InternQuest. It allows users to register, log in, complete role-based onboarding, and access only the pages and features permitted for their role. This sub-system supports candidates, recruiters, and administrators by ensuring that each user is directed to the correct dashboard and protected from unauthorized access.

### 9.1.1 SRS

| Req. Code | Req. Desc |
|---|---|
| UAAC-F-1.0 | The system shall allow users to register using valid account details. |
| UAAC-F-1.1 | The system shall allow registered users to log in securely. |
| UAAC-F-1.2 | The system shall allow users to complete role-based onboarding. |
| UAAC-F-1.3 | The system shall assign users to candidate, recruiter, or administrator roles. |
| UAAC-F-1.4 | The system shall redirect users to dashboards based on their roles. |
| UAAC-F-1.5 | The system shall protect restricted routes from unauthorized users. |
| UAAC-F-1.6 | The system shall prevent suspended users from accessing protected features. |
| UAAC-NF-1.0 | Authentication responses shall be handled securely. |
| UAAC-NF-1.1 | Role-based access checks shall be performed consistently. |
| UAAC-NF-1.2 | The login and onboarding process shall be simple and responsive across devices. |

### 9.1.3 Test Cases

Test Objectives

- Ensure users can register and log in successfully.
- Verify role-based onboarding and dashboard redirection.
- Validate protected route and suspended account restrictions.

| Test Case ID | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|
| UAAC-TC-1 | User registration | Enter valid registration details | Account created successfully |
| UAAC-TC-2 | User login | Enter valid login credentials | User logged in successfully |
| UAAC-TC-3 | Role-based onboarding | Select user role and complete onboarding | User role saved successfully |
| UAAC-TC-4 | Dashboard redirection | Log in as candidate/recruiter/admin | Correct dashboard displayed |
| UAAC-TC-5 | Route protection | Access protected route without login | User redirected to login page |
| UAAC-TC-6 | Suspended account access | Log in using suspended account | Access restricted with suspension message |

## 9.2 Candidate Management Module

The Candidate Management Module focuses on enabling students to explore, apply for, and track internship opportunities. Candidates can build their profiles, upload resumes, search and filter opportunities, bookmark listings, submit applications, track application status, take assigned quizzes, and access learning resources. This module provides students with a structured way to manage their internship journey.

### 9.2.1 SRS

| Req. Code | Req. Desc |
|---|---|
| CMM-F-2.0 | The system shall allow candidates to build and update their profiles. |
| CMM-F-2.1 | The system shall allow candidates to search internship opportunities. |
| CMM-F-2.2 | The system shall allow candidates to filter opportunities by category and location type. |
| CMM-F-2.3 | The system shall allow candidates to bookmark internship listings. |
| CMM-F-2.4 | The system shall allow candidates to upload and manage resumes. |
| CMM-F-2.5 | The system shall allow candidates to submit internship applications. |
| CMM-F-2.6 | The system shall allow candidates to track application status. |
| CMM-F-2.7 | The system shall display assigned quizzes for selected candidates. |
| CMM-F-2.8 | The system shall allow candidates to access learning resources and sample quizzes. |
| CMM-NF-2.0 | Resume uploads shall be limited to supported file formats. |
| CMM-NF-2.1 | The candidate dashboard shall provide responsive performance across devices. |
| CMM-NF-2.2 | The system shall prevent duplicate applications for the same internship. |

### 9.2.3 Test Cases

Test Objectives

- Ensure candidates can search, apply, and track internships.
- Verify resume upload, bookmarking, and profile management.
- Validate quiz access and learning resource functionality.

| Test Case ID | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|
| CMM-TC-1 | Build candidate profile | Enter education, skills, experience, and preferences | Profile saved successfully |
| CMM-TC-2 | Search internship | Enter keyword or category | Relevant internships displayed |
| CMM-TC-3 | Bookmark internship | Click bookmark on internship listing | Internship added to bookmarks |
| CMM-TC-4 | Upload resume | Upload supported resume file | Resume uploaded successfully |
| CMM-TC-5 | Apply for internship | Submit application with resume and details | Application submitted successfully |
| CMM-TC-6 | Track application | Open application history | Correct application status displayed |
| CMM-TC-7 | Attempt assigned quiz | Start assigned quiz | Quiz opens and accepts answers |
| CMM-TC-8 | Access resource | Open learning resource page | Resource content displayed successfully |

## 9.3 Recruiter Management Module

The Recruiter Management Module allows recruiters to manage internship opportunities and evaluate applicants. Recruiters can create and manage internship listings, review candidate applications, update application statuses, create and assign quizzes, evaluate quiz results, and view recruitment analytics. This sub-system supports efficient candidate screening and internship management.

### 9.3.1 SRS

| Req. Code | Req. Desc |
|---|---|
| RMM-F-3.0 | The system shall allow recruiters to create internship listings. |
| RMM-F-3.1 | The system shall allow recruiters to edit and manage their own listings. |
| RMM-F-3.2 | The system shall allow recruiters to open or close internship listings. |
| RMM-F-3.3 | The system shall allow recruiters to view applications for their listings. |
| RMM-F-3.4 | The system shall allow recruiters to review candidate resumes and details. |
| RMM-F-3.5 | The system shall allow recruiters to update application statuses. |
| RMM-F-3.6 | The system shall allow recruiters to create and publish quizzes. |
| RMM-F-3.7 | The system shall allow recruiters to assign quizzes to applicants. |
| RMM-F-3.8 | The system shall allow recruiters to evaluate quiz results. |
| RMM-F-3.9 | The system shall display recruitment analytics to recruiters. |
| RMM-NF-3.0 | Recruiters shall only manage listings created by themselves. |
| RMM-NF-3.1 | Application review pages shall load efficiently. |
| RMM-NF-3.2 | Recruitment analytics shall be accurate and understandable. |

### 9.3.3 Test Cases

Test Objectives

- Ensure recruiters can create and manage internship listings.
- Verify application review and status update functionality.
- Validate quiz assignment, result evaluation, and analytics.

| Test Case ID | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|
| RMM-TC-1 | Create internship | Enter internship details and submit | Internship listing created successfully |
| RMM-TC-2 | Edit internship | Modify existing listing details | Updated details saved successfully |
| RMM-TC-3 | Review application | Open applicant details page | Candidate details and resume displayed |
| RMM-TC-4 | Update status | Change application status | New status saved and shown to candidate |
| RMM-TC-5 | Create quiz | Add quiz title, questions, and settings | Quiz created successfully |
| RMM-TC-6 | Assign quiz | Assign quiz to an applicant | Quiz assigned successfully |
| RMM-TC-7 | Evaluate quiz result | Open submitted quiz attempt | Score and answers displayed |
| RMM-TC-8 | View analytics | Open recruiter analytics dashboard | Recruitment metrics displayed correctly |

## 9.4 Administrative Management Module

The Administrative Management Module focuses on maintaining the quality, safety, and reliability of InternQuest. Administrators can manage users, suspend accounts, moderate internship listings, approve or reject categories, publish blog and resource content, create sample quizzes, and review reports. This module ensures that platform activities remain controlled and trustworthy.

### 9.4.1 SRS

| Req. Code | Req. Desc |
|---|---|
| AMM-F-4.0 | The system shall allow administrators to view and manage users. |
| AMM-F-4.1 | The system shall allow administrators to suspend user accounts. |
| AMM-F-4.2 | The system shall allow administrators to unsuspend user accounts. |
| AMM-F-4.3 | The system shall allow administrators to moderate internship listings. |
| AMM-F-4.4 | The system shall allow administrators to approve or reject internship categories. |
| AMM-F-4.5 | The system shall allow administrators to create and publish blog/resource posts. |
| AMM-F-4.6 | The system shall allow administrators to create sample quizzes. |
| AMM-F-4.7 | The system shall allow administrators to review submitted reports. |
| AMM-F-4.8 | The system shall allow administrators to take moderation actions on reported content. |
| AMM-NF-4.0 | Administrative features shall be accessible only to admin users. |
| AMM-NF-4.1 | Admin actions shall be stored reliably and reflected immediately. |
| AMM-NF-4.2 | Moderation pages shall be clear and easy to operate. |

### 9.4.3 Test Cases

Test Objectives

- Ensure administrators can manage users and content.
- Verify moderation of internships, categories, and reports.
- Validate admin-only access control.

| Test Case ID | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|
| AMM-TC-1 | View users | Open admin users page | List of users displayed |
| AMM-TC-2 | Suspend user | Select user and submit suspension reason | User account suspended successfully |
| AMM-TC-3 | Unsuspend user | Select suspended user and remove suspension | User account restored successfully |
| AMM-TC-4 | Moderate internship | Close inappropriate internship listing | Listing closed successfully |
| AMM-TC-5 | Review category | Approve or reject requested category | Category status updated |
| AMM-TC-6 | Publish resource | Create and publish blog/resource post | Resource available to users |
| AMM-TC-7 | Review report | Open report and submit decision | Report status updated successfully |
| AMM-TC-8 | Admin route access | Access admin page as non-admin user | Access denied or redirected |

## 9.5 Shared Platform Services

The Shared Platform Services sub-system provides common services used across InternQuest. It includes in-app notifications, email notifications, dashboard views, reporting and analytics, file storage, and content/data management. These services support communication, monitoring, and data handling for candidates, recruiters, and administrators.

### 9.5.1 SRS

| Req. Code | Req. Desc |
|---|---|
| SPS-F-5.0 | The system shall generate in-app notifications for important user events. |
| SPS-F-5.1 | The system shall send email notifications for application, quiz, resource, and internship updates. |
| SPS-F-5.2 | The system shall display dashboard summaries based on user role. |
| SPS-F-5.3 | The system shall track internship views and application activity. |
| SPS-F-5.4 | The system shall generate recruitment and platform analytics. |
| SPS-F-5.5 | The system shall support secure file upload and retrieval. |
| SPS-F-5.6 | The system shall manage shared content and data across modules. |
| SPS-NF-5.0 | Notifications shall be delivered reliably. |
| SPS-NF-5.1 | Uploaded files shall be securely stored and accessed. |
| SPS-NF-5.2 | Dashboard and analytics data shall be updated accurately. |
| SPS-NF-5.3 | Shared services shall support all user roles consistently. |

### 9.5.3 Test Cases

Test Objectives

- Ensure notifications and emails are triggered correctly.
- Verify dashboard, analytics, and file storage functionality.
- Validate shared services across different user roles.

| Test Case ID | Test Scenario | Test Steps | Expected Result |
|---|---|---|---|
| SPS-TC-1 | In-app notification | Trigger application or quiz event | Notification appears for target user |
| SPS-TC-2 | Email notification | Trigger email-supported event | Email notification sent successfully |
| SPS-TC-3 | Dashboard summary | Open dashboard as candidate/recruiter/admin | Correct role-based summary displayed |
| SPS-TC-4 | Track internship view | Open internship detail page | View count updated correctly |
| SPS-TC-5 | View analytics | Open analytics dashboard | Correct metrics displayed |
| SPS-TC-6 | Upload file | Upload supported document or image | File uploaded successfully |
| SPS-TC-7 | Retrieve file | Open uploaded file link | File displayed or downloaded correctly |
| SPS-TC-8 | Shared service access | Use service from different roles | Service works according to role permission |
