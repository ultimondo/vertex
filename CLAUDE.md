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

- **Follows the aesthetic style of Vertex** (see **§9 Aesthetic**).
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
- **Aesthetic:** **setting-neutral "core Vertex"** — the **chrome is deep dark purple** over near-black
  (a *neutral* accent that does NOT favor any one stat; the creator was explicit the base must not read as
  "Red"). The three Core Stats appear as **painterly crimson / emerald / indigo ONLY where semantic**
  (stat values, tags, meters), never as the background. Fate = brighter purple. **Film/canvas grain +
  inky cloud texture**, atmospheric washes, the **dissolving-self** motif, and **chromatic aberration** on
  the wordmark + character names. **Portrait placeholders are identical for every character** — one shared
  dark-purple gloss + initials (art-upload later). Display **Cormorant Garamond**; body **Inter**.
  **Layout:** tabs live in the title bar; a full-width identity band (Name · epithet · Designation) sits
  beneath it; portrait card (large, near the left edge) + content cards start on one line below.
  Weird West parchment = a later skin.
- **HOUSE RULE — Feature Uses (refines v004):** the app tracks Feature Uses **per-feature**
  (each Major/Minor Feature has its own independent use track + reset), and **each track's maximum equals
  the character's Blue score** (creator clarification, 2026-06-20). So at Blue 2, every Feature is
  independently usable twice per encounter/scene — vs v004's single shared pool of Blue. The per-feature
  count is **derived live from Blue, never stored** (raise Blue → every Feature gains a use-slot). Passives
  cost no uses.
- **Working mockups:** `mockups/sheet-v4.html` is the current look-and-feel reference — deep-purple chrome,
  tabs-in-titlebar layout, full-width identity band, large left portrait, horizontal Core Stats rows,
  Fate-first resources, working character switcher (Mara Quill·Blacksmith / Rosa Delgado·Luchador),
  interactive resources, per-feature use tracks. (`sheet-v1/v2/v3.html` are superseded passes.) Demo
  mockups, not the app. The creator's **mood board** lives at `D:\TTRPG\Vertex\App\moodboard\` (~90 images)
  — the Read tool can open them directly; Pinterest itself is not fetchable.
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
| **Windfall** | Two or more 6s in a Cast. Perfect self-actualization. Auto-success + table roll. |
| **Downside** | Two or more 1s in a Cast. The weight breaking you. Auto-failure + table roll. |
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

### 4.3 Windfall & Downside
- **Windfall** = **two or more 6s** → automatic success regardless of Difficulty; then roll **1D6** on the
  **Combat** or **Roleplay Windfall Table**.
- **Downside** = **two or more 1s** → automatic failure regardless of successes; then roll **1D6** on the
  **Combat** or **Roleplay Downside Table**.
- **Cancellation:** Windfall and Downside **sets cancel 1:1**. (1 Windfall + 1 Downside → normal Cast.
  2 Windfalls + 1 Downside → Windfall prevails.)

**Windfall Tables** (1D6): *Combat* — 1 Bloodrush (extra Minor Action) · 2 Opening (next attack at Diff 1) ·
3 Piercing (bypass Temp HP/Armor) · 4 Refresh (recover 1 Feature Use) · 5 Ascendance (next Down → hold at
1 HP) · 6 Chosen (**+3 Fate**). *Roleplay* — 1 Compromise · 2 Resonance (next Cast Diff −1) · 3 Unveil ·
4 Change of Heart · 5 Certain (establish Backstory fact) · 6 Reversal (ignore next Archetype Disadvantage).

**Downside Tables** (1D6): *Combat* — 1 Staggered (move halved) · 2 Disarmed · 3 Shattered (attacks vs you
Diff −1) · 4 Sapped (next Feature costs 2 Uses) · 5 Friendly Fire (ally −1 HP) · 6 Void (**−3 Fate**).
*Roleplay* — 1 Void (−3 Fate) · 2 Muted (next Cast Diff +1) · 3 Opaque · 4 Misread · 5 Eyes Upon You ·
6 Cursed (lose next Archetype Advantage).

### 4.4 Folding Fate (Advantage / Disadvantage)
- **Advantage:** Cast twice, take the **better** result. Granted when prepared in the Story or strongly
  aligned with an Archetype (also via Tethers; see §6).
- **Disadvantage:** Cast twice, take the **worse** result. Inflicted when compromised or in strong
  conflict with an Archetype.
- **Advantage does NOT stack** — two sources of Advantage still = Cast twice, take best.
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

## 11. Aesthetic — the "core Vertex" visual language (from the creator's mood board)

The creator's **mood board** (`D:\TTRPG\Vertex\App\moodboard\`, ~90 images, read 2026-06-20) is the
authority on the look. It is remarkably coherent: **painterly portraiture of the dissolving self** —
faces fragmenting, melting, masked, faceless, eyes hidden — rendered in the three Core Stat colors as
saturated, jewel-toned, painterly fields (oil, watercolor, ink-bleed, peeling paper) over warm near-black,
with film/canvas grain. The three stats are not just labels — **they are the palette and the soul.**

**Core-Vertex design tokens (as implemented in `sheet-v4.html`):**
- **Base / chrome (deep purple, neutral):** ink `#09070e` · panel `#130f1d` · card `#15111f` · placeholder
  `#190f29` · bone text `#ece7ef`. Background = radial **deep-purple** washes (`#5a2f96`/`#2a1742`) over ink.
  *(Purple is the neutral chrome — NOT a stat color.)*
- **Core stat colors (painterly, semantic only):** Red `#d23b2c` · Green `#2fa074` · Blue `#5277b8`
- **Resource meters:** Fate **purple `#a274ec`** (brighter than chrome) · HP **gold `#c9a24a`** ·
  Temp HP **`#c4bdcf`** · Armor **steel `#9aa0aa`**. Resource order in UI: **Fate, HP, Armor, Temp HP.**
- **Portrait placeholder (identical for all characters):** linear gloss `#3b2560 → #1d1230 → #120b20` + top
  highlight + inner vignette + initials.
- **Feature-type indicators:** deliberately **NOT** the stat colors — monochrome tones
  (Major `#ece2d4` → Minor `#8d8478` → Passive `#564d47`).
- **Typography:** display **Cormorant Garamond** · body **Inter** · wordmark **Cinzel** w/ chromatic aberration.
- **Texture/effects:** SVG film grain overlay, radial vignette washes, chromatic-aberration split on the
  wordmark + names (the "erosion of certainty").

**Legacy skin (Weird West / FoundryVTT `vertex-custom.css`):** worn parchment, leather, typewriter
(Garamond + Special Elite); stat colors `darkred`/`#3A7C22`/`#0070C0`; name `#f0d299`. Keep as **one
future setting-skin**, not the core identity.

**Status visual language (reuse these conventions in the app):**
- Archetype: **Faltering** = goldenrod left-border + faint gold wash · **Silent** = 55% opacity + gray
  border · **Retired** = strikethrough + 35% opacity.
- Tether: **Severed** = strikethrough, gray, italic · **Open** (severed, not re-tied) = red italic.
- Hold: **Active** = gold left-border · **Yielded** = darkred left-border, faded.
- Feature: **Major** = red left-border · **Minor** = green · **Passive** = blue.
- NPC **Difficulty Rating** = circular darkred badge (die-face look).

---

## 12. How to Work on This Project (creator's standing preferences)

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
- Keep Vertex **confidential/unpublished** and walled off from the creator's legal/client work.
- **Use Git + GitHub continuously — never lose work.** This repo is version-controlled at the **private**
  GitHub remote **`ultimondo/vertex`** (`origin/main`). As you work, **commit each meaningful change with a
  clean, descriptive commit message and push to GitHub regularly** (don't batch a whole session into one
  commit) so the project's status is always saved and we can revert any change. The creator has given
  **standing authorization to push**; keep the repo **private**. End every commit message with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. See §15 for repo details.

---

## 13. Open Questions / Decisions Still To Resolve
*(The big direction calls are settled — see **Decisions Locked** in §1. These remain open.)*

1. ~~**Mood-board palette**~~ — **RESOLVED.** Ingested from `D:\TTRPG\Vertex\App\moodboard\` (Pinterest
   itself is not fetchable; the Read tool opens the saved images directly). Palette captured in §11 and
   applied in `sheet-v3.html`.
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

**Version control (commit + push as you work — see §12):** private GitHub repo **`ultimondo/vertex`**,
default branch **`main`** tracking `origin/main`. Commit identity is **repo-local** (name `ultimondo`,
no-reply email — global git config untouched). `moodboard/` is **gitignored** (third-party art, local-only);
the canonical guides under `D:\TTRPG\Vertex\System\` live outside the repo and are not versioned here.
Workflow: `git add` → commit with a clean message (+ the `Co-Authored-By` trailer) → `git push` after each
meaningful change, so no status or work is ever lost.

**File map (project root):**
| File | Role |
|------|------|
| `index.html` | App shell: title bar + tabs, identity band, portrait rail, empty tab panels filled by JS. |
| `styles/app.css` | All styling (deep-purple chrome, §11 palette). |
| `data/seed.js` | `Vertex.SEED` — two starter characters (Mara·Blacksmith, Rosa·Luchador), loaded only on first run. |
| `src/dice.js` | `Vertex.dice` — **pure** Cast engine (v004 resolution, Windfall/Downside + 1:1 cancel, 1-die edge case, Advantage/Disadvantage). No DOM. |
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
(Fate/HP/Armor/Temp HP); portrait image upload; per-feature use tracking; clickable Drift; and a working
**Cast** tab (Normal/Advantage/Disadvantage, real dice, Windfall/Downside). Archetypes/Bonds/Designation/
Gear render from data (display). **Guided character creation** (`src/create.js`) is built: a step-by-step
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
