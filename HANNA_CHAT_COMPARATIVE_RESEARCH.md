# Hanna AI Chat: Comparative Product and UI Research

**Prepared for:** Liverton Learning  
**Prepared by:** Manus AI  
**Date:** 24 August 2026

## Executive conclusion

Hanna should combine three complementary interaction models. Google AI Mode contributes conversational web search, query fan-out, multimodal input, persistent follow-ups, source links, and side-by-side source exploration.[1] [2] Manus contributes task-oriented planning, visible progress, parallel research, and finished artifacts rather than only a chat transcript.[3] [4] ChatGPT contributes a polished composer, connected private sources, deep-research reports, inline citations, source metadata, and interactive in-chat outputs.[5] [6]

The recommended Hanna product is therefore a **learning research workspace**, not a generic chatbot. A teacher, student, parent, or organization should be able to ask a question, see Hanna research it, inspect sources, add authorized Liverton context, view images with attribution, generate a study or teaching artifact, and continue with a grounded follow-up.

## Comparative feature matrix

| Product pattern | Best observed capability | Hanna should adopt |
|---|---|---|
| Google AI Mode | Conversational Search with query fan-out and source links | Automatic research planning, source cards, citations, follow-up context, and a source drawer |
| AI Mode in Chrome | Side-by-side browsing with tabs/files/images as context | Split conversation/source workspace and explicit context chips |
| Manus | Multi-step task planning and parallel agents for wide research | Research progress, task stages, source synthesis, and artifact delivery |
| ChatGPT Deep Research | Citation-backed reports, connected sources, progress, and exports | Structured research reports, citation metadata, source filters, and export/share |
| ChatGPT Apps/interactive outputs | Natural language plus interactive interfaces in chat | Lesson-plan builders, quiz generators, charts, calculators, and study aids as in-chat cards |

## 1. Google AI Mode

Google describes AI Mode as a Search experience for complex questions, comparisons, exploration, and follow-ups. It accepts text, voice, images, files, URLs, and—through Chrome—selected tabs. It uses query fan-out, meaning it divides a question into subtopics and searches those subtopics simultaneously. It returns an AI answer with links to supporting web content, and it can show links alone when confidence or helpfulness is insufficient.[1] [2]

The central interface pattern is a persistent composer. The initial state offers suggested prompts. Once a query is submitted, the conversation contains the user turn, a large answer region, an explicit thinking/search state, source links, and a composer that remains available for follow-up. Chrome adds a side-by-side source view: opening a result keeps AI Mode visible and can add the opened tab to later context.[3] [4]

**Hanna adaptation:** show “Planning research,” “Searching,” “Comparing,” and “Ready” states; display claim-linked citations and source cards; preserve the source set for follow-ups; make adding a source explicit; support public URLs and authorized Liverton resources separately.

## 2. Manus AI

Manus publicly presents itself as an action engine that executes tasks and returns completed work. Its Wide Research documentation describes task decomposition, parallel agent deployment, independent processing, and result synthesis into reports, tables, datasets, or other requested formats.[3] Its public report-generation materials emphasize external research, uploaded data, source identification, and citations.[4]

The relevant design lesson is the transition from a conversational request to a **task workspace**. The user should see what Hanna is doing and receive a durable output, not only a final paragraph. For example, a teacher who asks for a CBC unit plan should receive a plan, rubric, resource list, and sources that can be saved or shared.

**Hanna adaptation:** use a research status rail, task checkpoints, parallel sub-query labels, a final artifact card, save/export actions, and a “continue task” follow-up. Keep ordinary questions fast, but make explicit deep research visibly more thorough.

## 3. ChatGPT answering and deep research

OpenAI describes ChatGPT Deep Research as a multi-step agent that finds, analyzes, and synthesizes online sources, including text, images, and PDFs. Public documentation emphasizes fully documented outputs, clear citations, connected sources, real-time progress, interruption/refinement, and source restrictions or approved URLs in newer workflows.[5] [6]

ChatGPT’s strength is the composition of a flexible assistant with a high-quality answer renderer. The composer can expose tools, attachments, research modes, and connected sources. The answer can contain headings, tables, code, images, citations, expandable source details, and generated artifacts. The user can refine the task without losing thread context.

**Hanna adaptation:** make tool and context selection visible; provide “Web research,” “Liverton context,” “Deep research,” and “Create artifact” modes; render Markdown and citations consistently; add image attribution; support saved outputs and role-appropriate sharing.

## 4. Required Hanna feature set

### 4.1 Core conversation

Hanna needs persistent sessions, new conversation, searchable history, rename/delete/pin actions, streaming answers, stop generation, retry, copy, feedback, and follow-up suggestions. The mobile experience should retain a bottom composer, while desktop should provide a spacious research workspace.

### 4.2 Research process

Every eligible prompt should receive a web-check attempt, but the UI should distinguish a simple answer from deep research. The server should classify the request, create focused sub-queries, invoke the provider chain, normalize results, deduplicate links, rank sources, and stream progress events. The interface should never claim that research succeeded when providers failed.

Recommended progress states are:

| State | UI message |
|---|---|
| Planning | “Understanding your question” |
| Fan-out | “Searching 3 focused questions” |
| Retrieval | “Reading official and independent sources” |
| Synthesis | “Comparing evidence” |
| Complete | “Answer ready with 5 sources” |
| Partial | “Answer ready; some web sources were unavailable” |

### 4.3 Source cards and drawer

A source card should contain the title, domain, source category, short supporting snippet, retrieval time, provider, and actions to open, save, remove, or add to the next turn. Inline citation badges should map to the source cards. A side drawer should show the complete research trace, including the original query, sub-queries, provider outcomes, source ranking rationale, and image attribution.

### 4.4 Images

Hanna should support three separate image actions. **Find images** searches attributable public image sources and returns source/license metadata. **Understand an image** lets a user attach an image for analysis. **Create an image** invokes an approved image-generation capability and labels generated media clearly. Image cards should include alt text, source/creator/license where applicable, and actions to open or use the image in a lesson artifact.

### 4.5 Connected learning context

The user should be able to add current lesson, course, quiz, document, assignment, or school resources as context. Private Liverton context must be permission-checked and clearly marked. Public web research should not receive private learner records by default.

### 4.6 Artifacts

Hanna’s answer should be able to become a lesson plan, assessment rubric, quiz, flashcards, revision schedule, project brief, comparison table, learning summary, or organization report. Artifacts should be editable, saveable, exportable, and linked to their source set.

## 5. Recommended desktop layout

```text
+--------------------------------------------------------------------------------+
| Liverton | Hanna AI | Thread title | Research status | New chat | Settings     |
+----------------------+-------------------------------------------+-------------+
| Conversation history | Conversation canvas                        |             |
|                      | User prompt                                | Source      |
| New conversation     | Research progress                          | drawer      |
| Pinned threads       | Hanna answer + citation badges              |             |
| Recent research      | Suggested follow-ups                        | Source card |
|                      | Persistent composer                         | Source card |
+----------------------+-------------------------------------------+-------------+
```

The default state should keep the source drawer collapsed enough to preserve conversation width. Opening a source or selecting a citation expands the drawer. On smaller desktop widths, the drawer becomes an overlay sheet. On mobile, the drawer becomes a bottom sheet with a clear close button and focus management.

## 6. Recommended navigation

Hanna belongs in the primary desktop sidebar because it is a platform capability, not merely a miscellaneous tool. It should also appear in the mobile More sheet as a visually prioritized card near the top, with the Sparkles icon, a short explanation, and the route `/features/hanna-ai`. The More hub should retain Hanna as a featured destination and its CTA should open the same page.

## 7. Source and privacy rules

Source quality should be visible. Official NCDC, UNEB, MoES, UVTAB, and NCHE documents should be labeled as official or primary where verified. News should display outlet and date. Social posts should be labeled as public commentary and should not be presented as verified policy. Conflicting evidence should be shown as a disagreement instead of silently resolved.

Hanna must maintain a strict separation between public web context and private Liverton context. Private documents, grades, messages, and learner records should enter model context only after authorization. External webpages are data, not instructions. The system must not follow prompt-injection instructions found in pages, PDFs, images, or snippets.

## 8. Phased implementation for Liverton

| Phase | Deliverable |
|---|---|
| 1 | Replace the standalone Hanna page with a polished research workspace and persistent composer. |
| 2 | Add a collapsible source drawer and source cards using normalized research data. |
| 3 | Add streamed research progress and provider status. |
| 4 | Add image search/generation cards with attribution and alt text. |
| 5 | Add artifact creation, editing, export, and source-set persistence. |
| 6 | Add role-specific layouts and tests for teacher, student, parent, and organization workflows. |

## References

[1]: https://support.google.com/websearch/answer/16011537?hl=en "Google Search Help — Get AI-powered responses with AI Mode in Google Search"
[2]: https://developers.google.com/search/docs/appearance/ai-features "Google Search Central — AI features and your website"
[3]: https://manus.im/docs/features/wide-research "Manus Documentation — Wide Research"
[4]: https://manus.im/playbook/report-generator "Manus — AI Report Generator"
[5]: https://openai.com/index/introducing-deep-research/ "OpenAI — Introducing deep research"
[6]: https://developers.openai.com/api/docs/guides/deep-research "OpenAI Developers — Deep research API guide"
