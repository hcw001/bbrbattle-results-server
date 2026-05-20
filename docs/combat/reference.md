# BBR Combat System — Implementation Reference

A consolidated reference for implementing combat. Covers unit profiles, combined-arms interactions, the full combat resolution sequence, and how each research tech mutates base behavior.

---

## 1. Core Combat Concepts

### 1.1 Dice & Hit Resolution
- Combat is resolved by rolling **a single d6 per firing unit** (with some exceptions noted below).
- A unit **scores a hit when its die roll ≤ its attack value (if attacking) or defense value (if defending)**.
- Attacker and defender fire **simultaneously** in concept, but for implementation the attacker rolls first, then the defender. Hits taken are placed behind a "casualty strip" and still return fire in the same round before being removed.
- Casualty selection: the **non-firing side picks which of its units absorbs each hit** (attacker picks defender's casualties when defender fires, and vice versa), subject to targeting restrictions.

### 1.2 Battle Spaces
Combat occurs in **territories** (land) or **sea zones** (naval).

### 1.3 Capital Ships & Damage
- **Capital ships** = Battleships and Aircraft Carriers. They have **damage capacity 2** (require 2 hits to destroy).
- A damaged capital ship (1 hit applied) **attacks, defends, and moves at 50% capacity**, rounded down. Example: a damaged battleship attacks/defends at `2` (and moves `1`) instead of `4` (and `2`); a damaged carrier defends at `1` (and moves `1`) instead of `2` (and `2`). (A=0 for carriers is unchanged.)
- **Timing carve-out for defense:** an already-damaged capital ship defends at halved value from the start of the round. An undamaged capital ship that takes hit(s) during main combat (steps 3–4) still returns fire at full defense that round — the damage penalty applies from the next round onward.
- Damage state is re-evaluated at the **start of each combat round** and also **immediately after step 2** if the capital ship was struck by a Target Select or Surprise Strike during that step (so a capital ship first-hit in step 2 defends at halved value when main combat fires in steps 3–4).
- A damaged capital ship **loses its built-in AAA** and **cannot shore bombard**.
- A single hit on an undamaged capital ship places a damage chip — the unit is **not** moved behind the casualty strip and is **not** destroyed.
- When a capital ship absorbs its **final hit** (reaching max HP), it is placed behind the casualty strip and removed after step 4 — same as any other unit. It returns fire in step 4 using the stats it held at the **start of step 3** that round (not post-hit values) and still contributes to combined arms in step 4 — pairings are evaluated at time of firing, and the unit is present on the strip. If the killing blow came in step 2, the capital ship is removed immediately, does **not** fire in steps 3–4, and cannot contribute to combined arms for the rest of that round (e.g., a battleship killed in step 2 can no longer pair with a cruiser in steps 3–4; but the cruiser may still pair with any other battleship that is present).

---

## 2. Unit Profiles (Base Stats)

Legend: A = Attack, D = Defense, M = Movement, HP = Damage Capacity, Cost = IPCs.

### 2.1 Land Units

| Unit | Cost | A | D | M | HP | Tech Upgrade | Key Notes |
|---|---|---|---|---|---|---|---|
| Infantry | 3 | 1 | 2 | 1 | 1 | — | Attack → 2 when paired 1:1 with artillery (attack only) |
| Artillery | 4 | 2 | 2 | 1 | 1 | Self-Propelled Artillery | Boosts infantry/mech infantry to A=2 (1:1 pairing, attack only) |
| Mechanized Infantry | 4 | 1 | 2 | 2 | 1 | Advanced Mechanized | Blitz with tank (1:1 pairing); supported by artillery like infantry |
| Tank | 6 | 3 | 3 | 2 | 1 | Heavy Tanks | Can blitz through unoccupied hostile territories |
| Cavalry | 4 | 2 | 1 | 2 | 1 | — | Can blitz like tanks |
| AAA | 5 | 0 | 1 | 1 (noncombat only) | 1 | Radar and A.T.C. | Cannot move in combat phase; special air-defense fire; cannot fire in normal combat steps |

**Only Infantry, Artillery, Cavalry, Mechanized Infantry, and Tanks can capture hostile territories or convert friendly neutrals.** AAA can fight but cannot capture (AAA is captured if left alone).

### 2.2 Air Units

| Unit | Cost | A | D | M | HP | Tech Upgrade | Key Notes |
|---|---|---|---|---|---|---|---|
| Fighter | 10 | 3 | 4 | 4 | 1 | Jet Fighters | Carrier-capable; can escort/intercept bombing raids |
| Tactical Bomber | 11 | 3 | 3 | 4 | 1 | — | Carrier-capable; Target Select option; can tactical-bomb air/naval bases |
| Strategic Bomber | 12 | 2@2 (rolls 2 dice at 2) | 1 | 6 | 1 | Heavy Bombers | First combat round only when attacking, then must retreat or be killed; can strategic-bomb; can air-transport |

**Strategic Bomber attack notation `2@2`**: rolls **2 dice**, each hits on `≤2`.

**Strategic bombers attacking in general combat fight only round 1. After round 1, any surviving strategic bomber is compulsorily removed from the battle — regardless of whether the attacker presses on — and lands during Noncombat Move. This removal is not a player choice. The only exception is if the bomber was taken as a casualty during round 1, in which case it is already gone.**

### 2.3 Naval Units

| Unit | Cost | A | D | M | HP | Capacity | Tech Upgrade | Key Notes |
|---|---|---|---|---|---|---|---|---|
| Submarine | 6 | 2 | 1 | 2 | 1 | — | Super Submarines | Target Select / Surprise Strike / Submerge; never hits air; hit by air only if a destroyer friendly to the attacking air is in the battle; ignored by enemy movement
| Transport | 7 | 0 | 0 | 2 | 1 | 2 land units | Improved Transports | Cargo only; chosen as casualty last; ignored by enemy movement when alone; cannot attack alone |
| Destroyer | 8 | 2 | 2 | 2 | 1 | — | — | Negates submarine special abilities (Target Select, Surprise Strike, Submerge, stealth, air-immunity) |
| Cruiser | 12 | 3 | 3 | 2 | 1 | — | — | Shore bombard at 3; built-in AAA (1 shot each); pairs with battleship for D=4 |
| Aircraft Carrier | 16 | 0 | 2 | 2 | 2 | 2 air units | Super Carriers | Capital ship; carries fighters + tactical bombers; damaged carrier cannot launch or recover air units — planes on a damaged defending carrier become cargo (cannot fight; die with the carrier if destroyed) |
| Battleship | 20 | 4 | 4 | 2 | 2 | — | Super Battleships | Capital ship; shore bombard at 4; built-in AAA (3 shots each) |

**Surface warships** = Carriers, Battleships, Cruisers, Destroyers. **Submarines and Transports are NOT surface warships and are NOT warships respectively.**

---

## 3. Combined Arms ("Bloodbath" Chart)

Pairings are active only as specified in the table below. Most are 1:1; Self-Propelled Artillery tech changes the artillery buff to 1:2; the destroyer effect applies to all applicable units in the battle. **Pairings are re-evaluated at each time of firing — step 3 (attackers) and step 4 (defenders) independently. Units behind the casualty strip count for combined arms when they fire.**

| Pairing (1:1) | Effect | When Active |
|---|---|---|
| Infantry + Artillery | Infantry attacks at 2 | Attack only |
| Mech Infantry + Artillery | Mech Infantry attacks at 2 | Attack only |
| Tactical Bomber + Tank | Tactical Bomber attacks at 4 | Attack only |
| Tactical Bomber + Fighter | Tactical Bomber attacks at 4 | Attack only |
| Transport + Transport | One transport defends at 1 | Defense only |
| Battleship + Cruiser | Cruiser defends at 4 | Defense only |
| Any unit + (friendly) Destroyer in the battle | Air units in the battle can hit submarines; submarines lose stealth/surprise/submerge | While destroyer is in battle |

**Excess unsupported units use base values.** E.g., 5 infantry + 2 artillery → 2 infantry attack at 2, 3 infantry attack at 1.

**Tactical Bomber + Target Select**: if the tac bomber uses Target Select, it **forfeits Combined Arms for the entire battle** (even though Target Select is round-1 only).

---

## 4. General Combat Sequence (Per Round)

For each contested space, repeat steps 2–6 each round until termination:

1. **Place units on the Battle Board.** Attacker side and defender side. Cargo (units on transports, guest air on carriers) is placed beside its carrier and does not roll or take hits — it dies with its carrier.
   - **Allied units already in the contested space do NOT join the battle.** If you attack into a sea zone that already contains friendly (allied) units, your ally's units are not placed on the Battle Board and remain out of play. They do not fire, take hits, or affect combat resolution.
2. **Target Select / Surprise Strike / Submerge** — submarines and attacking tactical bombers act *before* normal combat rolls. Within step 2: (a) attacker rolls Target Select dice and marks casualties; (b) defender rolls Surprise Strike dice and attacker picks those casualties; (c) all step-2 casualties are removed. A unit marked as a step-2 casualty in (a) still rolls if it has a step-2 action in (b). Step-2 casualties do **not** fire in steps 3 or 4.
3. **Attacking units fire.** Roll one die per attacking unit that did not act in step 2. Defender places hits behind casualty strip.
4. **Defending units fire.** Roll one die per defending unit (including those behind casualty strip) that did not act in step 2. Attacker removes casualties immediately.
5. **Remove defender's casualties** (from the casualty strip).
6. **Press attack or retreat** — see termination conditions below.
7. **Conclude combat** (run once when the battle ends).

### 4.1 Step 2 — Submarines

**Trigger:** Attacking subs may act in step 2 only if **no defending destroyer** is in the battle. Defending subs may act in step 2 only if **no attacking destroyer** is in the battle.

- **Attacking subs** may: Target Select OR Submerge.
- **Defending subs** may: Surprise Strike OR Submerge.
- Decision is made **before any dice are rolled**. **Attacker decides first.**
- **Submerge**: remove from Battle Board, place back in sea zone with a "Submerged" marker. Remains submerged until the controlling player's next turn. Cannot fire or take hits this combat.
- **Attacking sub Target Select**: The attacker **declares a specific target unit for each participating submarine before rolling** (any naval unit including transports). Each sub independently chooses its own target — multiple subs may all declare the same unit, or each may declare a different valid unit. Roll d6. Hit on `≤2` (or `≤3` with Super Submarines). On a hit, the declared target is **immediately removed following step 2** (see *Step 2 internal sequence*) — it does not fire in steps 3 or 4. On a miss, nothing happens. **If multiple subs declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **Defending sub Surprise Strike**: Roll d6. Hit on `≤1` (defense value 1). The **attacker chooses the casualty** from their own units; it is **immediately removed following step 2** (see *Step 2 internal sequence*) — it does not fire in steps 3 or 4.

**Step 2 internal sequence:** (1) Attacker declares all Target Select targets. (2) Attacker rolls Target Select dice — mark casualties, do not remove yet. (3) Defender rolls Surprise Strike dice — attacker picks those casualties. (4) All step-2 casualties are removed. A defending sub marked as a Target Select casualty in step (2) still rolls its Surprise Strike die in step (3).

**If a defending destroyer is in the battle:** attacking subs cannot Target Select or Submerge — they fire in steps 3/4 with normal attack value. **If an attacking destroyer is in the battle:** defending subs cannot Surprise Strike or Submerge — they fire in steps 3/4 with normal defense value.

**Subs that fired in step 2 cannot fire again in steps 3/4 the same round.**

**Step 2 (subs) repeats every combat round** as long as subs remain and no destroyer is on the opposing side.

### 4.2 Step 2 — Tactical Bombers (Attacking Only)

- Each attacking tactical bomber may declare Target Select. **Before any dice are rolled, the attacker declares the specific target for each tac bomber using Target Select.** Each tac bomber independently chooses its own target — multiple tac bombers may all declare the same unit, or each may declare a different valid unit.
- **Forbidden targets**: infantry, air units, naval transports, submarines.
- Target Select roll: hit on `≤3` (no Combined Arms bonus permitted). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens.
- **If multiple tac bombers declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **AAA fire (if any) negates Target Select** — if the AAA step happens, no Target Select.
- **Battleship/Cruiser built-in AAA also negates tac bomber Target Select.** Submarine Target Select is unaffected by AAA.
- Target Select for tac bombers is **first round only**. From round 2, they fire normally in step 3.
- A tac bomber that used Target Select **loses Combined Arms for the entire battle**.

### 4.3 Step 3 — Attacking Units Fire

- Roll one die (unless otherwise stated) per attacking unit with an attack value > 0 that did not act in step 2, or were removed as casualties in step 2 due to surprise strikes..
- Hit on `≤ attack value`.
- Defender assigns hits, moves casualties behind the casualty strip.
- Air units cannot hit subs unless a friendly destroyer is in the battle.
- Subs can never hit air units.
- Hits assigned to transports only if no other eligible target (exception: attacking sub Target Select).
- Defender places hit units behind casualty strip; they still fire in step 4 this round.

### 4.4 Step 4 — Defending Units Fire

- Roll one die (unless otherwise stated) per defending unit with a defense value > 0 (including units behind casualty strip).
- Hit on `≤ defense value`.
- Same restrictions: air can't hit subs without friendly destroyer; transports last.
- Attacker removes casualties immediately (these do NOT fire back this round — they already fired in step 3 if they were attackers).

### 4.5 Defenseless Transports
If the defender's only units in a sea battle are transports, AND the attacker has at least one unit capable of more than one round of combat, **all defending transports are auto-destroyed (with cargo). No dice rolled.**

### 4.6 Step 6 — Termination

Combat ends when either of these is true (checked in order):

- **Condition A — Loss of all units**: one or both sides have no units that can fire or retreat left.
  - The side with surviving combat units wins. Survivors return to the map space.
  - If both sides are wiped: territory remains in the defender's control (status quo).
  - Sea zone edge case: if both sides have only transports remaining, attacker's transports may stay or retreat.
- **Condition B — Attacker retreats** (defender can never retreat):
  - All attacking land/sea units retreat together to **one** adjacent friendly space from which **at least one** of them moved.
  - For sea retreats: destination must have been friendly at the **start of the turn**.
  - Air units retreat per their own rules (they will land in Noncombat Move).
  - Amphibious assault: **seaborne (transport-offloaded) land units CANNOT retreat.** Overland attackers retreat together as a group, only to a single space from which one of them originated.

### 4.7 Step 7 — Conclude Combat

- **Capture**: attacker takes control if they have ≥1 surviving land unit there.
- **Air units cannot capture** — air-only attackers cannot take a territory even if all defenders die.

---

## 5. Special Rules & Edge Cases

### 5.1 Air-Defense Fire

- **AAA units are defense-only.** They may not be included in an attacking force and do not fire during attacks.
- **AAA cannot fire in the defending units fire step** (A=0, D=1 only counts for being a casualty in normal combat — it's a "free hit absorber").

All air-defense fire (AAA units, battleship built-in AAA, cruiser built-in AAA) follows the same cap. When multiple sources are present in the same space, their shot pools **add together** into one combined volley, but the "fired upon at most once" cap applies to the **combined** volley.

> **Total dice rolled = min( Σ (units × shots-per-unit), number of attacking air units )**
> Each attacking air unit may be fired upon **at most once** across the entire air-defense volley, regardless of source.
> When the pool exceeds the cap, **the defender chooses which sources contribute the shots.**

| Source                | Shots per unit | Hit on | Notes                                                |
|-----------------------|----------------|--------|------------------------------------------------------|
| AAA unit              | 3              | ≤1     | ≤2 with Radar and A.T.C.                             |
| Battleship (built-in) | 3              | ≤1     | ≤2 with Super Battleships; must be fully operational |
| Cruiser (built-in)    | 1              | ≤1     | Not buffed by any tech                               |

**Why source choice matters:**
Different sources can have different hit thresholds depending on which techs are researched. The defender benefits from preferring the higher-hit-chance source. Examples:
- With **Super Battleships** but no Radar: battleship AAA hits ≤2, AAA units hit ≤1 → prefer battleship shots.
- With **Radar** but no Super BB: AAA units hit ≤2, battleship AAA hits ≤1 → prefer AAA-unit shots.
- With both: AAA units and battleship AAA both hit ≤2; cruisers still hit ≤1 → prefer either over cruisers.

**Worked examples — single source:**
- 5 fighters attack a territory with 2 AAA → `min(2×3, 5) = 5` shots.
- 5 fighters attack a territory with 1 AAA → `min(1×3, 5) = 3` shots.
- 5 fighters attack a sea zone with 2 cruisers → `min(2×1, 5) = 2` shots.
- 2 fighters attack a sea zone with 3 battleships → `min(3×3, 2) = 2` shots (capped by attacker count).

**Worked examples — mixed sources:**
- 4 fighters attack a sea zone with **1 battleship + 1 cruiser** → pool is `(1×3) + (1×1) = 4`; cap is `min(4, 4) = 4`. All 4 dice are rolled; no choice to make.
- 4 fighters attack a sea zone with **2 battleships + 2 cruisers**, no relevant techs → pool is `(2×3) + (2×1) = 8`; cap is `min(8, 4) = 4`. Defender chooses 4 shots from the pool — since all sources hit ≤1, the choice doesn't matter mechanically.
- 4 fighters attack a sea zone with **2 battleships + 2 cruisers**, defender has **Super Battleships** → pool is still 8, cap is still 4. Defender picks **4 battleship shots** (hit ≤2) over any cruiser shots (hit ≤1).
- 6 fighters attack a sea zone with **1 battleship (damaged) + 2 cruisers** → damaged BB contributes nothing; pool is `(2×1) = 2`; cap is `min(2, 6) = 2`. Only 2 dice rolled.

**Timing:** All air-defense fire happens **once, before the first round of combat**, as a single combined volley. Hits are removed immediately and those air units do not participate in the battle. The attacker chooses which air units are removed.

**Damaged battleships cannot fire AAA.** They contribute 0 shots to the volley (reflected in the "must be fully operational" note in the table above).

**Air-defense fire negates tac bomber Target Select.** If the air-defense volley fires before round 1, attacking tactical bombers may not use Target Select that battle.

### 5.2 Submarines — Full Behavior Summary

- **Cannot hit / be hit by air units** unless a friendly destroyer is in the battle.
- All special abilities (Target Select, Surprise Strike, Submerge, stealth, air-immunity) are **cancelled by an opposing-side destroyer in the same battle**: a defending destroyer cancels attacking subs' abilities; an attacking destroyer cancels defending subs' abilities.

### 5.3 Transports — Full Behavior Summary

- A=0, D=0, no combat value. Cannot fire in combat steps. Can be killed.
  - Strategic bombers can NOT auto-kill because they only fight 1 round.
- **Two transports paired** (Combined Arms): one transport gains D=1.
- **Chosen last as casualty** (exception: attacking sub Target Select can pick a transport).
- **Carry capacity**: 2 units max, where the second unit must be infantry. Valid configurations: 2 infantry, OR 1 infantry + 1 of {tank, mech infantry, artillery, AAA}. Cannot carry IC, air base, or naval base.

### 5.4 Destroyer (Anti-Sub)

- When in a battle, cancels enemy submarines': **Target Select, Surprise Strike, Submersible, and air-immunity**. (Super Submarines partially override — see §6.)

### 5.5 Shore Bombardment

Shore bombardment is available to battleships and cruisers during an **amphibious assault** only.

- **Fires in round 1, step 3** — alongside the attacking land units. Bombardment rolls are made at the same time as all other attacking-unit rolls in step 3.
- **Battleship** bombards at 4. **Cruiser** bombards at 3.
- **Super Battleships tech:** bombardment rolls 2 dice (one ≤4, one ≤2) — same mechanic as normal attack/defense.
- **Damaged capital ships cannot bombard** (0 shots contributed).
- **Round 1 only.** Bombardment does not repeat in subsequent rounds.
- **Bombarding ships are immune to casualties for the entire battle** — they cannot take hits and cannot be chosen as casualties. They do not participate in combat beyond contributing their bombardment roll.
- Casualty assignment from bombardment hits follows normal step 3 rules: defender assigns hits and places casualties behind the casualty strip; those units still fire in step 4 this round.

### 5.6 Strategic Bomber Air Transport (Reclassification)
At Combat Move or Noncombat Move, a strategic or heavy bomber may be reclassified:

| Reclassified Unit | Move | Attack | Defense | Capacity |
|---|---|---|---|---|
| Transport Plane (strat or heavy) | 6 | — | — | 2 infantry |
| Cargo Plane | 6 | — | — | 2 units: infantry, artillery, mech infantry, or tank (tech applies) |

- Subject to AAA fire — if hit, plane AND cargo destroyed.
- On defense, Air Transports are casualty-chosen-last.
- **Combat Drop**: bombers are allowed drop up to 6 units into a territory where other ground units are attacking. Dropped units cannot exceed the count of overland attackers. No retreat for dropped units. Once dropped, the transport is considered retreated and cannot be a casualty.

---

## 6. Research & Technology Effects

Tech is per-nation.

Below is how each tech mutates combat-relevant behavior:

### 6.1 Advanced Mechanized (Mech Infantry tech)
- No impact on cambat

### 6.2 Self-Propelled Artillery (Artillery tech)
- Artillery supports **2** infantry/mech infantry (instead of 1) per artillery unit for the A=2 buff.

### 6.3 Improved Transports
- Transport capacity: **3 ground units** (was 2). If carrying 3, **at least 1 must be infantry**.
- Transports now **defend at 1** (do not need to be paired). They are still taken as a casualty last.

### 6.4 Super Battleships
- Battleship rolls **2 dice on attack/defense**: one at hit-on-≤4, one at hit-on-≤2. **Applies to shore bombardment too** (so super-BB bombardment rolls 2 dice: one ≤4 and one ≤2).
- Battleships: **damage capacity 3** (3 hits to destroy); still fully operational at 1 hit (only the second & third hits represent damage states; rules say "considered fully operational with 1 hit").
- **Battleship built-in AAA fires at ≤2 (up from ≤1).** Battleships built-in AAA have 3 shots per battleship against attacking air units, fired before round - Each AAA shot from a Super Battleship now hits on a ≤2 instead of ≤1.
  - Standalone AAA units are *not* affected by this tech — their air-defense die remains ≤1 unless **Radar and A.T.C.** is researched (which separately raises AAA-unit and facility fire to ≤2).
  - A Super Battleship must still be fully operational (0 or 1 hit) to fire its AAA.
- **Damaged super-BB (2 hits taken):** still rolls two dice, but each hit threshold is halved (floor division) — **≤2 and ≤1** instead of ≤4 and ≤2. This applies to attack, defense, and shore bombardments. A damaged super-BB loses its AAA shots. Damage state is re-evaluated at the start of each round or after step 2 if the battleship was struck from a target selection or surprise strike.

### 6.5 Super Submarines
- Submarine attack: **3** (up from 2). Target Select hit on `≤3`.
- Destroyers detect only **3 submarines each** — i.e., a single destroyer cancels the special abilities (Target Select, Surprise Strike, Submerge) of only 3 enemy super-subs. Subs in the battle beyond that detection cap may still submerge, Strike, or Target Select normally.
- **Implementation:** count `cap = 3 × (number of enemy destroyers in the battle)`; cancel sub abilities for `min(cap, number of subs)` subs; the remainder retain full sub abilities.

### 6.6 Heavy Bombers
- Strategic bombers on attack: **2 dice at hit-on-≤3** (was 2@2).
- Bombers may be reclassified as **cargo plane** — see §5.6.

### 6.7 Jet Fighters
- Fighter attack: **4** (up from 3).

### 6.8 Super Carriers
- Carrier damage capacity: **3 hits** (still considered fully operational at 1 hit).
- **Damaged super-carrier (2 hits taken):** defends at D=1 (halved from 2); A=0 is unchanged. Damage state is re-evaluated at the start of each round or immediately after step 2 if the carrier was struck by a Target Select or Surprise Strike during that step.

### 6.9 Improved Shipyards
- Naval costs reduced: Submarine 5, Transport 5, Destroyer 7, Cruiser 10, Carrier 13, Battleship 16.

### 6.10 Heavy Tanks
- Tank attack: **4** (up from 3).

### 6.11 Radar and A.T.C.
- AAA units AAA fire: hit on `≤2` (up from `≤1`).

---

## 7. Combat-Time Targeting & Casualty Restrictions

Quick-reference for who can hit whom and casualty allocation:

| Source → Target | Allowed? |
|---|---|
| Air unit → submarine | **Only if** a friendly destroyer is in the battle |
| Submarine → air unit | **Never** (subs cannot hit air) |
| Any → transport | Only if no other eligible target (or attacker is a sub using Target Select) |
| Tac bomber Target Select → infantry / air / submarine / transport | **No** (forbidden targets) |
| Tac bomber Target Select with AAA/BB-AAA/CR-AAA having fired | **Target Select negated** |
| Bombardment (BB/CR) hits | Fire in round 1 step 3 alongside attackers; defender assigns hits to casualty strip; casualties still fire in step 4 |
| Capital ship single hit (undamaged) | NOT a kill; place damage chip; unit stays on board |
| Capital ship final hit (max HP reached) | Placed behind casualty strip; returns fire in step 4 at step-3-start values; still contributes to combined arms in step 4; if killed in step 2 → removed immediately, no return fire, cannot contribute to combined arms in steps 3–4 (other units may still pair with each other if eligible) |

**Casualty selection rule (general):** the side *receiving* the hits chooses which of its own units absorbs them, subject to targeting restrictions above. Capital ships taking their first hit are damaged, not removed.

---

## 8. Sequence Cheat-Sheet (For Implementation)

```
For each turn:
  1. Combat Move (declare amphibious assaults, escorts, demonstrate air landings)
  2. Conduct Combat:
  3. Noncombat Move (air units land, retreated bombers land, carriers reposition, etc.)
  4. Mobilize New Units
  5. Collect Income

For each General Combat round (a single contested space):
  1. Place units on Battle Board (adjust capital ship damage states now)
  2. Special Step:
       - AAA / built-in AAA fires (before round 1 ONLY, vs attacking air units)
       - Subs: Target Select (att) / Surprise Strike (def) / Submerge — defending destroyer negates att subs; attacking destroyer negates def subs
           - Target Select: attacker declares specific target before rolling; on miss nothing happens; excess hits on a destroyed target are lost, not reassigned
           - Surprise Strike: no pre-declaration; sub rolls, attacker picks casualty from their own units; casualty immediately removed
       - Att Tac Bombers: optional Target Select (round 1 only); negated by any AAA fire; declare specific target before rolling; excess hits lost, not reassigned
       - Apply step-2 casualties immediately
  3. Attacking units fire (units that didn't act in step 2; + shore bombardment in round 1 of amphibious assaults)
  4. Defending units fire (including units behind casualty strip)
  5. Remove defender's casualties
  6. Termination check:
       - All firers gone on one/both sides → end (winner = side with surviving units)
  7. If continuing, return to step 2; else Conclude Combat (capture, IPC adjust, etc.)
```

---

## 9. Edge Cases & Implementation Gotchas

- **Combined Arms pairings are re-evaluated at each time of firing** — step 3 (attackers) and step 4 (defenders) independently, and are not locked in from prior rounds or steps. Units behind the casualty strip are present at their time of firing and count for combined arms. For example, if an artillery is supporting an infantry and that infantry is killed, the artillery may support a different eligible infantry next time it fires. What units are paired may change within a round and round-to-round.
- **Strategic bombers only fight round 1** in general combat — after round 1, any surviving strategic bomber is compulsorily removed from the battle (lands in Noncombat Move) regardless of whether the attacker presses on. This is not a player choice. Only exception: if taken as a casualty in round 1, it is already gone.
- **Damaged capital ship attack/defense/move all halved** (floor division). Timing: damage state is re-evaluated at the start of each round and immediately after step 2 if struck by Target Select or Surprise Strike. An undamaged capital ship first-hit during main combat (steps 3–4) still fires at full values that round; any penalty(s) begins next round.
- **Super Battleship rolls two dice** (one ≤4, one ≤2). Damaged super-BB (2 hits) still rolls two dice at 50% values (one ≤2, one ≤1).
- **AAA only fires once per battle** — track a "has fired" flag per AAA source.
- **Step 2 (subs) repeats per round; step 2 (tac bombers) does NOT repeat (round 1 only).**
- **Subs that submerged before any dice were rolled** are NOT casualties and are NOT removed from play — they're set aside until the controller's next turn. Subs that submerge before any round of combat are no longer apart of the battle. They are immediately placed back onto the board.
- **Attacking sub Target Selects a defending sub that is Surprise Striking**: both roll. Target Select dice resolve first (step 2a) — if the defending sub is hit it is marked but not yet removed. The defending sub then rolls its Surprise Strike die (step 2b). All step-2 casualties are removed together after both phases resolve.
- **Attacking sub Target Select is the ONLY scenario where a transport is a valid first-choice target** despite "transport chosen last" — defending subs doing Surprise Strike still hit per attacker's casualty choice (normal rules).
- **Target Select is pre-declared, not a post-roll casualty pick.** The attacker names the specific target unit before any die is rolled. If the declared target is already gone when a later die resolves (e.g. two subs both named the same destroyer and the first hit killed it), the second hit is lost — it is NOT reassigned to another unit. Surprise Strike has no pre-declaration; the attacker picks the casualty reactively after the roll.
- **Auto-destroyed defenseless transports**: only triggers if attacker has at least one unit that can fight >1 round AND the only defenders are transports. Strategic bombers (1-round-only) do NOT count for this trigger.
- **Air units in amphibious assaults**: lock their pre-declared assignment (sea OR land), and they all land in Noncombat Move.
- **Bombing-raid escorts and interceptors are LOCKED for the turn** — once declared, neither can participate in any other battle that turn, including any other battle in the same territory, regardless of whether the air battle actually happens.
- **Escort fighters retreat after the air battle** and are NOT subject to facility AAA — only the bombers face facility AAA.
- **Carrier hit by sub Target Select**: gets a damage chip; still alive; cannot launch/recover until repaired.
- **Damaged battleship cannot bombard, cannot fire built-in AAA.**
- **Bombarding ships (battleships/cruisers) are immune to casualties for the entire battle** — they contribute their round 1 bombardment roll and cannot be hit or chosen as a casualty at any point. Do not place them on the Battle Board as valid casualty targets.
- **Cruiser+Battleship pair**: cruiser defends at 4 (battleship's own defense value is unchanged). Pairing is evaluated when defending units fire (step 4) — any battleship present at that moment, including one behind the casualty strip, counts for this buff. A battleship killed in step 2 is removed before step 4 and cannot contribute. A battleship on the casualty strip (killed during step 3) is still present at step 4 and can pair. The cruiser can pair with any battleship present when it fires; if no battleship is present, it defends at base 3.

---

## 10. Unit Quick-Reference Card

| Unit | Cost | A | D | M | HP | Notes |
|---|---|---|---|---|---|---|
| Infantry | 3 | 1/2* | 2 | 1 | 1 | *2 with artillery (attack only), 1:1 |
| Artillery | 4 | 2 | 2 | 1/2† | 1 | †M=2 with Self-Propelled Artillery |
| Mech Infantry | 4 | 1/2* | 2 | 2 | 1 | *2 with artillery; blitz with tank |
| Tank | 6/4‡ | 3/4‡ | 3 | 2 | 1 | ‡A=4 with Heavy Tanks |
| Cavalry | 4 | 2 | 1 | 2 | 1 | Blitz like tank |
| AAA | 5 | 0 | 1 | 0 cmb / 1 ncm | 1 | Air defense fire (≤1, or ≤2 w/ Radar) |
| Fighter | 10 | 3/4§ | 4 | 4 | 1 | §A=4 with Jet Fighters; carrier-capable |
| Tac Bomber | 11 | 3/4¶ | 3 | 4 | 1 | ¶A=4 with tank OR fighter; Target Select |
| Strat Bomber | 12 | 2@2 / 2@3# | 1 | 6 | 1 | #2@3 with Heavy Bombers; round 1 only |
| Submarine | 6 | 2/3** | 1 | 2 | 1 | **A=3 with Super Subs; Target Select |
| Transport | 7 | 0 | 0/1†† | 2 | 1 | ††D=1 paired (or w/ Improved Transports) |
| Destroyer | 8 | 2 | 2 | 2 | 1 | Anti-sub |
| Cruiser | 12 | 3 | 3/4‡‡ | 2 | 1 | ‡‡D=4 paired with battleship, even if the battleship is damaged |
| Carrier | 16 | 0 | 2 | 2 | 2 | Capital; carries 2 (3 w/ Super Carriers) |
| Battleship | 20 | 4 / 2 dice§§ | 4 / 2 dice§§ | 2 | 2 / 3§§ | §§Super Battleships: 2 dice (≤4 & ≤2)(still fully-functioning with 1 hit), HP 3; damaged BB: A/D 2, Mv 1; damaged SBB (2 hits): 2 dice (≤2 & ≤1), Mv 1 |

*Apply Improved Shipyards costs separately if tech is held: Sub 5, Transport 5, Destroyer 7, Cruiser 10, Carrier 13, BB 16.*

---

## 11. Source Ambiguities & Interpretation Notes

Items where the source rulebook is unclear, contradictory, or contains implementation-critical nuances worth flagging:

1. **AAA defense value vs AAA fire die under Super Battleships tech.** *(Resolved.)* The source rulebook ambiguously bundles "AAA defend at 2 up from 1" with Super Battleships, but AAA's listed tech upgrade is Radar and A.T.C. These are two independent techs that each raise a different source's air-defense hit threshold: **Super Battleships** raises battleship built-in AAA to `≤2`; **Radar and A.T.C.** raises AAA-unit fire to `≤2`. Neither tech affects the other's source. AAA's casualty-step defense value (D=1) is unchanged by either tech. (See §6.4 and §6.11.)

2. **"Damaged capital ship attacks/defends/moves at 50% capacity, rounded down."** The source says "50% capacity" and applies to attack, defense, and move. Implementation should floor-divide all three by 2. For a damaged super-battleship (2 dice, ≤4 and ≤2), halving each die produces ≤2 and ≤1. Note the timing carve-out: an undamaged capital ship first-hit during main combat (steps 3–4) fires back at full values that round; the 50% penalty starts next round. A capital ship first-hit in step 2 (Target Select / Surprise Strike) defends at halved values for steps 3–4 of that same round.

3. **Tactical bomber Target Select round-1-only AND forfeits Combined Arms for the entire battle.** This combination means: if you Target Select with a tac bomber in round 1, in rounds 2+ that tac bomber fires at base attack 3 only — it does NOT get the Combined Arms bonus to 4, even if paired with a fighter or tank for the whole battle. Track a "used Target Select this battle" flag per tac bomber.

4. **Defenseless transport auto-destroy** requires the attacker to have a unit that can fight more than 1 round. Strategic bombers (round-1 only) do NOT trigger this. A force of strat bombers vs lone transports must roll the bombing round normally.

5. **Capital ship "fully operational with 1 hit" under Super Battleships / Super Carriers tech.** The source explicitly says these are fully operational at 1 hit. Implementation: super-BB / super-Carrier with 1 hit fights at full values; the 50%-when-damaged rule kicks in only at 2 hits. (For a normal BB/Carrier, the 50% rule kicks in at 1 hit.)

6. **Cruiser combined arms (battleship + cruiser → cruiser D=4)** Each cruiser requires a battleship to pair with for this buff, and each battleship can only pair with one cruiser (1:1). Pairing is evaluated when defending units fire (step 4). A battleship on the casualty strip is present at step 4 and counts for this buff. A battleship killed in step 2 is not present at step 4 and cannot contribute.

7. **Submarine "Strike" terminology.** The source uses "Strike" and "Surprise Strike" for defending submarine attacks in step 2. "Target Select" is reserved for attacking submarines (and attacking tac bombers). They are functionally different: Target Select is **pre-declared** (the firer names a specific target before rolling; a miss wastes the shot; excess hits on the same target are lost); Surprise Strike has **no pre-declaration** (the sub rolls and the **attacker picks the casualty** from their own units, exactly like normal casualty selection, but applied immediately).

8. **Attacking sub Target Select can pick a transport.** This is the single exception to the "transports chosen last" rule. Other targeting (including air units hitting non-sub targets) still follows the "transport chosen last" rule.

9. **Target Select is a pre-declared commit, not a post-roll casualty pick.** For attacking submarines and attacking tactical bombers, the attacker names the specific target unit *before* any dice are rolled for that step. Each Target Selecting unit independently chooses its own target — multiple units may all declare the same unit, or each may declare a different valid unit. Consequence: if two units both declare the same target and the first hit destroys it, the second hit is wasted — it cannot be redirected to another unit. Surprise Strike does not work this way — it is a roll-then-casualty-pick mechanic where the attacker chooses which of their own units absorbs the hit.

10. **Air units in an amphibious assault**: must be pre-declared as sea-combat OR land-combat assigned. This assignment occurs before the attacker sees the defender's scramble decision; scrambling happens AFTER the attacker assigns its air. So the sequence is: attacker announces amphibious assault → attacker assigns each attacking air unit to sea or land → defender declares scrambles → resolve.

---

## 12. Casualty Selection Strategy

The objective is to win: have surviving units when the enemy does not. Casualty selection is the primary lever for maintaining combat power across rounds. Every hit absorbed is a decision — remove the unit whose loss costs the least expected damage output per remaining round while keeping your highest-value units alive to continue killing enemy units.

Two things determine the outcome: **keeping value alive** (preserve units that generate the most damage per round and anchor combined arms) and **vanquishing the enemy** (your surviving force must collectively deal enough hits to destroy the opposition before it destroys you). Casualty selection that feels conservative — hoarding cheap units and sacrificing expensive ones — is often wrong. Sacrifice whichever unit contributes the least to winning from this point forward.

### 12.1 Effective Combat Value

A unit's effective combat value is its **base dice contribution + combined arms it anchors or receives + enabler value** (e.g. a destroyer suppressing enemy submarines). This is the number to minimize when choosing a casualty.

When assigning a hit, ask: "If I remove this unit, how many fewer expected hits do I generate per round for the rest of the battle?" Sacrifice whichever unit minimizes that loss. This is not always the cheapest or lowest-stat unit — combined arms dependencies mean that removing one unit can silently degrade several others.

### 12.2 Combined Arms Preservation

When a pairing is active, each unit in the pair has a higher effective value than its base stats suggest. The full cost of losing a unit is: **its own base contribution + the combined arms bonus it anchors for others.**

**Land pairings (attack only):**

| Scenario | Lose the support unit (artillery) | Lose the supported unit (infantry/mech) |
|---|---|---|
| 1 arty + 1 inf | Arty (A=2) lost; infantry drops A=2→1. Total loss: 3 attack. | Infantry (A=2) lost; arty still at A=2. Total loss: 2 attack. Prefer this. |
| 1 arty + 3 inf (base only) | Arty supports 1 inf; losing arty costs A=2 (arty) + 1 bonus (inf drops). Total loss: 3 attack. | Losing the supported inf costs A=2; arty may now support a different inf. Net loss: 2 attack. Prefer this. |

**Key rule:** absorb hits with supported infantry before absorbing the supporting artillery, unless all remaining infantry are already supported by other artillery units. After the hit, re-evaluate which infantry the surviving artillery supports — pairings re-evaluate each firing step.

**Tactical bomber pairings (attack only):**

A tac bomber paired with a tank or fighter attacks at A=4 instead of A=3. Losing the pairing partner (tank or fighter) costs 1 expected attack per round for every remaining round. If the tac bomber already used Target Select, it has no combined arms for the rest of the battle — treat the tank/fighter at base value only when evaluating which to lose.

**Naval pairings (defense only):**

- **Battleship + Cruiser (cruiser D=4):** losing the battleship drops the cruiser from D=4 to D=3 for every remaining defense round. Compare: losing a cruiser costs 3–4 defense; losing the battleship costs 4 defense and also strips the cruiser buff. Prefer to absorb hits with the cruiser unless the battleship has clearly lower remaining value.
- **Transport pair (one defends at 1):** two transports are always last-chosen anyway. If only two remain and a hit must go to one, it does not matter which — both are chosen last and the pairing dissolves the following round either way.

### 12.3 Destroyer as an Enabler

A destroyer's base combat value (A=2, D=2) understates its strategic impact. While it is alive, all enemy submarine abilities — Target Select, Surprise Strike, Submerge, and air-immunity — are suppressed, and friendly air units can hit enemy submarines. Losing a destroyer potentially restores full sub capability to the opponent, compounding damage across every remaining round.

Absorb hits with other units before the destroyer unless no alternative exists. With Super Submarines, one destroyer covers only 3 subs — account for how many enemy subs remain undetected when evaluating whether the destroyer's enabler value is still active.

### 12.4 Capital Ships as Hit Sponges

Capital ships (HP > 1) do not always die when hit. Whether routing a hit through one is the right call depends entirely on the **absorption cost** — what combat effectiveness, if any, is lost.

**Undamaged super capital ships (0 hits) and super capital ships at 1 hit (still fully operational):** absorption cost = zero. The unit fights at full strength next round. These are the ideal hit sponges — route hits here freely. You absorb a hit while giving up nothing in combat output.

**Undamaged regular capital ships (0 hits):** absorption cost = stat degradation from the next round onward (A/D/M halved; BB additionally loses AAA and shore bombard). Only absorb here if the alternative casualty costs more expected damage output across remaining rounds.

**Damaged capital ships (at their final hit):** the unit is destroyed. Compare its remaining expected contribution (half-stat output × estimated rounds left) against the alternative casualty, and remove whichever costs less.

| Capital ship state | Absorption cost | Recommendation |
|---|---|---|
| Super BB/Carrier, 0 hits | None — fully operational after | Route hits here freely; prefer over destroying any other unit |
| Super BB, 1 hit (SuperBattleshipX) | None — still fully operational | Route hits here freely |
| Super Carrier, 1 hit (SuperAircraftCarrierX) | None — still fully operational | Route hits here freely |
| Regular BB/Carrier, 0 hits | Halved A/D/M next round; BB also loses AAA + bombard | Absorb only if cheaper than the alternative |
| Super BB, 2 hits / Regular BB, 1 hit (damaged) | Final hit — unit destroyed | Compare remaining output vs. alternative |
| Super Carrier, 2 hits / Regular Carrier, 1 hit (damaged) | Final hit — unit destroyed | Compare remaining output vs. alternative |

**Combat role matters when comparing free sponges.** Both an undamaged super carrier (A=0 attacking) and an undamaged super battleship (A=4, rolls 2 dice) absorb a hit for free, but the carrier sacrifices nothing on attack. Route hits through the carrier first; both survive fully operational and you preserve maximum attack output. On defense both contribute similarly (D=2), so either is equally valid.

### 12.5 Default Static Order of Loss

The default heuristic is a static ordered list of unit types — sacrifice first to last. It is a practical approximation of the principles above, used when no custom order is provided. The list is defined in `config.py:defaultOrderOfLoss` per (role × terrain).

**Land — Attacker:** `Strat → Inf → Mech → Cav → Art → Tank → Ftr → Tac`
- Strategic bombers go first — they fire only in round 1 and carry no value afterward.
- Infantry before mech and cavalry; artillery is protected because its combined-arms value lifts every paired infantry.
- Tanks and fighters last — highest sustained attack contribution.

**Land — Defender:** `AAA → Cav → Strat → Inf → Mech → Art → Tank → Tac → Ftr`
- AAA first — D=1, no offensive value.
- Cavalry before infantry — D=1 vs D=2; infantry's higher defensive value plus artillery pairing makes it worth protecting longer.
- Fighters last — D=4, highest defensive contribution.

**Sea — Attacker:** `Strat → sACC → sACCx → ACC → ACCx → sACCxx → Sub → Dtr → sBTSxx → BTSx → sBTS → sBTSx → BTS → Ftr → CSR → Tac`
- Carriers come before battleships: carriers have A=0 on attack and absorb hits for free while losing zero attack output. Undamaged super carriers (sACC, sACCx) are ideal first sacrifices.
- Damaged carriers and damaged battleships come before their undamaged counterparts — they contribute less and their final hit costs nothing further.
- Destroyers are in the mid-range — moderate attack value, important enabler value.
- Undamaged super battleships (sBTS, sBTSx) come late: they absorb for free but contribute A=4 (or 2 dice); route hits here only after exhausting cheaper options.
- Fighters, cruisers, and tactical bombers are protected last — highest sustained attack output.

**Sea — Defender:** `Sub → sACC → sACCx → ACC → ACCx → sACCxx → Dtr → sBTSxx → BTSx → sBTS → sBTSx → Tac → BTS → CSR → Ftr`
- Submarines first — D=1, lowest defensive contribution.
- Carriers (super then regular) next: D=2 but free absorption for undamaged super variants; loss costs minimal defense.
- Destroyers after carriers — enabler value warrants protection over low-D-value units.
- Fighters, battleships, and cruisers are protected last — D=4 each, highest defensive contribution.

Transports (`TPT`) are always appended last by `battle.py` regardless of the order returned here, per §5.3.