# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Status:** Project charter + complete analysis of the Vertex TTRPG. No application code exists yet.
> This document is the single source of truth for *what Vertex is* and *what we are building*. It was
> authored by reading the canonical Vertex corpus end to end (see **Source Material**). When the app is
> scaffolded, this file stays at the project root and is trimmed of anything the code itself makes obvious.

---

## 1. The Project — What We Are Building

A **web-based application that is a fully functional interface for playing Vertex**, centered on a
**fully interactive digital character sheet** that:

- **Follows the aesthetic style of Vertex** (see **§11 Aesthetic**).
- Is **fully interactive** — not a static form. It knows the rules: it rolls dice correctly, derives
  values automatically (Max HP, movement, Feature Uses, target Difficulty), tracks resources, and
  surfaces the game's living state (Drift, Faltering/Silent Archetypes, frayed/severed Tethers,
  yielded Holds, the Fate economy).
- Provides **the quality-of-life features modern TTRPG players expect** (see **§11**).

The creator of Vertex (**"Lawful"**) is a **non-coder** and the final authority on the game's design and
vision. The game's vision always outranks technical convenience. **Ask thorough, targeted questions
before making product or design assumptions** — name the decision ("X vs Y") rather than guessing.

### Decisions Locked (2026-06-20)
- **v1 scope:** the **interactive character sheet + a Cast (dice) engine**. Defer to later: full combat
  turn-tracker, automated Fate ledger, guided Vignette/Crossing flows, and all multiplayer features.
- **Audience:** **solo first, multiplayer-ready architecture** — one person manages their own character;
  design the data model so a live Host+players table (sync, Host screen, Echo/Sacrifice between players)
  can be added later without a rewrite.
- **Delivery:** a **website in the browser** (nothing to install). **Storage:** in-browser (localStorage),
  no login, with **Export/Import** for backup/move. Cloud accounts arrive with multiplayer.
- **Content:** ship the **full Archetype catalog** + the **Weird West Designations** as built-in,
  pickable data (extract from the guides; creator verifies). Character creation = a browsable picker.
- **Creation stat model:** **v004** — start **1/1/1**, allocate **up to +5** via Archetype Core Stat
  Tags (≤ +3 per Archetype). *(Resolved; the "+3/+2/+1" doc is stale.)*
- **Aesthetic — CURRENT (2026-06-22): COLD ARCHIVE + the MONUMENT / LEDGER / INDEX framework.** The palette
  arc was deep-purple → pure black/white → **Cold Archive**. The live app is a **cool near-black graphite**
  canvas with **cool off-white** text, **flat** (no glows, no chromatic aberration, no gradient washes — all
  read "AI-generated" to the creator). **Color is reserved for SEMANTICS only:** the three Core Stats
  (**red `#e74b3b` / green `#33b487` / blue `#5f92da`**) and the Core-tab resource meters (**Fate deep-purple
  `#6a2eb8` · HP gold `#f5c518` · Armor steel `#6f757e` · Temp HP white `#ffffff`**). A small **status
  palette** is a documented exception beyond stats+meters: **green = active/affirm, red = severed/yielded/
  danger, white = held/faltering, dim/strikethrough = silent/retired.**
  - **Type — three deliberate layers:** display/names/prose **Cormorant Garamond** (serif), UI **Inter**
    (sans), and the **data layer** — numbers, derived values, drift counts, all meta — **IBM Plex Mono**.
  - **One radius scale** (`--r-lg/--r/--r-sm/--r-xs/--r-pill`); flat solid surfaces carried by 1px lines +
    whitespace. Token NAMES in `styles/app.css` `:root` are stable so the whole palette swaps in one block.
  - **Layout:** centered tabs in the title bar (the **Cast tab is removed from the UI**; its engine is kept);
    a **persistent identity header** = small portrait **thumbnail** + character name on one line +
    `Designation: the <name>` (epithet removed from the header, still on the model + creation wizard);
    **full-width content** below (the old big left-portrait rail is gone).
  - **Per-tab framework (the design language each tab speaks):**
    - **Core = the MONUMENT** — the three Core Stats as oversized **centered serif numerals** (lining
      figures, no descender clipping) carrying their colors; domains on one line; derived values stacked in
      mono (Red → *Maximum Hit Points*; Green → *Initiative / Movement Speed / Difficulty*; Blue → *Feature
      Uses*). Resources sit **above** the stats as a **full-width ordered list**: Fate, Hit Points, Armor,
      Temporary Hit Points.
    - **Designation = the LEDGER** — big serif designation name, then each Feature as a hairline-divided
      editorial entry (mono type kicker, serif name, use-tracker, rule text). Borderless and airy.
    - **Archetypes / Gear / Bonds = the INDEX** — Archetypes: a grid of beliefs with the stat color on the
      left edge, Drift as clickable pips, status markers. Gear: a bento of item tiles. Bonds: Tether/Hold
      cards with status edges (severed red, held white, yielded faded) and the knot **Record** shown.
  > ⚠️ This **supersedes** the pure-black/white decision (now history) and all of the old deep-purple **§11**,
  > which is rewritten below for the live look. The Weird West parchment skin and a light **Editorial Bone**
  > skin (explored in `mockups/palette-directions.html`) remain possible later setting-skins.
- **HOUSE RULE — Feature Uses (refines v004):** the app tracks Feature Uses **per-feature**
  (each Major/Minor Feature has its own independent use track + reset), and **each track's maximum equals
  the character's Blue score** (creator clarification, 2026-06-20). So at Blue 2, every Feature is
  independently usable twice per encounter/scene — vs v004's single shared pool of Blue. The per-feature
  count is **derived live from Blue, never stored** (raise Blue → every Feature gains a use-slot). Passives
  cost no uses.
- **Design-exploration mockups (current):** the redesign was driven by comparative mockups the creator
  chose from — `mockups/palette-directions.html` (Warm Ink / Cold Archive / Editorial Bone palettes),
  `mockups/cold-archive-bold.html` (the Monument vs a portrait-led Dossier), and `mockups/tabs-directions.html`
  (Ledger vs Index for each non-Core tab). These are reference artifacts, **not** the app. (`sheet-v1..v4.html`
  are superseded earlier passes from the deep-purple era.) The creator's **mood board** lives at
  `D:\TTRPG\Vertex\App\moodboard\` (~90 images) — the Read tool can open them directly; Pinterest itself is
  not fetchable.
- **THE REAL APP NOW EXISTS** at the project root (build started 2026-06-20) — see **§15 Build & Architecture**.

### Relationship to prior work
There is an earlier **FoundryVTT implementation** of the Vertex character sheet built with the *Custom
System Builder (CSB)* module + custom CSS (`D:\TTRPG\Vertex\System\FoundryVTT\`). **That is prior art,
not the destination.** This app is a standalone, purpose-built experience. The FoundryVTT sheet is
valuable as (a) a proven field/data model for the character sheet (see **§10**) and (b) the source of
the current visual language (see **§9**).

---

## 2. The Soul of Vertex — Never Lose Sight of This

Vertex is *"a game about who its characters are, who they are becoming, and what it costs to complete
that transformation."* Every feature of the app must serve this, not fight it.

### The Three Pillars (every mechanic is weighed against these)
- **The Erosion of Certainty** — Facts fray as the Story unfolds. Mechanics carry an undercurrent of
  instability; the system rewards making peace with uncertainty, not eliminating it. A UI that makes the
  game feel like a perfectly stable spreadsheet works *against* Vertex.
- **The Cost of Conviction** — Every meaningful action demands something. There are no free victories.
  *If you can't name the cost, the mechanic is incomplete.*
- **The Ripple of Consequences** — The past is never gone. Mechanics create continuity across a whole
  character arc. The app should make a character's history **legible** — traceable from a decision to its
  present weight (this is literally what Drift, the Throughline, and Tether Knots do).

### The Animating Conflict
**The tension between who you think you are and what you are called to become.** If a mechanic (or UI
element) has nothing to do with identity, transformation, or the cost of self-actualization, question
whether it belongs.

### Tone
Vertex is **serious, not grim**. It takes its characters seriously; weight comes from meaning, not
darkness. Player-facing copy: second person, evocative but precise, never moralizing, never generic-TTRPG.

---

## 3. CANONICAL SOURCE & TERMINOLOGY DISCIPLINE

- **Canonical build: System Guide v004.** When any source conflicts with v004, **v004 wins.**
- **Retired terms — DO NOT use:** ~~Apex~~ (→ **Windfall**), ~~Fracture~~ (→ **Downside**),
  ~~"roll"~~ (→ **Cast**), ~~Echoes~~, ~~Resonances~~.
- ⚠️ **Known stale doc:** `Vertex_Claude_Instructions.md` still uses *Apex/Fracture* and describes
  Windfall/Downside as *lowering/raising Difficulty*. **This is obsolete.** Its **philosophy, voice, and
  design-process guidance remain excellent and current**; only its mechanical terminology is stale. Trust
  v004 for mechanics. (Flagged for the creator to update.)
- Use the game's vocabulary precisely. Glossary terms below are **Capitalized** as proper nouns.

| Term | Meaning (quick) |
|------|------|
| **Cast** | Rolling dice. Prefer over "roll." |
| **Windfall** | Two or more 6s in a Cast. Perfect self-actualization. Triggers a Windfall Table roll (does **not** auto-succeed — see §4.3). |
| **Downside** | Two or more 1s in a Cast. The weight breaking you. Triggers a Downside Table roll (does **not** auto-fail — see §4.3). |
| **Folding Fate** | The Advantage/Disadvantage system. |
| **Host** | The facilitator. NOT GM/DM. |
| **Archetype** | A force/belief inside a character; organized in **Mirrors** (paired **Sides**). |
| **Designation** | The practical shape/role of a character. NOT "Class." Setting-specific. |
| **Fate** | Narrative currency, max 10. Spent on **Gifts of Fate**. |
| **Vignette** | Dedicated introspective scene between one player and the Host. |
| **Tether** | A line stating what another character is to you now. |
| **Conviction Hold** | A line you will not cross / a vow you will keep, staked on identity. |
| **Drift / Crossing / Silence** | The **Arc** system: slow erosion, the reckoning, the dormant belief. |
| **Throughline** | The Host's running memory of a character's defining choices. |
| **Echo** | Player-to-player recognition that moves Fate sideways. |

---

## 4. Core Mechanics

### 4.1 The Three Core Stats
Characters have **Red, Green, Blue**. They start with **1 in each**.

| Stat | Domains | Governs |
|------|---------|---------|
| **Red** | Force, Presence, Resilience, Fortitude | **Max HP = Red score**; close-quarter (melee) attack Casts |
| **Green** | Precision, Reflex, Balance, Stealth | **Movement = 2 units × Green**; **turn order** (higher acts first); ranged attack Casts; **the Difficulty others face to target you** |
| **Blue** | Intellect, Discourse, Perception, Abstraction | **Feature Uses per encounter/scene = Blue score**; unconventional/esoteric attack Casts |

**Green → Target Difficulty (being targeted):** 1–3 → **Diff 1** · 4–6 → **Diff 2** · 7–9 → **Diff 3** · 10+ → **Diff 4**

### 4.2 Casting Die & Resolving Truth
1. Cast a number of **D6** equal to your relevant Core Stat.
2. Each die showing **5 or 6** is a **success**.
3. The Host sets the **Difficulty** = number of successes required.
4. **Hard cap:** you cannot attempt a Cast whose Difficulty **exceeds** your dice pool (your Stat score).
5. Meet or exceed Difficulty → your **intent becomes reality**.
6. **Edge case:** if a choice needs only 1 success and you have only 1D6, you still Cast a 2nd D6. It
   cannot provide a success, but it **can** trigger a Windfall or Downside. *(The app's roller must encode this.)*

### 4.3 Windfall & Downside  *(revised 2026-07-11 — supersedes the old auto-success/failure rule)*
- **Windfall** = **two or more 6s** → roll **1D6** on the **Combat** or **Roleplay Windfall Table**.
- **Downside** = **two or more 1s** → roll **1D6** on the **Combat** or **Roleplay Downside Table**.
- **They no longer force the Cast's outcome.** Success/failure is decided **solely** by successes vs
  Difficulty (§4.2). A Windfall/Downside is a table roll layered *on top of* that result — so you can
  **fail yet trigger a Windfall**, or **succeed yet trigger a Downside**. *(This retires the old
  double-penalty: a high stat rolls more dice, so more 1s; under the retired rule that meant more
  automatic failures — punishing investment. Now a Downside only adds a table roll.)*
- **Cancellation (pair-based):** pair sixes into Windfalls and ones into Downsides (**two** of a kind
  each); a Windfall and a Downside **cancel 1:1**. If any surplus of either remains, the Cast triggers
  **that one table** — **at most one Windfall or one Downside per Cast** (a single table roll), no matter
  how many pairs survive. A leftover single 6/1 is just an ordinary die (a 6 still scores a success).
  *Examples:* `6,6,1,1` → neither · `6,6,6,1,1` → neither (one pair each cancels; the lone 6 is only a
  success) · `6,6,6,6,1,1` → Windfall (two Windfall-pairs outweigh one Downside-pair) · `6,6,6,6,6,1` →
  Windfall (two pairs, but still just one Windfall) · `6,6,1` → Windfall (the lone 1 isn't a Downside) ·
  `1,1,6` → Downside (a Downside with no Windfall to cancel it).

**Windfall Tables** (1D6): *Combat* — 1 Bloodrush (extra Minor Action) · 2 Opening (next attack at Diff 1) ·
3 Piercing (bypass Temp HP/Armor) · 4 Refresh (recover 1 Feature Use) · 5 Ascendance (next Down → hold at
1 HP) · 6 Chosen (**+3 Fate**). *Roleplay* — 1 Compromise · 2 Resonance (next Cast Diff −1) · 3 Unveil ·
4 Change of Heart · 5 Certain (establish Backstory fact) · 6 Reversal (ignore next Archetype Disadvantage).

**Downside Tables** (1D6): *Combat* — 1 Staggered (move halved) · 2 Disarmed · 3 Shattered (attacks vs you
Diff −1) · 4 Sapped (next Feature costs 2 Uses) · 5 Friendly Fire (ally −1 HP) · 6 Void (**−3 Fate**).
*Roleplay* — 1 Void (−3 Fate) · 2 Muted (next Cast Diff +1) · 3 Opaque · 4 Misread · 5 Eyes Upon You ·
6 Cursed (lose next Archetype Advantage).

### 4.4 Folding Fate (Advantage / Disadvantage)  *(comparison revised 2026-07-11)*
- Both modes = **Cast twice**, then compare the two rolls on **two qualities only**: **pass/fail**
  (successes vs Difficulty) and **table** (Windfall is good · none is neutral · Downside is bad).
- **If one roll is objectively better** (≥ on both qualities, strictly better on one) it is taken
  automatically — **Advantage keeps the better** roll, **Disadvantage keeps the worse**. No prompt.
- **If the rolls trade off** (one wins on pass, the other on table — e.g. *pass-but-Downside* vs
  *fail-clean*, or *fail-but-Windfall* vs *pass-clean*) → **the player chooses** which **whole** roll to
  keep (its pass/fail *and* its table come together — no mixing). Advantage asks "which do you want?";
  Disadvantage "which is less bad?" — same mechanic.
- **Number of successes never decides this** — it is **narrative flavour only** (the Host may reward a
  higher-success roll in the fiction); it merely breaks the tie for which of two otherwise-identical rolls
  to surface.
- **Advantage** granted when prepared in the Story or strongly aligned with an Archetype (also via Tethers;
  see §6). **Disadvantage** inflicted when compromised or in strong conflict with an Archetype.
- **Advantage does NOT stack** — two sources still = Cast twice.
- The Host adjudicates, but **players may advocate** ("Vertex rewards those who can justify their will").

**The four identity-Cast outcomes (the heart of the Fate economy):**

| | Success | Failure |
|---|---|---|
| **Advantage** | Clean win, no bonus | **+3 Fate** |
| **Disadvantage** | **+3 Fate** | **+5 Fate** (tragic) — and **marks Drift** if it was Archetype-conflict |

---

## 5. Character Creation
1. **Core Stats:** start at **1 / 1 / 1**. Additional points come from Archetype **Core Stat Tags** (see §7):
   up to **+3 per Archetype**, **max +5 total** across all Archetypes.
   > ⚠️ **Discrepancy to confirm with the creator:** the stale instructions doc says creation uses a
   > "+3/+2/+1 allocation." v004 instead uses "start at 1 each, allocate up to 5 via Archetype tags."
   > **v004 governs**, but this materially changes the character-creator UI — confirm before building it.
2. **Select Designation** (from the setting's Designation Guide) → grants 3 Features + 3 starting Items.
3. **Embrace Archetypes** (from the Archetype Guide) → up to 5; allocate Core Stat points.
4. **Author Backstory** — explicitly **non-chronological, fluid, revisable**. Prompts: where you came
   from · who/what shaped you · what makes you unique · your ultimate wish.
5. **Capture Image** — a visual (literal, abstract, sketch — anything that captures presence).

---

## 6. Identity Subsystems (the parts most unique to Vertex — the app must model these as living state)

### 6.1 Archetypes, Mirrors & Sides
- An Archetype is a **force/belief**, not a stat block. Each has a **name**, a **tagline** ("what it
  whispers to you"), a description of **what it enables AND what it costs** (read both equally — the cost
  is not a footnote), and a **Core Stat Tag**.
- Archetypes come in **Mirrors** = paired **Sides** (e.g., *Masquerade ↔ Integrity*). Choosing an
  Archetype = choosing one Side of a Mirror. Sides are not good/evil — different philosophies, each with
  its own benefit and cost.
- **Core Stat Tag** maps the Archetype guide's labels: **Mental → Blue**, **Reflex/Finesse → Green**,
  **Physique → Red**. Many Archetypes list a hybrid (e.g., *Physique/Mental*); the player picks the one
  tag fitting their concept and may add **0–3** points to it (total ≤ 5 across all Archetypes).
- **≤ 5 Archetypes.** Choose for a cohesive, inhabited person, not a build.
- **Mechanics:** a choice aligned with an Archetype → **Advantage**; conflicting → **Disadvantage**;
  both → Host decides.

### 6.2 Arcs — Drift, the Crossing, Silence
- **Drift:** a short track beside each Archetype. **Mark one notch** when a Cast in conflict with that
  Archetype is folded to **Disadvantage** and **fails** (the +5-Fate tragic outcome). Drift has **no
  in-the-moment effect**; it accumulates visibly. *(Optional faster-erosion variant: mark on any
  Disadvantage-conflict failure, not only the 5-Fate ones.)*
- **Faltering:** an Archetype at its Drift **threshold** (default **5**; lower to **3** for short Stories,
  raise for long campaigns — the Host sets it). Still fully active, but living on borrowed time.
- **The Crossing:** a reckoning the Host **must** call at genuine arc boundaries (≈ once per major arc,
  rarely more than once / two sessions). Each character may: **Revise** an Archetype (keep mechanics,
  rewrite language; clears its Drift), **Retire** one (struck through, kept as record; suspends its Core
  Stat points; may replace with a new Archetype), **Wake a Silent** one (only via a Vignette), or
  **Revise Backstory** (free, changes no numbers).
- **Silence:** a Faltering Archetype left unaddressed at a Crossing falls **Silent** — grants neither
  Advantage nor Disadvantage, its Core Stat points are **suspended**, Drift frozen. Woken only at a
  Crossing through a Vignette.
- **Suspended points recalculate only at a Crossing** (never mid-scene): −1 Red → −1 Max HP; −1 Green →
  movement/turn-order/target-Difficulty drop; −1 Blue → −1 Feature Use.

### 6.3 Conviction Holds
- A **single first-person, present-tense line** you stake your identity on — a refusal or a promise,
  **specific and testable** ("I will not kill anyone who has surrendered to me"). Not a vague virtue.
- **≤ 2 Holds.** Unlike Archetypes, a Hold **does not flex** — it holds or **shatters**.
- **Honor** a Hold under genuine pressure → **+3 Fate** (once per Hold per scene).
- **Yield** (cross your own line) → **+6 Fate**, but the Hold is **retired immediately** and a **Vignette
  is owed**; the slot stays empty until that Vignette is played.
- **Hold the Line** (fiction says you'd break, but you won't) → **spend 5 Fate** to hold anyway
  (answers the narrative, not the dice).
- Pressure must be **genuine** (Host-arbitrated). Variants: **Mutual Hold** (shared between two
  characters), **Conditional Hold** (one named narrow exception), **Hold-adjacent pressure**.

### 6.4 Tethers
- A **first-person, present-tense line** naming **what another specific character is to you now**
  ("The only person who has never looked at me with pity"). **≤ 3**, each naming a different character.
- **Act on** a Tether → **+2 Fate** (once/scene/Tether). **Draw on** a Tether (its relationship is at
  stake) → roll with **Advantage** (once/scene; exposes it — a failed Cast may **fray** or **sever** it).
- **Fray** = pressure without making it false → **+2 Fate** (holder, and the PC who caused it).
- **Sever** = its truth becomes **false** → **+2 Fate**; must be **re-tied** (a brief spoken ritual; old
  line struck through, new line below = a **Knot**). Severing pays no more than fraying *by design* —
  Vertex rewards living Tethers, not breaking them.
- **Isolation:** holding **zero** Tethers. Can't draw for Advantage, but **+2 Fate** (once/scene) when
  succeeding meaningfully **entirely alone**. Ends the moment a new Tether is written.
- Optional: **Hidden Tethers** (private), **Asymmetric Tethers** (two characters, mismatched lines).
- The full **Record** (every struck-through line + Knot) is the player-facing **Ripple of Consequences
  made legible** — the app should render this history beautifully.

### 6.5 Vignettes
- A dedicated introspective scene (one player + Host). **Not bound by logic/chronology/causality** —
  past, possible futures, surreal/alternate selves. Thematic, not literal.
- **Any player may call one at any time** (no prerequisite). The Host may **defer** (never permanently deny).
- **Sacrifices:** during a Cast in a Vignette, another player may spend **3 Fate** and offer one of their
  Core Stat scores as the triggering player's dice pool (accept/decline). Outcomes confer benefits/costs
  back to the sacrificer.
- **Vignette Item:** the Host may award an item tied to the Vignette's emotional truth (frequency
  Host-controlled). It's a *consequence*, often a boon.

---

## 7. Combat
- **Turn order = Green** (highest first; ties → Green Casts; aligned characters may agree without rolling).
- A turn = three channels, any order, any/all skippable:
  - **Movement** (up to 2×Green units; splittable),
  - **Major Action** (weapon strike / Major Feature / **trade for 2 Minor Actions**),
  - **Minor Action** (speak, use consumable, pick up/interact, swap weapon, Minor Feature, ~10s tasks).
- **Attacks/Features:** Cast Red/Green/Blue per weapon/Feature type; successes ≥ target's Difficulty = hit.
  Cannot target a Difficulty above your pool. **Features used on allies always succeed.**
- **Damage** = 1 HP per hit unless specified. Absorbed in layers: **Temp HP → Armor (max 5) → HP.**
  (Temp HP cannot exceed Max HP.)
- **Downed** at 0 HP: may crawl at half movement; otherwise needs an ally's item/Feature to revive.
- **Total Down** (all PCs Downed): Host chooses — the Story **ends**, or **continues with a tragic,
  irreversible turn.** **Death is rare and sacred.**
- **Resting:** a full night restores all HP and cleanses **all** modifiers (good and bad). Partial rest = nothing.

---

## 8. Economies

### 8.1 Fate
- **Cap 10** (overflow lost). Typically gained in **2s** (Archetype/flaw/significant engagement, revival,
  story-altering choices) plus the **3/5** from the Folding-Fate outcomes (§4.4) and Tether/Hold awards.
- Award **generously and consistently**, but **never for ordinary competence**. Cadence: ~6–10 gained &
  spent per significant session per player.
- **Gifts of Fate (spend):**
  - **1:** A Moment's Clarity (ask exact Difficulty) · Steady Hand (reroll 1 die, keep it) · Hold On
    (one sentence while Downed) · Read the Room (a character's disposition).
  - **2:** Convenient Detail · Warning (rest-spot danger) · Resources (setting-appropriate currency).
  - **3:** Hint · Glimpse (one yes/no about a likely future) · Borrowed Time (ally Minor Action out of turn).
  - **5:** Time is Convoluted (ally Major Action out of turn) · Reveal the Thread · Nudge (±1 to a die) ·
    Silver Lining (cancel a Downside).
  - **7:** Reach Across the Mirror (borrow an ally's Archetype for a Cast) · The Audience · Determination
    (choose Windfall/Downside result instead of rolling).
  - **10:** Rewrite the Moment (cannot undo death) · The Illusion of Choice (declare a Windfall) ·
    The Power of Friendship.

### 8.2 Echo (player-to-player recognition)
- When another player's roleplay lands as **true** (not merely impressive), **give 2 Fate** from your own
  pool and **speak one specific sentence** naming what you saw. No dice, no Host ruling.
- **Never adds Fate to the table** — only moves it (spends into nothing if recipient is at cap). Can't
  Echo yourself; a moment is Echoed once. **Shared Echo:** several players give **1 each**.
- Optional: **The Reverberation** (a kept record of every Echo); **Echo Without Coin** (recognition only).

---

## 9. Items
- Five types: **Weapons, Wearables, Consumables, Miscellaneous, Key Items.** *(Plus the
  **Equipment vs Inventory** distinction — equipped vs carried.)*
- **Items are the primary axis of power growth** ("no level is conferred in the night"). An item should
  make a character *different*, not just stronger — new Features, new synergies.
- **Weapons:** stat-aligned (**Red** = close/force, **Green** = ranged/precision, **Blue** =
  unconventional/esoteric). Each has a **range**; out-of-range attacks can't be attempted. One equipped by
  default. May carry built-in Features.
- **Wearables:** occupy body **slots** — Head, Face, Neck, Back, Torso, Hands, Waist, Legs, Feet, and
  **Accessories** (unlimited). One per slot (except Accessories). Many grant **Armor** (cap 5).
- **Consumables** (single-use), **Miscellaneous** (creative utility), **Key Items** (narrative weight,
  often no mechanics). **Any item can break** (inert until **Repaired**).

---

## 10. The Character Sheet — Data Model (derived from canon + the FoundryVTT/CSB sheet)

The PC sheet in the FoundryVTT build has **9 tabs**; treat this as a validated information architecture,
**not a UI mandate** for the web app. Field keys below come from the existing build (kept for continuity).
Three Actor types exist: **Player Character**, **Secondary NPC** (simple, single-page), **Primary NPC**
(PC-depth + Disposition, Relationship-to-PCs, and a **Difficulty Rating** badge for hostile NPCs).

| Tab | Holds | Notable fields / keys |
|-----|-------|------------------------|
| **Core** | identity + resources + stats | `charname`, portrait, `designation`; meters `HitPoints`, `TempHitPoints`, `Armor` (max 5), `Fate` (max 10); stats `fit`=Red, `git`=Green, `wit`=Blue; `featureUses` |
| **Archetypes** | up to 5 | per slot: `abilities.N.abilityname`, `.tagline`, `.statTag` (Red/Green/Blue), `.pointsGranted` (0–3), `.status` (Active/Faltering/Silent/Retired), `.drift` (notches), `.abilitydesc` |
| **Designation & Features** | the 3 Features | `featureMajorName/Desc`, `featureMinorName/Desc`, `featurePassiveName/Desc` |
| **Tethers & Holds** | 3 Tethers + 2 Holds | `tether.N.to/.line/.status/.record`; `hold.N.declaration/.status/.timesHonored/.vignetteOwed` |
| **Equipment** | 9 slots + accessories | per slot `*Name`, `*Armor`, `*DESC`; accessories dynamic table |
| **Weapons** | equipped weapons | `weapName`, `weapStat` (R/G/B), `weapRange`, `specialeffect` |
| **Inventory** | everything carried | `invName`, `invType` (Consumable/Misc/Key), `INVDESC` |
| **Status Effects** | buffs/debuffs | `DYNBUFF` (`buffName`,`BUFFEFF`), `DYNDEB` (`debName`,`DEBEFF`) |
| **Biography** | backstory | prompts + `biography` rich text |

> ⚠️ Legacy key bug to avoid: the old template had `TORSODEC` → must be **`TORSODESC`**.

**Derived/computed values the app should calculate automatically** (do not store as free input):
Max HP = Red · Movement = 2×Green · Feature Uses (max) = Blue · Target Difficulty from the Green table ·
Total Armor from equipped Wearables · effective stats after Crossing suspensions.

---

## 11. Aesthetic — the live design system (COLD ARCHIVE)

> **This describes the CURRENT live app (2026-06-22).** Palette arc: deep-purple → pure black/white →
> Cold Archive; the earlier looks are history. §1 "Aesthetic" is the canonical summary; this is the detail.

**Palette (cool graphite, flat).** Cool near-black canvas, cool off-white text, no glows / chromatic
aberration / gradient washes. Token-driven in `styles/app.css` `:root` (names stable, values swap):
- **Chrome:** ink `#0a0d11` · panel `#0e1318` · inset `#141a21` · card `#121820` · bone (text) `#e9eef3` ·
  dim `#9aa3ad` · faint `#5f6873` · lines `rgba(233,238,243,.10 / .20)`.
- **Core Stats (semantic only — the palette and the soul):** Red `#e74b3b` · Green `#33b487` · Blue `#5f92da`.
- **Resource meters:** Fate `#6a2eb8` (deep purple) · HP `#f5c518` (gold) · Armor `#6f757e` (steel) ·
  Temp HP `#ffffff` (white). UI order: **Fate, Hit Points, Armor, Temporary Hit Points.**
- **Feature-type indicators (monochrome, NOT stat colors):** Major `#e9eef3` → Minor `#7e8893` → Passive `#475059`.
- **Status palette (the only color used beyond stats + meters):** green = active/affirm · red = severed/
  yielded/danger · white = held/faltering · dim + strikethrough = silent/retired.

**Type — three layers.** Serif **Cormorant Garamond** (display, names, prose, and the big stat numerals —
set in **lining figures** so they sit on the baseline without descender clipping); sans **Inter** (UI, body);
mono **IBM Plex Mono** (the **data layer**: numbers, derived values, drift counts, labels, all meta).
Wordmark **Cinzel**, flat (no chromatic aberration).

**System.** One radius scale (`--r-lg 14 / --r 11 / --r-sm 8 / --r-xs 6 / --r-pill`); flat solid surfaces;
1px lines + whitespace do the structural work. A near-invisible desaturated film grain on a fixed layer.

**Layout & per-tab framework.** Centered title-bar tabs; a persistent identity header (portrait **thumbnail**
+ name on one line + `Designation: the <name>`); full-width content. Each tab speaks one language:
- **Core = the MONUMENT** — oversized **centered serif stat numerals** carrying their colors; domains on one
  line; derived values stacked in mono. Resources sit **above** the stats as a full-width ordered list.
- **Designation = the LEDGER** — big serif name + hairline-divided feature entries (mono type kicker, serif
  name, use-tracker, rule text). Borderless, editorial, airy.
- **Archetypes / Gear / Bonds = the INDEX** — Archetypes: a stat-edged grid of beliefs with **clickable Drift
  pips** and status markers. Gear: a bento of item tiles. Bonds: Tether/Hold **status-edge cards** (severed
  red, held white, yielded faded) showing the knot **Record**.

**Mood board (inspiration / history).** `D:\TTRPG\Vertex\App\moodboard\` (~90 images, read 2026-06-20):
painterly portraiture of the dissolving self, jewel-toned in the three stat colors over warm near-black,
film grain. It informed the **soul** (the three stats as palette) and the portrait treatment; the live
chrome is cool graphite, not the mood board's warm purple.

**Setting-skins (later).** Because the look is token-driven, alternate skins drop in by swapping the `:root`
block: a Weird West **parchment** skin, and a light **Editorial Bone** skin (warm off-white, explored in
`mockups/palette-directions.html`) are candidates. The **legacy** FoundryVTT skin (`vertex-custom.css`:
worn parchment/leather, Garamond + Special Elite, `darkred`/`#3A7C22`/`#0070C0`) is prior art for the
Weird West direction, not the core identity.

---

## 12. How to Work on This Project (creator's standing preferences)

**Efficiency & concision (2026-06-22 — applies to every response; prioritize this over thoroughness of commentary).**
- **Be concise; save usage.** Give the shortest reply that fully does the job. Cut preamble, recaps of what
  you just did, restating the request, and narrating paths you won't take. Lead with the result.
- **Thorough on steps, terse elsewhere.** When explaining how to do something, be complete about the actual
  steps; drop the surrounding commentary and background.
- **Succinct code.** Smallest correct change; match the surrounding style; no scaffolding, comments, or
  abstraction the task doesn't need.
- **Implement surgically.** Touch only what the change requires. Don't refactor untouched code, rename, or
  sweep the project to land one feature. Find the minimal edit path; if a wider refactor is truly warranted,
  name it and ask first.

From the creator's design instructions (philosophy/voice still fully current):
- **Be a creative collaborator, not a yes-machine.** Lead with the honest read; push back when something
  fights the Three Pillars; flag pitfalls before they bite.
- **Ask targeted clarifying questions before building.** Name the decision point ("X vs Y").
- **Every mechanic must have a cost.** If you can't name it, it's incomplete.
- **Flag optimization-toward-stability** (reliable Advantage, stacked Fate, Green-stacking). Stability is
  the enemy of Vertex's tone — and a digital tool makes optimization *easier*, so guard against UI that
  quietly encourages it.
- **Don't import other TTRPGs wholesale.** Inspiration yes, imitation no. Don't sand off intended sharp edges.
- **Voice for player-facing text:** second person, bolded declarative lead-ins, aphoristic one-sentence
  punches, prose over bullets in explanatory sections, never moralizing.
- Keep Vertex walled off from the creator's legal/client work. *(The project is **public** as of
  2026-06-21 — the creator chose to publish it; see §15. It need not be hidden, but keep it separate
  from unrelated professional matters.)*
- **Use Git + GitHub continuously — never lose work.** This repo is version-controlled at the **public**
  GitHub remote **`ultimondo/vertex`** (`origin/main`). As you work, **commit each meaningful change with a
  clean, descriptive commit message and push to GitHub regularly** (don't batch a whole session into one
  commit) so the project's status is always saved and we can revert any change. The creator has given
  **standing authorization to push**. End every commit message with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. See §15 for repo details.

---

## 13. Open Questions / Decisions Still To Resolve
*(The big direction calls are settled — see **Decisions Locked** in §1. These remain open.)*

1. ~~**Mood-board palette**~~ — **RESOLVED.** Ingested from `D:\TTRPG\Vertex\App\moodboard\` (Pinterest
   itself is not fetchable; the Read tool opens the saved images directly). The live palette is now the
   **Cold Archive** direction (§11); the mood board informed the soul + portrait treatment, not the chrome.
2. ~~**Tech stack / framework**~~ — **RESOLVED.** Plain **no-build vanilla JS** (classic `<script>` tags,
   global `Vertex.*` namespace), static files, runs from `file://` *or* any static host. Chosen so the
   non-coder can just open `index.html`, with no Node/compile step. See §15.
3. **Devices** — desktop + tablet confirmed (browser). Phone support and print/PDF export: TBD.
4. **Cross-tool import** — in-app Export/Import is confirmed; importing existing **FoundryVTT** characters
   is a maybe-later.
5. **Archetype data extraction** — **deferred (2026-06-20):** the Archetypes Guide isn't finalized, so the
   built-in catalog/picker is on hold. Creation authors Archetypes free-form for now. When the guide is
   final, structure each Archetype's **Mirror pair** + canonical **Stat tag**, get **creator verification**,
   then add the picker as a pre-fill over the existing free-form fields.
6. **Feature-Uses box counts** — the per-feature house rule (§1) is set; how many use-boxes each Feature
   gets is still to tune during the real build.

---

## 14. Source Material (read these; do not rely on summaries)

Canonical game corpus lives at **`D:\TTRPG\Vertex\System\`**:
- `Vertex Guides\Vertex System Guide v.004.docx` — **canonical**, governs on conflict.
- `Vertex Guides\Vertex Archetypes Guide.docx` — full Mirror/Side catalog + taglines + Stat tags.
- `Vertex Guides\Vertex Designation Guide (Weird West Setting).docx` (+ `.pdf`) — example setting.
- `Vertex Guides\Vertex - Arcs (drop-in section).md` — Arc rules (folded into v004).
- `Vertex Guides\Vertex Comparative Analysis.docx`, `…Roleplay Mechanics Research & Design Proposals.docx` — design rationale.
- `Vertex Guides\Old System Guides\` — prior drafts (may contain **retired** terminology — beware).
- `Claude Instructions\Vertex_Claude_Instructions.md` — design-collaborator guide (**mechanics stale**; philosophy/voice current).
- `FoundryVTT\CSB-Template-Instructions.md`, `FoundryVTT\vertex-custom.css` — prior-art sheet model + visual language.

> `.docx` files are not directly readable by the Read tool. Extract text first (e.g., unzip
> `word/document.xml` and strip tags) — they convert cleanly to plain text.

---

## 15. Build & Architecture (the real app)

**Stack:** plain HTML/CSS/vanilla JS, **no build step**. Classic `<script>` tags load in order and attach
to a single global namespace `window.Vertex`. Runs by opening `index.html` directly (`file://`) or from any
static host (GitHub Pages / Netlify). No Node, npm, bundler, or framework — deliberate, so the non-coder
creator can just open it, and so there's nothing to compile/deploy to preview. Multiplayer later =
add a backend behind `Vertex.storage` (see below) without touching the rules/UI.

**To run:** double-click `D:\TTRPG\Vertex\App\index.html` (or `Start-Process` it). No local server required.
Google Fonts load over the network (graceful system fallback offline).

**Version control (commit + push as you work — see §12):** **public** GitHub repo **`ultimondo/vertex`**,
default branch **`main`** tracking `origin/main`. Commit identity is **repo-local** (name `ultimondo`,
no-reply email — global git config untouched). `moodboard/` is **gitignored** (third-party art, local-only);
the canonical guides under `D:\TTRPG\Vertex\System\` live outside the repo and are not versioned here.
Workflow: `git add` → commit with a clean message (+ the `Co-Authored-By` trailer) → `git push` after each
meaningful change, so no status or work is ever lost.

**Live site (GitHub Pages):** the app is published from the **`main`** branch, **root** folder, at
**https://ultimondo.github.io/vertex/** (enabled 2026-06-21). Pages redeploys automatically on every push
to `main` — no separate deploy step. A `.nojekyll` file at the root tells Pages to serve files as-is
(no Jekyll processing). All asset paths in `index.html` are **relative**, so the app loads correctly under
the `/vertex/` sub-path. The site is fully public and search-indexable.

**File map (project root):**
| File | Role |
|------|------|
| `index.html` | App shell: centered title-bar tabs, persistent identity header (portrait thumbnail + name + designation), full-width tab panels filled by JS. |
| `styles/app.css` | All styling — Cold Archive palette + the Monument / Ledger / Index framework (§11), token-driven `:root`. |
| `data/seed.js` | `Vertex.SEED` — two starter characters (Mara·Blacksmith, Rosa·Luchador), loaded only on first run. |
| `src/dice.js` | `Vertex.dice` — **pure** Cast engine: pass/fail = successes ≥ Difficulty; Windfall/Downside are table-triggers only (1:1 cancel), **decoupled** from success; Folding Fate auto-keeps the better/worse roll but returns `needsChoice` when the two rolls trade off. 1-die edge case. No DOM. |
| `src/model.js` | `Vertex.model` — character schema, **derived values** (never stored), normalize/clamp helpers, `archetypePointsSpent`. |
| `src/storage.js` | `Vertex.storage` — localStorage load/save + JSON export/import. **The seam to swap for a cloud/multiplayer backend.** |
| `src/render.js` | `Vertex.render` — character → tab HTML (pure string builders); controls call `Vertex.app.*`. |
| `src/create.js` | `Vertex.create` — the **guided character-creation wizard** (modal in `#overlay`): free-form authoring in v004 order, builds a `Vertex.model` character and hands it to `Vertex.app.commitNewCharacter()`. |
| `src/app.js` | `Vertex.app` — controller: in-memory state, events, persistence, orchestration. Boot on DOM ready. |

**Conventions:** derived values (Max HP, Move, Difficulty, Feature Uses) are **always computed** from stats,
never stored. Mutations go through `Vertex.app.*`, which `save()`s the whole list to localStorage and
re-renders the affected tab. Per-feature use tracking uses `feature.spent[]`; the **number of use-slots per
Feature is derived from Blue** (house rule, §1) — not stored. Changing Blue re-renders the Designation tab.

**Status — what the build does now:** create / switch / delete / export / import
characters (auto-saved in-browser); editable stats with live-derived values; editable resources
(Fate/HP/Armor/Temp HP); portrait image upload; per-feature use tracking; clickable Drift. All five tabs are
redesigned in the **Cold Archive** language (§11): **Core = the Monument**, **Designation = the Ledger**,
**Archetypes / Gear / Bonds = the Index** — rendering from data (display + the existing inline interactions).
The **Cast** is surfaced as a **modal opened by clicking a Core stat numeral** (locked to that stat): a
short flow of **set Difficulty → choose Normal/Advantage/Disadvantage → (if the two rolls trade off) pick
which roll to keep → result**, with the success/Windfall/Downside legend on a hover `?`. Resolution follows
§4.2–4.4: pass/fail is successes-only and Windfall/Downside are decoupled table-triggers. (The old
Cast-**tab** UI builder, `Vertex.render.cast`, is kept but unmounted.) **Guided character
creation** (`src/create.js`) is built: a step-by-step
wizard (Identity → Designation → Archetypes → Backstory → Convictions & Tethers → Image → Review) that
authors everything free-form, allocates Archetype Core-Stat points (≤3 each, ≤5 total) that auto-apply to
starting stats, and drops empty rows on commit.

> **Decision (2026-06-20):** **v004 is the controlling language** for the whole project; anything in any
> other doc that contradicts v004 is stale (standing permission to edit those docs for congruence). The
> built-in **Archetype catalog is deferred** — the Archetypes Guide isn't finalized — so creation is
> free-form authoring; the catalog becomes an optional *pre-fill picker* later with no rework.

**Next increments (not yet built):** (1) in-place **editing** of Archetypes/Tethers/Holds/Features/Items +
Biography (reusing the wizard's field editors); (2) the **Crossing / Drift / Silence** arc flow;
(3) settings-skin theming; later, the **Archetype catalog** picker (after the guide is finalized + verified)
and a Weird West **Designation** picker; later still, multiplayer.
