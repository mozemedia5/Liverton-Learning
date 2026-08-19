# Liverton Learning Platform Guide

## Purpose

Liverton Learning is a connected ecosystem for learners, educators, parents, organizations, teams, projects, funding, marketplace activity, and Hanna AI. The product should feel like one shared identity and one coherent workspace rather than a collection of disconnected tools.

## Role experiences

### Students and learners

Learners discover modules, lessons, resources, live lessons, assignments, quizzes, examinations, study documents, teams, projects, and achievements. Their workspace should show progress, upcoming deadlines, attendance, participation, feedback, certificates, and useful next steps. Learners can use Hanna to understand a concept, summarize a document, plan a study session, improve writing, or break a project into manageable tasks.

### Educators

Educators create modules as drafts, add lessons and resources, schedule live lessons, invite co-educators, create assignments and assessments, review learner progress, publish announcements, manage project work, and use Hanna to prepare lessons, refine explanations, generate planning structures, summarize documents, and draft updates for Liv Teams.

### Parents

Parents connect to learners, review progress and attendance, understand upcoming work, see feedback and achievements, receive relevant notifications, and support learning without accessing private information they are not authorized to view. Parent workflows should be clear, calm, mobile-friendly, and focused on meaningful progress rather than noisy activity.

### Organizations

Organizations may represent schools, universities, training centers, NGOs, companies, research institutions, communities, or government institutions. Organization administrators manage members, educators, teams, programs, modules, projects, events, authorized financial data, settings, and permissions. Members may hold different contextual roles in different organizations.

## Product areas

### Liverton Learning

Modules are complete structured learning experiences containing educators, learners, lessons, resources, live sessions, assignments, quizzes, examinations, progress, attendance, participation, analytics, recognition, and certificates.

### Liv Teams

Liv Teams provides collaboration around chat, calendars, project tasks, milestones, resources, polls, live sessions, updates, role assignment, and team activity. It is connected to projects and learning modules through the same Liverton identity.

### LivFund

LivFund helps eligible learning and community projects explain their purpose, budget, evidence, milestones, impact, and funding needs. Contributions and funding records must be authoritative, auditable, and protected by server-side authorization.

### LivMart

LivMart is the marketplace for educational resources, completed project outputs, creator materials, school essentials, lesson packs, and other useful learning products. Listings, orders, prices, seller permissions, and financial records should be persistent and authoritative.

### Hanna AI

Hanna is a cross-platform AI partner for study, writing, document understanding, lesson planning, project management, team updates, meeting summaries, task breakdowns, and Liv Teams collaboration. Hanna is not limited to a study-buddy role.

## Shared architecture

The platform is organized around shared entities: User, Profile, Organization, OrganizationMembership, Team, TeamMembership, Role, Permission, Module, ModuleEducator, ModuleEnrollment, Lesson, LiveLesson, LessonResource, Assignment, AssignmentSubmission, Quiz, Examination, ExaminationAttempt, AttendanceRecord, ParticipationRecord, ModuleProgress, ModulePerformance, Award, Certificate, Achievement, Project, ProjectMember, ProjectTask, ProjectMilestone, ProjectUpdate, ProjectEvidence, ProjectBudget, LivFundCampaign, FundingContribution, LivMartListing, MarketplaceOrder, Wallet, TeamTreasury, AIWallet, AIUsageRecord, Notification, ActivityEvent, Conversation, Message, MediaAsset, and AuditLog.

Authentication identifies the account while the profile represents the person’s educational and professional identity. Permissions are contextual. A user can be an educator in one organization, a project manager in one project, a learner in a module, and a viewer in a different team. Protected operations must be authorized on the backend, not only hidden in the browser.

Financial actions, role changes, marketplace operations, funding contributions, AI usage, examination results, and sensitive educational records require secure server-side handling. Related database changes should use atomic transactions or equivalent safeguards. Audit logs should record actor, action, resource, time, and relevant context, while activity events and notifications should provide appropriately filtered user-facing updates.

## Experience principles

The interface uses rounded, card-based surfaces inspired by premium creator and profile tools, but keeps Liverton’s learning purpose central. The landing page uses strong typography, dynamic copy, floating encouragement cards, inclusive photography, clear role paths, and direct calls to action. Responsive image containers use `object-fit: cover` for editorial photos and `object-fit: contain` for the supplied icon so the mark is not cropped on Android, iOS, desktop, favicon, PWA, or social surfaces.
