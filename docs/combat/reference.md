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
- **Timing carve-out for defense:** an already-damaged capital ship defends at halved value from the start of the round. An undamaged capital ship that takes its first hit during main combat (steps 3–4) still returns fire at full defense that round — the damage penalty applies from the next round onward.
- Damage state is re-evaluated at the **start of each combat round** and also **immediately after step 2** if the capital ship was struck by a Target Select or Surprise Strike during that step (so a capital ship first-hit in step 2 defends at halved value when main combat fires in steps 3–4).
- A damaged capital ship **loses its built-in AAA** and **cannot shore bombard**.
- A single hit on an undamaged capital ship places a damage chip — the unit is **not** moved behind the casualty strip and is **not** destroyed.

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

**Strategic bombers attacking in general combat fight only round 1, then must retreat (or be a casualty).**

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

Pairings are **1:1** and active only as specified (most are attack-only buffs). A given unit can only be paired with **one** other unit per combat round.

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
- **Submerge**: remove from Battle Board, place back in sea zone with a "Submerged" marker. Remains submerged until the controlling player's next turn. Cannot fire or take hits this combat. Cannot conduct convoy or lend-lease disruption while submerged.
- **Attacking sub Target Select**: The attacker **declares a specific target unit for each participating submarine before rolling** (any naval unit including transports). Roll d6. Hit on `≤2` (or `≤3` with Super Submarines). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens. **If multiple subs declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **Defending sub Surprise Strike**: Roll d6. Hit on `≤1` (defense value 1). The **attacker chooses the casualty** from their own units; it is **immediately removed** — it does not fire in steps 3 or 4.

**Step 2 internal sequence:** (1) Attacker declares all Target Select targets. (2) Attacker rolls Target Select dice — mark casualties, do not remove yet. (3) Defender rolls Surprise Strike dice — attacker picks those casualties. (4) All step-2 casualties are removed. A defending sub marked as a Target Select casualty in step (2) still rolls its Surprise Strike die in step (3).

**If a defending destroyer is in the battle:** attacking subs cannot Target Select or Submerge — they fire in steps 3/4 with normal attack value. **If an attacking destroyer is in the battle:** defending subs cannot Surprise Strike or Submerge — they fire in steps 3/4 with normal defense value.

**Subs that fired in step 2 cannot fire again in steps 3/4 the same round.**

**Step 2 (subs) repeats every combat round** as long as subs remain and no destroyer is on the opposing side.

### 4.2 Step 2 — Tactical Bombers (Attacking Only)

- Each attacking tactical bomber may declare Target Select. **Before any dice are rolled, the attacker declares the specific target for each tac bomber using Target Select.**
- **Forbidden targets**: infantry, air units, naval transports, submarines.
- Target Select roll: hit on `≤3` (no Combined Arms bonus permitted). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens.
- **If multiple tac bombers declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **AAA fire (if any) negates Target Select** — if the AAA step happens, no Target Select.
- **Battleship/Cruiser built-in AAA also negates tac bomber Target Select.** Submarine Target Select is unaffected by AAA.
- Target Select for tac bombers is **first round only**. From round 2, they fire normally in step 3.
- A tac bomber that used Target Select **loses Combined Arms for the entire battle**.

### 4.3 Step 3 — Attacking Units Fire

- Roll one die per attacking unit with an attack value > 0 that did not act in step 2.
- Hit on `≤ attack value`.
- Air units cannot hit subs unless a friendly destroyer is in the battle.
- Hits assigned to transports only if no other eligible target (exception: attacking sub Target Select).
- Defender places hit units behind casualty strip; they still fire in step 4 this round.

### 4.4 Step 4 — Defending Units Fire

- Roll one die per defending unit with a defense value > 0 (including units behind casualty strip).
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
- **Cannot attack alone** (must be accompanied by an attack-valued unit) — exception: amphibious assault from a friendly sea zone clear of enemy subs.
  - Strategic bombers can NOT auto-kill because they only fight 1 round.
- **Two transports paired** (Combined Arms): one transport gains D=1.
- **Chosen last as casualty** (exception: attacking sub Target Select can pick a transport).
- **Carry capacity**: 2 units max, where the second unit must be infantry. Valid configurations: 2 infantry, OR 1 infantry + 1 of {tank, mech infantry, artillery, AAA}. Cannot carry IC, air base, or naval base.

### 5.4 Destroyer (Anti-Sub)

- Cancels **Treat Hostile Sea Zones as Friendly**: an enemy sub entering a sea zone with a destroyer must stop movement. Combat may ensue.
- When in a battle, cancels enemy submarines': **Target Select, Surprise Strike, Submersible, and air-immunity**. (Super Submarines partially override — see §6.)
- Destroyers from a power friendly to attacker but NOT in the battle do not enable these effects.

### 5.5 Strategic Bomber Air Transport (Reclassification)
At Combat Move or Noncombat Move, a strategic or heavy bomber may be reclassified:

| Reclassified Unit | Move | Attack | Defense | Capacity |
|---|---|---|---|---|
| Transport Plane (strat or heavy) | 6 | — | — | 2 infantry |
| Cargo Plane (heavy only) | 6 | — | — | 2 units: infantry, artillery, mech infantry, or tank (tech applies) |

- Transported units must start in the same territory as the plane.
- Subject to AAA fire — if hit, plane AND cargo destroyed.
- On defense, Air Transports are casualty-chosen-last.
- **Combat Drop**: bombers are allowed drop up to 6 units into a territory where other ground units are attacking. Dropped units cannot exceed the count of overland attackers. No retreat for dropped units. Once dropped, the transport is considered retreated and cannot be a casualty.

---

## 6. Research & Technology Effects

Tech is per-nation.

Below is how each tech mutates combat-relevant behavior:

### 6.1 Advanced Mechanized (Mech Infantry tech)
- Mech Infantry may carry 2 infantry **or** tow 1 artillery during movement phases.
- Mech Infantry can **blitz without a tank**.
- Loaded mech infantry count as 1 unit when railing from an IC.
- **Cannot** load carried/towed units onto a transport.

### 6.2 Self-Propelled Artillery (Artillery tech)
- Artillery supports **2** infantry/mech infantry (instead of 1) per artillery unit for the A=2 buff.
- Artillery movement: **2** (up from 1).

### 6.3 Improved Transports
- Transport capacity: **3 ground units** (was 2). If carrying 3, **at least 1 must be infantry**.
- Transports now **defend at 1**.

### 6.4 Super Battleships
- Battleship rolls **2 dice on attack/defense**: one at hit-on-≤4, one at hit-on-≤2. **Applies to shore bombardment too** (so super-BB bombardment rolls 2 dice: one ≤4 and one ≤2).
- Battleships: **damage capacity 3** (3 hits to destroy); still fully operational at 1 hit (only the second & third hits represent damage states; rules say "considered fully operational with 1 hit").
- **Battleship built-in AAA fires at ≤2 (up from ≤1).** Battleships built-in AAA have 3 shots per battleship against attacking air units, fired before round 1. Each AAA shot from a Super Battleship now hits on a ≤2 instead of ≤1.
  - Standalone AAA units are *not* affected by this tech — their air-defense die remains ≤1 unless **Radar and A.T.C.** is researched (which separately raises AAA-unit and facility fire to ≤2).
  - A Super Battleship must still be fully operational (0 or 1 hit) to fire its AAA.
- **Damaged super-BB (2+ hits taken):** still rolls two dice, but each hit threshold is halved (floor division) — **≤2 and ≤1** instead of ≤4 and ≤2. Defense is unchanged. Move value is also halved. A damaged super-BB loses its AAA shots. Damage state is re-evaluated at the start of each round or after step 2 if the battleship was struck from a target selection or surprise strike.

### 6.5 Super Submarines
- Submarine attack: **3** (up from 2). Target Select hit on `≤3`.
- Destroyers detect only **3 submarines each** — i.e., a single destroyer cancels the special abilities (Target Select, Surprise Strike, Submerge) of only 3 enemy super-subs. Subs in the battle beyond that detection cap may still submerge, Strike, or Target Select normally.
- **Implementation:** count `cap = 3 × (number of enemy destroyers in the battle)`; cancel sub abilities for `min(cap, number of subs)` subs; the remainder retain full sub abilities.

### 6.6 Heavy Bombers
- Strategic bombers on attack: **2 dice at hit-on-≤3** (was 2@2).
- Strategic bombing raid roll: **2 dice** (sum + 2 per die for damage).
- Bombers may be reclassified as **cargo plane** (heavy only) — see §5.5.

### 6.7 Jet Fighters
- Fighter attack: **4** (up from 3).
- Fighter escort/intercept value: **2** (up from 1) in the special bombing-raid air battle.

### 6.8 Super Carriers
- Carrier capacity: **3 air units** (up from 2).
- Carrier damage capacity: **3 hits** (still considered fully operational at 1 hit).
- **Damaged super-carrier (2+ hits taken):** defends at D=1 (halved from 2), moves at M=1 (halved from 2); A=0 is unchanged. The carrier still cannot launch or recover air units while damaged. Planes on a damaged defending super-carrier become cargo and cannot fight. Damage state is re-evaluated at the start of each round or immediately after step 2 if the carrier was struck by a Target Select or Surprise Strike during that step.

### 6.9 Improved Shipyards
- Naval costs reduced: Submarine 5, Transport 5, Destroyer 7, Cruiser 10, Carrier 13, Battleship 16.
- Minor industrial complexes may now build capital ships.

### 6.10 Heavy Tanks
- Tank attack: **4** (up from 3).

### 6.11 Radar and A.T.C.
- AAA units AND facility AAA fire: hit on `≤2` (up from `≤1`).
- Air bases scramble up to **6** (up to 3 may be allied), up from 3.
- Air base movement bonus: **+2** to air movement, up from +1.

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
| Bombardment (BB/CR) hits | Go behind casualty strip; targets still defend in step 3 of amphibious land combat |
| Capital ship single hit (undamaged) | NOT a kill; place damage chip; unit stays on board |

**Casualty selection rule (general):** the side *receiving* the hits chooses which of its own units absorbs them, subject to targeting restrictions above. Capital ships taking their first hit are damaged, not removed.

---

## 8. Sequence Cheat-Sheet (For Implementation)

```
For each turn:
  1. Purchase & Repair
  2. Combat Move (declare amphibious assaults, escorts, demonstrate air landings)
  3. Defender declares interceptors & scramblers (between Combat Move and Conduct Combat)
  4. Conduct Combat:
       a. Resolve all Strategic/Tactical Bombing Raids:
            - Air battle (if interceptors), 1 round, all air @ A=1/D=1
            - Facility AAA fire (1 die per directly attacking bomber, hit ≤1)
            - Bombing damage (1d6 + 2 for strat/heavy, no +2 for tac; heavy rolls 2 dice)
            - Apply up to facility cap
       b. Resolve all Naval Blockades (General Combat)
       c. Resolve all Amphibious Assaults:
            - Sea combat (General Combat)
            - BB/CR bombardment (one die per ship, hit ≤4 BB or ≤3 CR, capped by offloaded unit count, hits go behind casualty strip)
            - Land combat (General Combat; seaborne units cannot retreat)
       d. Resolve all remaining General Combat (land & sea)
  5. Noncombat Move (air units land, retreated bombers land, carriers reposition, etc.)
  6. Mobilize New Units
  7. Collect Income

For each General Combat round (a single contested space):
  1. Place units on Battle Board (adjust capital ship damage states now)
  2. Special Step:
       - Subs: Target Select (att) / Surprise Strike (def) / Submerge — defending destroyer negates att subs; attacking destroyer negates def subs
           - Target Select: attacker declares specific target before rolling; on miss nothing happens; excess hits on a destroyed target are lost, not reassigned
           - Surprise Strike: no pre-declaration; sub rolls, attacker picks casualty from their own units; casualty immediately removed
       - Att Tac Bombers: optional Target Select (round 1 only); negated by any AAA fire; declare specific target before rolling; excess hits lost, not reassigned
       - AAA / built-in AAA fires (before round 1 ONLY, vs attacking air units)
       - Apply step-2 casualties immediately
  3. Attacking units fire (units that didn't act in step 2)
  4. Defending units fire (including units behind casualty strip)
  5. Remove defender's casualties
  6. Termination check:
       - All firers gone on one/both sides → end (winner = side with surviving units)
       - Attacker may retreat all eligible units together to one origin space
  7. If continuing, return to step 2; else Conclude Combat (capture, IPC adjust, etc.)
```

---

## 9. Edge Cases & Implementation Gotchas

- **Allied units in the contested sea zone do not fight.** If you attack into a sea zone that already contains friendly allied units, those units are NOT placed on the Battle Board — they take no hits and fire no shots. They stay on the map, out of play, for the duration of that battle.
- **Submarines and transports are "invisible" for sea-zone status checks.** When determining whether a sea zone is "hostile" (for movement, loading/offloading, retreat destinations), enemy subs and transports are ignored. A sea zone with only enemy subs and/or transports is treated as friendly for movement/loading purposes.
- **Combined Arms is 1:1 and re-assignable across phases** but only one pairing per unit per combat round. Implementation should track pairings as a per-round assignment.
- **Strategic bombers only fight round 1** in general combat — track and force retreat (or casualty) after round 1.
- **Damaged capital ship attack/defense/move all halved** (floor division). Timing: damage state is re-evaluated at the start of each round and immediately after step 2 if struck by Target Select or Surprise Strike. An undamaged capital ship first-hit during main combat (steps 3–4) still fires at full values that round; penalty begins next round.
- **Super Battleship rolls two dice** (one ≤4, one ≤2). Damaged super-BB still rolls two dice at 50% values (one ≤2, one ≤1).
- **AAA only fires once per battle** — track a "has fired" flag per AAA source.
- **Step 2 (subs) repeats per round; step 2 (tac bombers) does NOT repeat (round 1 only).**
- **Submerged subs**: stay in the sea zone with a marker; surface at owner's next turn (Repair Units phase). They cannot disrupt convoy/lend-lease while submerged.
- **Subs that submerged before any dice were rolled** are NOT casualties and are NOT removed from play — they're set aside until the controller's next turn.
- **Attacking sub Target Selects a defending sub that is Surprise Striking**: both roll. Target Select dice resolve first (step 2a) — if the defending sub is hit it is marked but not yet removed. The defending sub then rolls its Surprise Strike die (step 2b). All step-2 casualties are removed together after both phases resolve.
- **Attacking sub Target Select is the ONLY scenario where a transport is a valid first-choice target** despite "transport chosen last" — defending subs doing Surprise Strike still hit per attacker's casualty choice (normal rules).
- **Target Select is pre-declared, not a post-roll casualty pick.** The attacker names the specific target unit before any die is rolled. If the declared target is already gone when a later die resolves (e.g. two subs both named the same destroyer and the first hit killed it), the second hit is lost — it is NOT reassigned to another unit. Surprise Strike has no pre-declaration; the attacker picks the casualty reactively after the roll.
- **Auto-destroyed defenseless transports**: only triggers if attacker has at least one unit that can fight >1 round AND the only defenders are transports. Strategic bombers (1-round-only) do NOT count for this trigger.
- **Lone transports / sub-only sea zones**: don't block movement. But a sea unit that "auto-destroys" a lone transport must commit to a sea-combat resolution (one round) and then can no longer freely pass.
- **Air units in amphibious assaults**: lock their pre-declared assignment (sea OR land), and they all land in Noncombat Move.
- **Bombing-raid escorts and interceptors are LOCKED for the turn** — once declared, neither can participate in any other battle that turn, including any other battle in the same territory, regardless of whether the air battle actually happens.
- **Escort fighters retreat after the air battle** and are NOT subject to facility AAA — only the bombers face facility AAA.
- **Facility AAA fires per facility, per directly-assigned bomber.** Bombers assigned to the IC are only shot at by the IC's AAA, not the naval base's AAA. The attacker must declare per-bomber target facility.
- **Tactical bombers cannot strategic-bomb industrial complexes** — only air bases and naval bases.
- **Carrier hit by sub Target Select**: gets a damage chip; still alive; cannot launch/recover until repaired.
- **Damaged battleship cannot bombard, cannot fire built-in AAA.**
- **Cruiser+Battleship pair**: cruiser defends at 4 (battleship's defense unchanged at 4 already).
- **Liberation exceptions**: Dutch territories and French Indo-China captured from Japan are NOT liberated. Other liberations follow the roundel indicator (left = optional, right = mandatory return).
- **Capital re-capture**: if a capital changes hands a second time (e.g. Allies → Axis → Allies again), its unspent IPCs are forfeited to the bank, NOT transferred to the latest captor.
- **Captured Major IC becomes a Minor IC**, and existing damage is transferred down — but capped at the Minor IC's strategic-bomber cap (10).
- **Defending carrier loses planes when destroyed/damaged**: surviving defending air must (in priority) land on the same carrier if undamaged, then another friendly carrier in same sea zone, then move 1 space to a friendly carrier/territory, else die. Resolved in Noncombat Move before the acting player's regular noncombat moves.
- **Defending fighters on a damaged carrier cannot defend at all** — they become cargo and die if the carrier dies.

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
| Cruiser | 12 | 3 | 3/4‡‡ | 2 | 1 | ‡‡D=4 paired with battleship |
| Carrier | 16 | 0 | 2 | 2 | 2 | Capital; carries 2 (3 w/ Super Carriers) |
| Battleship | 20 | 4 / 2 dice§§ | 4 / 2 dice§§ | 2 | 2 / 3§§ | §§Super Battleships: 2 dice (≤4 & ≤2), HP 3 |

*Apply Improved Shipyards costs separately if tech is held: Sub 5, Transport 5, Destroyer 7, Cruiser 10, Carrier 13, BB 16.*

---

## 11. Source Ambiguities & Interpretation Notes

Items where the source rulebook is unclear, contradictory, or contains implementation-critical nuances worth flagging:

1. **AAA defense value vs AAA fire die under Super Battleships tech.** Source says "AAA defend at 2 up from 1" bundled with Super BBs, but AAA's listed tech upgrade is Radar and A.T.C. The most consistent reading is that both techs independently raise AAA *fire* hit-on-die to `≤2`. AAA's casualty-step defense value (D=1) should be treated as unchanged. (See §6.4.)

2. **"Damaged capital ship attacks/defends/moves at 50% capacity, rounded down."** The source says "50% capacity" and applies to attack, defense, and move. Implementation should floor-divide all three by 2. For a damaged super-battleship (2 dice, ≤4 and ≤2), halving each die produces ≤2 and ≤1. Note the timing carve-out: an undamaged capital ship first-hit during main combat (steps 3–4) fires back at full values that round; the 50% penalty starts next round. A capital ship first-hit in step 2 (Target Select / Surprise Strike) defends at halved values for steps 3–4 of that same round.

3. **Tactical bomber Target Select round-1-only AND forfeits Combined Arms for the entire battle.** This combination means: if you Target Select with a tac bomber in round 1, in rounds 2+ that tac bomber fires at base attack 3 only — it does NOT get the Combined Arms bonus to 4, even if paired with a fighter or tank for the whole battle. Track a "used Target Select this battle" flag per tac bomber.

4. **Sub-only or transport-only sea zone status.** When checking whether a sea zone is "hostile" for movement, loading, retreat destinations, etc., enemy submarines and enemy transports are *ignored*. But they are still units — they can still be attacked, and a paired-transport defender (D=1) DOES block enemy movement.

5. **Defenseless transport auto-destroy** requires the attacker to have a unit that can fight more than 1 round. Strategic bombers (round-1 only) do NOT trigger this. A force of strat bombers vs lone transports must roll the bombing round normally.

6. **Capital ship "fully operational with 1 hit" under Super Battleships / Super Carriers tech.** The source explicitly says these are fully operational at 1 hit. Implementation: super-BB / super-Carrier with 1 hit fights at full values; the 50%-when-damaged rule kicks in only at 2 hits. (For a normal BB/Carrier, the 50% rule kicks in at 1 hit.)

7. **Cruiser combined arms (battleship + cruiser → cruiser D=4) is listed twice** in the source under the cruiser profile. This is a source duplication, not an indication of stacking. A single cruiser pairs with at most one battleship for this defense buff.

8. **Bombing-raid damage range:**
   - Tactical bomber: 1d6 per bomber → 1-6 damage per bomber.
   - Strategic bomber (normal): 1d6+2 per bomber → 3-8 damage per bomber.
   - Strategic bomber (Heavy Bombers tech): 2d6+2 each die (sum) per bomber → 6-16 damage per bomber. (Each die individually gets +2 then summed.)

9. **Submarine "Strike" terminology.** The source uses "Strike" and "Surprise Strike" for defending submarine attacks in step 2. "Target Select" is reserved for attacking submarines (and attacking tac bombers). They are functionally different: Target Select is **pre-declared** (the firer names a specific target before rolling; a miss wastes the shot; excess hits on the same target are lost); Surprise Strike has **no pre-declaration** (the sub rolls and the **attacker picks the casualty** from their own units, exactly like normal casualty selection, but applied immediately).

10. **Attacking sub Target Select can pick a transport.** This is the single exception to the "transports chosen last" rule. Other targeting (including air units hitting non-sub targets) still follows the "transport chosen last" rule.

11. **Target Select is a pre-declared commit, not a post-roll casualty pick.** For attacking submarines and attacking tactical bombers, the attacker names the specific target unit *before* any dice are rolled for that step. Consequence: if two units both declare the same target and the first hit destroys it, the second hit is wasted — it cannot be redirected to another unit. Surprise Strike does not work this way — it is a roll-then-casualty-pick mechanic where the attacker chooses which of their own units absorbs the hit.

12. **Air units in an amphibious assault**: must be pre-declared as sea-combat OR land-combat assigned. The source does not say this assignment occurs before the attacker sees the defender's scramble decision, but it does say scrambling happens AFTER the attacker assigns its air. So the sequence is: attacker announces amphibious assault → attacker assigns each attacking air unit to sea or land → defender declares scrambles → resolve.

13. **Carrier "must move to land otherwise-stranded planes" rule** only applies if the carrier did not combat-move and did not participate in combat. A carrier already used in combat is not obligated.