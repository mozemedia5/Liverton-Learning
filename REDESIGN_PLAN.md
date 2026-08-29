# Liverton Learning interface redesign

## Visual direction

Use a Linktree-inspired, editorial utility interface: warm off-white canvas, ink-black type, rounded white surfaces, restrained borders, and one Liverton green accent for active state and creation actions. Keep cards airy with soft shadows rather than dense dashboards. Use the reference pattern of a clear page title, compact action buttons, horizontal category pills, stacked cards, and a persistent navigation system.

## Responsive shell

- Desktop (>= 1100px): fixed collapsible left sidebar, 248px expanded / 84px collapsed; main content uses a centered max-width workspace.
- Tablet (768px–1099px): compact rail with icon + tooltip behavior and an inline menu toggle; content remains comfortable at 2-column grids.
- Mobile (< 768px): no fixed side rail; use a fixed bottom navigation with five role-aware destinations, safe-area padding, and a modal More sheet for secondary destinations.
- All navigation items must remain keyboard reachable, expose active state, and close transient menus on route change.

## Role destinations

- Student: Home, Learn, Progress, Teams, More. More includes quizzes, calendar, notifications, Live Fund, Live Mart, profile, and settings.
- Educator: Home, Modules, Create, Students, More. More includes assessments, Liv Teams, analytics, earnings, calendar, Live Fund, Live Mart, profile, and settings.
- Parent: Home, Children, Progress, Messages, More. More includes courses, quizzes, fees, calendar, announcements, Live Fund, Live Mart, profile, and settings.
- Organization: Home, People, Projects, Reports, More. More includes Liv Teams, Live Fund, Live Mart, events, announcements, profile, and settings.

## First role surfaces

- Educator dashboard: module creation CTA, module cards with lessons/outcomes/ratings, student progress, collaboration invitations, and quick actions for lesson, quiz, assignment, short video, and exam creation.
- Student dashboard: continue learning, recommended modules, upcoming assessments, progress ring, and review/rating affordance on module listings.
- Parent dashboard: monitored learners, recent progress, upcoming work, and educator updates.
- Organization dashboard: people, active projects, project completion, marketplace pipeline, and team collaboration.

## Interaction rules

Buttons and cards should provide immediate visual feedback. Placeholder destinations must show a toast rather than dead-end. On mobile, primary creation actions should be reachable from the center bottom action. On desktop, sidebar collapse state should preserve a wide content area without clipping.
