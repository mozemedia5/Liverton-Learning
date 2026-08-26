# Liverton Learning Requirements Analysis

## Scope extracted from `pasted_content.txt`

### Liv Teams workspace

1. Fix the Liv Teams hero/header composition where the team logo overlaps the team name incorrectly. The logo and team identity should be visually aligned without covering the name.
2. Make the pre-made team folders collapsible so they do not permanently consume vertical space.
3. Allow an authorized user to request or create an additional folder. A team owner or team administrator must approve the folder before it becomes available to the team.
4. Keep Hanna’s Liv Teams chat history persistent. Messages must not disappear when the user leaves or reopens the team view.
5. Use the existing application Hanna icon consistently inside Liv Teams; do not introduce a different logo.
6. Allow Hanna in Liv Teams to receive files and answer requests that reference a specific team folder and file. The implementation must enforce the user’s access to that team/folder/file before allowing review.
7. Hanna should be invokable from the Liv Teams chat rather than permanently occupying the interface. Invocation should provide the relevant conversation context and answer the user’s request.

### Discover Teams

8. Reduce the space used by team cards. The compact card should primarily show the team logo, team name, and member count. Any additional fields must not make the card unnecessarily tall.
9. Remove the visible frontend maximum-member control from the team creation/joining interface.
10. Preserve a backend safety limit of 1,000 members per team. The limit must be enforced server-side or in trusted Firestore rules, not only by hiding the field in the UI.

### Hanna prompts and interface

11. Remove the AI-credit and context-credit visual containers from Hanna where they are currently shown.
12. Move useful Hanna suggestions into a prompt store where users can browse and reuse prompts.
13. Preserve existing chat, upload, authorization, and rate-limit behavior while making these UI changes.

### Platform-wide creation capabilities

14. Hanna should support slide/presentation creation with images across the platform.
15. Hanna should support multimodal capabilities such as web research, image generation, slide generation, and learning/study workflows.
16. Model selection must use the project’s approved Gemini/API integration and server-side allow lists. Client input must not be allowed to select arbitrary model names or bypass authorization.
17. Nano Banana / image-generation model availability must be verified against the actual Gemini/API account and deployment environment before implementation. It must not be claimed as available without confirmation.
18. Image-based slide generation, if enabled, must respect the platform’s subscription and generation limits and must have a safe fallback when the model or connector is unavailable.

## Explicit non-negotiable constraints

- Do not guess or hallucinate functionality.
- Do not weaken access control for team files, folders, chats, or Hanna operations.
- Do not expose arbitrary model selection, API keys, internal prompts, or private team content.
- Do not remove the backend team-size protection merely because the frontend field is hidden.
- Do not remove admin-only notification creation; that requirement was established in the preceding work and remains part of the active scope.

## Items requiring implementation audit before coding

- Which component currently renders the Liv Teams hero identity block and its logo/name overlap.
- Whether team folders already exist as Firestore records, local UI sections, or both.
- Whether the current Liv Teams chat uses persistent `hanna_chats`/`hanna_messages` records or a component-local state.
- How team membership, owner/admin roles, folder ownership, and file permissions are represented.
- Whether a prompt-store data model and UI already exist.
- Where the current team member limit is enforced and whether a trusted write path exists.
- Which server operations and Gemini model aliases are currently allow-listed.
- Whether the current subscription account is entitled to image generation or image-based slide generation.

## Safe default decisions for implementation

- Build on existing authenticated Firestore and Cloudinary services rather than creating a parallel storage path.
- Use a request-and-approval workflow for new folders, matching existing Liv Teams/LivMart moderation patterns.
- Keep Hanna chat history keyed by authenticated user and team ID, with Firestore persistence and server-side authorization.
- Use the existing `AskHannaIcon` component for Hanna branding.
- Treat model capabilities as server-controlled feature flags with clear unavailable-state messaging.
- Validate all changes with typechecks, tests, production build, lint, dependency audit, and Firestore rule/index review before pushing.

## Initial repository audit findings

The current codebase already contains persistent Hanna chat infrastructure in `src/services/chatService.ts` and the shared `AskHannaIcon` component. A separate prompt-store feature was not found by the initial source-file search; this is likely missing functionality rather than an existing feature to reuse.

The previous banner work has already reduced `BannerCarousel` usage to Liv Teams. The current implementation still needs a direct audit of Liv Teams folder data, team chat mounting, membership-limit enforcement, and discovery-card markup before those requirements can be safely changed.

The attached request’s wording around model names is not sufficient evidence that Nano Banana is enabled. Model availability and entitlements must be checked through the configured Gemini/API integration before exposing any model option or promising image-based slide generation.
