# Hanna Automation Roadmap

## Purpose

This roadmap translates the requested Hanna workflows into safe Liverton Learning capabilities. Hanna should be autonomous in preparation, analysis, recommendations, and draft creation, while actions that publish, send, assign, spend, or modify shared records require explicit confirmation and role authorization.

## Implemented foundation

Hanna has consent-aware access to authorized profile, modules and progress, document library, Liv Teams, projects, LivFund, LivMart, and conversation metadata when the user enables the corresponding settings scopes. The server context loader remains non-blocking when an optional source is unavailable. Hanna’s system prompt requires structured Markdown tables with a header row, consistent columns, concise cells, and a short definition or interpretation. It also requires evidence separation, missing-data disclosure, and confirmation before irreversible actions.

The chat interface now has role-specific suggestion cards, compact image/video/audio attachment rendering, intentional image search, attributed source cards, image preview, download/export controls, and research progress states.

## Workflow catalog

| Workflow | Preparation behavior | Confirmation boundary | Authorized executor |
|---|---|---|---|
| Teacher module builder | Collect title, subject, level, description, objectives, outcomes, materials, quiz requirements, and visibility. Draft lesson/module content and identify missing files. | Confirm before creating the course, uploading materials, creating quizzes, or changing status. Default to `draft` or `ready_for_review`, never `active`. | Teacher who owns the course, or an authorized school/platform administrator. |
| Module update | Inspect the authorized module and propose exact field/material changes. | Confirm before writing any update or removing material. | Course owner or authorized administrator. |
| Student library study assistant | Read authorized PDF/document content, extract notes, cite page/section evidence, summarize, generate flashcards and questions. | Analysis can run after consent; sharing or saving artifacts requires confirmation. | Student for personal artifacts; document owner for shared content changes. |
| Progress coach | Compare authorized modules, lessons, quiz attempts, and progress. Identify gaps and recommend a short study plan. | Recommendations do not need confirmation; enrollment, grading, or record changes do. | Student, parent for linked learner context, or educator within permission. |
| Team project planner | Read authorized Team context, propose project scope, milestones, owners, task list, dependencies, and deadlines. | Confirm before creating project/tasks or sending assignments. | Team owner/admin according to existing Team governance. |
| Project task assistant | Track task state, prepare updates, summarize blockers, and draft status reports. | Confirm before changing lifecycle state, assigning members, or marking complete. | Authorized Team manager or assigned member within policy. |
| Chat reply assistant | Read the authorized conversation, summarize what the other participant asked, and draft a reply. | Always confirm immediately before sending on the user’s behalf. | Authenticated participant; never impersonate another user. |
| Document/PDF generator | Convert approved lesson, notes, report, or plan into a polished document/PDF preview. | Confirm before saving to the Document Library or sharing externally. | Authenticated user’s own library; shared destinations require permission. |
| Visual learning assistant | Search images only when explicitly requested; generate an image prompt or educational visual draft. Preserve attribution for web images. | Confirm before public posting, marketplace submission, or external sharing. | Authenticated user; team publishing requires team authorization. |

## Recommended next automations

### 1. Hanna workflow planner and preview

Add a typed workflow planner that converts a request into `intent`, `requiredInputs`, `authorizedScopes`, `plannedSteps`, `riskLevel`, `preview`, and `confirmationRequired`. This lets Hanna ask only the missing questions and present a reviewable plan before execution.

### 2. Server-side action gateway

Create a single authenticated action endpoint with an allowlist of actions such as `create_course_draft`, `upload_course_material`, `create_quiz_draft`, `create_team_project`, `create_team_task`, `save_document`, and `send_chat_reply`. Each action should verify the current user, target ownership or Team role, a short-lived confirmation token, and an idempotency key. Every mutation should write an audit event.

### 3. Draft artifact pipeline

Add PDF and DOCX generation as server-side jobs. Store the result in the user’s Document Library only after confirmation, attach provenance metadata, and return a downloadable URL. The UI should show `preview`, `generating`, `saved`, and `failed` states rather than claiming success early.

### 4. Course-builder wizard

Add a Hanna-generated draft editor that shows module metadata, outcomes, lesson sequence, attached materials, quiz questions, rubric, and readiness checks. Teachers should be able to edit the preview and choose `Save draft`, `Submit for review`, or `Publish` as separate actions.

### 5. Progress and intervention automations

Add scheduled or event-triggered reminders only after opt-in. Examples include a weekly student progress digest, missing-assignment reminder, teacher class-risk summary, and parent-friendly progress explanation. Avoid diagnosing learners; report observed evidence and recommendations separately.

### 6. Team work automations

Add Team-scoped Hanna commands for project planning, meeting summaries, task extraction, blocker detection, milestone reminders, and draft status updates. Require Team-owner/admin approval for assignments, external sharing, financial actions, and marketplace submissions.

### 7. Document intelligence pipeline

Index authorized PDF/DOCX text with page and section coordinates. Use retrieval for grounded summaries, compare two documents, extract action items, and cite exact pages. Keep document access scope separate from conversation-history scope.

### 8. Reliability and observability

Add provider telemetry, workflow IDs, audit logs, retries with backoff, dead-letter states, quota-aware fallback, and user-visible activity history. Never silently retry a mutation that could create duplicates; use idempotency keys.

## Non-negotiable safety rules

Hanna must not bypass Firestore rules, access another user’s private chats, publish a course, assign a Team task, send a message, spend funds, submit to LivMart, or share externally without the required permission and confirmation. A user’s personalization settings grant context access only; they do not grant authority to perform irreversible actions.

When evidence or permissions are missing, Hanna should say what is unavailable and offer a draft or analysis instead. Every completed action should return the affected record ID, timestamp, result state, and an undo or next-step option where possible.

## Suggested implementation order

1. Typed workflow planner and confirmation preview.
2. Server-side action gateway with authorization, idempotency, and audit logs.
3. Teacher module draft workflow using existing course and material services.
4. Student document-analysis and PDF/DOCX artifact pipeline.
5. Team project/task workflows using existing Team project services.
6. Chat reply draft-and-confirm workflow.
7. Opt-in notifications, scheduled digests, and proactive recommendations.
8. Image-generation and LivMart publishing workflows with explicit approval.
