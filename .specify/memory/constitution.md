<!--
Sync Impact Report
- Version change: template-unversioned -> 1.0.0
- Modified principles:
	- Template Principle 1 -> I. Gameplay-First Core Loop (NON-NEGOTIABLE)
	- Template Principle 2 -> II. System-Modular Separation (AI and Game)
	- Template Principle 3 -> III. Deterministic Progression and Risk Clarity
	- Template Principle 4 -> IV. AI Companion Runtime Boundaries
	- Template Principle 5 -> V. Localhost-Only Deployment Boundary
- Added sections:
	- Mandatory Design Constraints
	- Delivery Workflow and Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ validated (no change required): .specify/templates/plan-template.md
	- ✅ validated (no change required): .specify/templates/spec-template.md
	- ✅ validated (no change required): .specify/templates/tasks-template.md
	- ✅ no target directory present: .specify/templates/commands/*.md
- Runtime guidance references checked:
	- ✅ validated (no change required): README.md
	- ✅ validated (no change required): docs/game-design/game-functionality.md
	- ✅ validated (no change required): docs/game-design/game-story.md
- Follow-up TODOs:
	- None
-->

# iProj Final Constitution

## Core Principles

### I. Gameplay-First Core Loop (NON-NEGOTIABLE)
The playable game MUST prioritize gameplay systems over narrative systems. The
core loop MUST remain overworld -> dungeon -> reward -> upgrade, and every
mechanic MUST directly support this loop. Turn-based combat is mandatory as the
primary system, while puzzle and QTE content MUST remain secondary.
Rationale: preserving a stable loop ensures repeatable progression and prevents
scope drift into narrative-first design.

### II. System-Modular Separation (AI and Game)
Game and AI development MUST remain separated into game/ and ai/ bounded areas
until each reaches MVP readiness. Integrations between the two MUST be explicit,
versioned, and tested at interface boundaries. Game functionality and companion
behavior MUST conform to rules in docs/game-design/. Rationale: strict
modularity reduces coupling risk and allows independent delivery.

### III. Deterministic Progression and Risk Clarity
Player progression MUST be measurable, consistent, and free from hidden scaling.
Difficulty and risk/reward tradeoffs MUST be communicated clearly, including
companion-rating-driven dungeon scaling. No mechanic may hard-stop progression
without a defined recovery path. Dungeons MUST be replayable with procedural
variation and meaningful rewards. Rationale: transparent progression builds
trust and keeps challenge readable.

### IV. AI Companion Runtime Boundaries
AI-generated companion output MUST be constrained to gameplay-supportive,
state-driven dialogue and systemic flavor content. Generation MUST stay aligned
to defined archetypes and MUST NOT become a required narrative dependency for
core progression. At least one companion MUST satisfy the goth-baddie gameplay
constraint. AI serving MUST run only through an LM Studio hosted server for
localhost use. Rationale: constrained generation preserves design intent while
allowing dynamic variation.

### V. Localhost-Only Deployment Boundary
All runtime targets for both game and AI components MUST remain localhost-only.
No public, cloud, or external hosting deployment is permitted under this
constitution. Rationale: development scope, security posture, and operational
constraints are explicitly local for this project phase.

## Mandatory Design Constraints

- All game mechanics and AI companion behavior MUST align with
	docs/game-design/game-functionality.md and docs/game-design/game-story.md.
- UI interactions MUST stay concise and MUST NOT interrupt gameplay flow.
- Companion systems MUST contribute directly to dungeon access, contracts, or
	reward outcomes.
- Dialogue systems MUST remain functional for mechanics, not required for
	narrative continuity.
- Generated or static content that violates project constraints MUST be revised
	before merge.

## Delivery Workflow and Quality Gates

- Planning artifacts MUST include a Constitution Check before implementation.
- Every feature specification MUST document how requirements satisfy the five
	core principles above.
- Task breakdowns MUST include explicit items for progression integrity,
	repeatable dungeon behavior, and AI companion constraint compliance where
	relevant.
- Cross-module changes touching both ai/ and game/ MUST include integration
	validation notes and rollback strategy.

## Governance

This constitution overrides conflicting local conventions for the project.
Amendments require: (1) a documented proposal, (2) explicit impact assessment
on game and AI modules, and (3) acceptance by project maintainers before merge.

Versioning policy for this constitution follows semantic versioning:
- MAJOR for incompatible governance/principle changes or removals.
- MINOR for new principles/sections or materially expanded mandates.
- PATCH for clarifications, wording fixes, and non-semantic edits.

Compliance review expectations:
- Each planning and review cycle MUST confirm constitutional alignment.
- Non-compliant changes MUST be corrected before merge or carry an explicit,
	approved exception with remediation timeline.
- Exceptions are temporary and MUST include owner and expiration criteria.

**Version**: 1.0.0 | **Ratified**: 2026-04-09 | **Last Amended**: 2026-04-09
