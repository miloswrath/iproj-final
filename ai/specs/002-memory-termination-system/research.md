# Research: NPC Memory and Conversation Termination System

**Feature**: 002-memory-termination-system
**Date**: 2026-04-16

---

## Decision 1: Quest Acceptance Detection Strategy

**Decision**: Hybrid dual-gate approach — rule-based triggers as primary, LLM classifier as secondary fallback.

**Rationale**: Rule-based matching alone misses paraphrased intent; LLM classification alone risks false positives. The dual gate (accept if rule fires OR model confidence > 75%) maximizes recall on genuine acceptance while preventing accidental termination on ambiguous phrasing.

**Rule triggers (primary)**: Explicit affirmations ("yes", "okay", "fine", "i'll do it", "count me in", "let's go") and execution-oriented follow-ups ("where do I go?", "what do I need?", "how do I help?"). These are normalized to lowercase before matching.

**LLM classification prompt structure**:
```
Classify the player's intent.
Player's last message: "{{ lastPlayerMessage }}"
Context: NPC just offered this quest: "{{ questSummary }}"
Respond ONLY with JSON: {"intent": "accept" | "reject" | "uncertain", "confidence": 0-100}
```
Accept if `intent === "accept"` AND `confidence > 75`.

**Alternatives considered**:
- Rule-only: Rejected because paraphrasing ("sure, sounds good", "I suppose I could") would go undetected.
- LLM-only: Rejected because classifiers can hallucinate confidence on vague phrasing.

---

## Decision 2: Conversation Feature Extraction Method

**Decision**: Lightweight regex/pattern-based extraction over the full transcript at session end. No LLM call for feature extraction.

**Rationale**: The 7 needed signals are quantitative and detectable with simple text patterns. Using the LLM here would be slow and imprecise for numeric values. The extraction runs once at termination — performance is not a concern.

**Feature set** (7 features):

| Feature | Extraction Method |
|---------|------------------|
| `agreement_ratio` | Affirmative word count / total player turns |
| `question_count` | Player messages containing "?" |
| `hedging_frequency` | Occurrences of "maybe", "sort of", "think", "probably", "kind of" |
| `validation_seeking` | Occurrences of "do you think", "is that okay", "right?", "make sense?" |
| `self_disclosure_depth` | Mentions of personal topics (feelings, past, fears) — keyword list |
| `contradiction_count` | Player uses "but", "however", "actually" followed by correction patterns |
| `engagement_length` | Mean word count per player message (proxy for investment) |

**Alternatives considered**:
- LLM-extracted features: Rejected — expensive, non-deterministic, hard to unit test.
- Turn-by-turn real-time extraction: Rejected — adds latency to every message; session-end batch is sufficient.

---

## Decision 3: JSON File Persistence Strategy

**Decision**: Atomic write via temp file + rename. One JSON file per character, one global player profile file.

**Rationale**: `fs.rename()` is atomic on POSIX (Linux/macOS). This prevents partially-written memory files from corrupting state if the process crashes mid-write. Separate files per character minimize the blast radius of any single write failure.

**Implementation pattern**:
```typescript
async function writeAtomic(filePath: string, data: object): Promise<void> {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, filePath);
}
```

**Directory layout**:
```
memory/
├── player-profile.json       # global inferred state
├── player-summary.json       # compressed LLM-facing summary
└── characters/
    ├── kind_guide.json
    ├── enabler.json
    └── ...
```

**Alternatives considered**:
- Single unified memory file: Rejected — a write failure would corrupt all character state simultaneously.
- SQLite: Rejected — overkill for this data volume; JSON files are sufficient and simpler to inspect.

---

## Decision 4: Relationship Metric Update Formula

**Decision**: Clamped persistence formula with archetype multiplier on the feature delta.

**Formula**:
```
delta = sum(featureWeight_i * feature_i)
archetypeDelta = delta * archetypeModifier
newValue = clamp(0, 100, oldValue * persistence + archetypeDelta)
```

**Parameters**:
- `persistence`: 0.80 default (slow decay between sessions); tune to 0.85 if metrics feel too volatile
- Feature weights: Sum to 20–30 so a single conversation nudges by 5–15 points maximum
- Archetype modifier: 0.8–1.2 multiplied on delta (not on total value)

**Archetype modifiers** (initial values, tunable):

| Archetype | bond | trust | dependency | instrumental_interest |
|-----------|------|-------|------------|----------------------|
| Enabler | 1.2 | 1.2 | 1.0 | 0.9 |
| Opportunist | 1.0 | 0.9 | 1.3 | 1.3 |
| Honest One | 1.0 | 1.1 | 0.9 | 0.8 |
| Parasite | 0.9 | 0.8 | 1.2 | 1.5 |
| Mirror | (mirrors dominant player trait) | | | |

**Runaway prevention**: Clamp to [0, 100] plus modest persistence ensures plateau around 85–90 even under repeated agreement scenarios. Test invariant: after 10 max-agreement conversations, no metric should exceed 95.

**Alternatives considered**:
- Linear accumulation (no persistence): Rejected — metrics would max out in 3–4 conversations with no nuance.
- Sigmoid curve: Considered but rejected for first pass — adds complexity with minimal benefit over clamped linear.

---

## Decision 5: Prompt Summary Generation

**Decision**: Use the local LLM to generate compressed summaries after the metric update step, not before.

**Rationale**: Summaries should reflect the freshly-updated relationship state. A single summarization call at session end is cheap and produces natural language output appropriate for injection into the next conversation.

**Summary structure** (generated per conversation end):
- `player_global`: 1 sentence describing dominant traits
- `recent_arc`: 1 sentence describing the last interaction's significance
- `npc_view`: 1 sentence (NPC's current read of the player)
- `current_tactic`: 1 sentence (NPC's intended approach next time)
- `tension`: 1 sentence (any active tension or unresolved dynamic)

**Alternatives considered**:
- Template-filled summaries (no LLM): Considered for speed, but natural language summaries are significantly more useful in context injection than formatted metric dumps.
