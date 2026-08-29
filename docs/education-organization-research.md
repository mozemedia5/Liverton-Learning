# Education Organization Research Notes

## Source 1: UNESCO Recommendation on Open Educational Resources
URL: https://www.unesco.org/en/legal-affairs/recommendation-open-educational-resources-oer

The search result for UNESCO's OER Recommendation explicitly identifies stakeholders across formal, non-formal, and informal education, including educational providers and institutions and other education-sector actors. The page was opened in the browser, but its extracted content was limited to the site shell; the UNESCO source remains a primary reference for the taxonomy and should be cited in the final documentation.

## Initial taxonomy direction
Liverton should define an **organization** as any structured entity that creates, delivers, governs, supports, funds, evaluates, supplies, or enables learning—not only a school. The product-facing categories should include learning providers, education authorities, content and publishing organizations, assessment and credentialing bodies, education technology providers, research and professional organizations, nonprofit/community organizations, funders and development partners, and education suppliers/service providers.

## Implementation constraint
Keep existing internal role keys and routes such as `teacher` and `school_admin` for backward compatibility unless a migration is explicitly designed. Update user-facing labels to **educator** and **organization**, and support organization types as profile metadata rather than silently breaking existing Firestore collections.

## Source 2: ERIC education-ecosystem paper
URL: https://files.eric.ed.gov/fulltext/ED622220.pdf

The paper's search metadata identifies textbook publishers, instructional program vendors, media organizations, and consulting companies as organizations participating in education ecosystems. This supports treating content makers, distributors, service firms, and intermediaries as first-class organization types.

## Source 3: UNESCO / Global Schools Forum report on regulating non-state actors
URL: https://www.globalschoolsforum.org/wp-content/uploads/unesco-gsf_regulating_nsas_in_education_002-1.pdf

This source was opened as a PDF and reinforces the importance of recognizing non-state actors in education rather than limiting the model to schools and government institutions. It supports including nonprofit/community providers, private providers, suppliers, technology companies, publishers, and other organizations that influence access, quality, governance, and learning outcomes.

## Proposed organization categories for Liverton
1. Learning institutions and providers: early-childhood centers, primary and secondary schools, colleges, universities, vocational and technical institutes, adult-learning centers, tutoring/coaching centers, language schools, music/arts/sports academies, and online learning providers.
2. Education authorities and governance: ministries/departments, local education authorities, examination councils, accreditation and quality-assurance bodies, curriculum authorities, and school networks or governing bodies.
3. Content and knowledge organizations: textbook publishers, academic publishers, curriculum developers, open-education-resource producers, libraries, archives, media organizations, and educational content studios.
4. Assessment and credentialing: testing bodies, certification providers, professional associations, examination centers, credential evaluators, and skills-verification organizations.
5. Education technology and infrastructure: learning-platform providers, student-information-system providers, classroom technology vendors, digital-content platforms, connectivity providers, device makers, and education data/analytics companies.
6. Research and professional learning: research institutes, think tanks, teacher-training organizations, educator associations, academic societies, and education consultants.
7. Nonprofit, community, and access organizations: NGOs, charities, community learning centers, refugee and out-of-school learning programs, disability-support organizations, youth organizations, and parent/family organizations.
8. Suppliers and operational service providers: book distributors, stationery and laboratory suppliers, school-equipment manufacturers, transport, food, safety, facilities, and other service providers that support education delivery.
9. Funders and development partners: foundations, donors, impact investors, government-funded programs, development agencies, and corporate social-responsibility education programs.

These categories should be presented in plain language on the landing page and organization onboarding flow. Internally, the legacy `school_admin` role can remain as a compatibility alias while the public role label becomes **Organization**.

## Local smoke-test finding
The local Vite app initialized Firebase and rendered the landing page DOM successfully. The browser screenshot appeared blank during the first load, but console DOM inspection confirmed the landing page content, including the new “Organizations in education” section, was present. The only console warning observed was an existing service-worker dynamic-import fetch warning during development; the app subsequently registered the service worker successfully.

## Browser verification
The local `/get-started` route rendered Student, Educator, Organization, and Parent cards. The `/register?role=school_admin` route rendered the new organization description and required organization-type input with examples including school, publisher, nonprofit, and EdTech provider.

## Source 4: East African Community education overview

URL: https://www.eac.int/education

The EAC describes regional education work involving harmonized curricula, examination, certification, and accreditation institutions, as well as scientific and technological research and centres of excellence. It also explicitly covers teacher, adult, vocational, and technical education across partner states. This supports adding regional authorities, qualification and accreditation bodies, research centres, adult-learning providers, and TVET institutions to Liverton’s organization model.
