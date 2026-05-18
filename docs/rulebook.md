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
- A damaged capital ship (1 hit applied) **attacks at 50% capacity**, rounded down. Example: a damaged battleship attacks at `2` instead of `4`.
- **When a defending capital ship takes 1 hit during a round of combat, it returns fire at full value.** Damaged defending capital ship units adjust their combat (defending) value at the beginning of each round of combat, not in the middle of the round.
- Damage is applied/adjusted at the **start of each combat round**, never mid-round.
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
| Aircraft Carrier | 16 | 0 | 2 | 2 | 2 | 2 air units | Super Carriers | Capital ship; carries fighters + tactical bombers; damaged carrier cannot launch/recover |
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
2. **Target Select / Surprise Strike / Submerge** — submarines and attacking tactical bombers act *before* normal combat rolls. Casualties from step 2 are removed immediately and do **not** fire in steps 3 or 4.
3. **Attacking units fire.** Roll one die per attacking unit that did not act in step 2. Defender places hits behind casualty strip.
4. **Defending units fire.** Roll one die per defending unit (including those behind casualty strip) that did not act in step 2. Attacker removes casualties immediately.
5. **Remove defender's casualties** (from the casualty strip).
6. **Press attack or retreat** — see termination conditions below.
7. **Conclude combat** (run once when the battle ends).

### 4.1 Step 2 — Submarines

**Trigger:** A submarine is in the battle AND no enemy destroyer is in the same battle.

- **Attacking subs** may: Target Select OR Submerge.
- **Defending subs** may: Surprise Strike OR Submerge.
- Decision is made **before any dice are rolled**. **Attacker decides first.**
- **Submerge**: remove from Battle Board, place back in sea zone with a "Submerged" marker. Remains submerged until the controlling player's next turn. Cannot fire or take hits this combat. Cannot conduct convoy or lend-lease disruption while submerged.
- **Attacking sub Target Select**: The attacker **declares a specific target unit for each participating submarine before rolling** (any naval unit including transports). Roll d6. Hit on `≤2` (or `≤3` with Super Submarines). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens. **If multiple subs declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **Defending sub Surprise Strike**: The defender **declares a specific target unit before rolling** (any non-air naval unit; transports chosen last). Roll d6. Hit on `≤1` (defense value 1). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens. **If multiple defending subs declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**

**If an enemy destroyer is in the battle:** subs cannot Target Select, Surprise Strike, or Submerge. They fire in steps 3/4 with their normal A/D.

**Subs that fired in step 2 cannot fire again in steps 3/4 the same round.**

**Step 2 (subs) repeats every combat round** as long as subs remain and no destroyer is on the opposing side.

### 4.2 Step 2 — Tactical Bombers (Attacking Only)

- Each attacking tactical bomber may declare Target Select. **Before any dice are rolled, the attacker declares the specific target for each tac bomber using Target Select.**
- **Forbidden targets**: infantry, air units, naval transports, submarines.
- Target Select roll: hit on `≤3` (no Combined Arms bonus permitted). On a hit, the declared target is **immediately removed** — it does not fire in steps 3 or 4. On a miss, nothing happens.
- **If multiple tac bombers declared the same target and that target is already removed when a later die resolves, the hit is lost — not reassigned.**
- **AAA fire (if any) negates Target Select** — if the AAA step happens, no Target Select.
- **Battleship/Cruiser built-in AAA also negates Target Select** for naval Target Select use.
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

## 5. Special Combat Types

### 5.1 Strategic and Tactical Bombing Raids

Direct attacks on **facilities** (Industrial Complex, Air Base, Naval Base). Tactical bombers may NOT attack industrial complexes — only air/naval bases. Strategic and heavy bombers may attack all three. A territory's IC and bases may be bombed in the same raid.

**Participants:**
- Attacker: strategic bombers, heavy bombers (tech), tactical bombers (air/naval bases only). May bring fighter **escorts** from any territory/sea zone (range permitting).
  - **Escorts are locked**: once declared, an escort cannot participate in any other battle that turn, including any other battle in the target territory, **regardless of whether interceptors are declared**.
- Defender: any number of **fighters based in the bombed territory** may declare as **interceptors**. Decision is made after attacker's Combat Move, before Conduct Combat. Strategic bombers cannot intercept.
  - **Interceptors are locked**: declared interceptors cannot participate in any other battle that turn (including a battle in the same territory). They must remain in their original territory after the air battle.

**Multi-target raids:** If a territory has more than one target (e.g. an IC plus a naval base), the attacker **divides bombers into groups, assigning each group to a specific facility**. Tactical bombers cannot be assigned to industrial complexes.

**Sequence:**
1. **Air battle (if interceptors declared, 1 round only)**:
   - Participants: attacking bombers + escort fighters vs defending interceptor fighters.
   - **All air units roll at A=1 and D=1 in this air battle** (overrides normal values).
   - Standard simultaneous fire, one round.
   - Surviving escorts are considered retreated — they do not face AAA and do not participate further, but they remain in the territory until Noncombat Move. They are NOT subject to AAA from the targeted facility.
   - Surviving interceptors stay in the territory; if territory is captured later, they may move one space to a friendly territory or carrier, otherwise lost.
2. **Facility AAA fire**: each targeted facility rolls **one die per bomber directly attacking that specific facility** at hit on `≤1`. Hits are bombers (attacker chooses which). Each facility's AAA fires independently, only against bombers assigned to it.
   - **Note**: AAA *units* in the territory do NOT fire at bombing raids — only facility AAA does. AAA units protect combat units in general combat instead.
3. **Bombing damage**:
   - Each surviving bomber rolls 1d6 (heavy bombers roll **2 dice**).
   - **Strategic/heavy bombers**: add `+2` to each die for damage.
   - **Tactical bombers**: do **not** add +2.
   - Total damage = sum of (modified) dice. Place damage chips under target up to its cap.

**Facility Damage Caps:**

| Facility | Tactical | Strategic | Heavy |
|---|---|---|---|
| Minor Industrial | 0 (cannot bomb) | 10 | 15 |
| Major Industrial | 0 (cannot bomb) | 20 | 25 |
| Air Base | 6 | 10 | 15 |
| Naval Base | 6 | 10 | 15 |

Damage beyond cap is not applied. Damage is repaired in the controller's Purchase and Repair phase (cost = 1 IPC per damage point).

**A bomber that conducts a bombing raid cannot participate in any other combat that turn** and retreats during Noncombat Move.

### 5.2 Naval Blockades

Resolved before Amphibious Assaults. Uses standard General Combat rules.

### 5.3 Amphibious Assaults

Order within each assault:

**Step 1 — Sea Combat (if any defending surface warships and/or scrambled air units):**
- Standard General Combat in the sea zone.
- If the defender has only subs and/or transports, attacker may choose to ignore them or fight.
- Attacking the subs/transports here **disqualifies** the attacking battleships/cruisers used from bombarding in step 2.

**Step 2 — Battleship & Cruiser Bombardment:**
- Only battleships/cruisers that did **not** participate in the sea combat may bombard.
- One battleship or cruiser may bombard for **each land unit being offloaded from transports** in that coastal territory. The number of bombardment dice may not exceed the number of offloading units.
- Multiple territories assaulted? Split bombarding ships as desired, respecting the per-target unit cap.
- Battleship bombardment: hit on `≤4`. Cruiser bombardment: hit on `≤3`.
- **Damaged battleships cannot bombard.**
- Hits go behind the defender's casualty strip — the hit units **still defend in step 3** before being removed.
- Each battleship/cruiser bombards only one territory per turn.

**Step 3 — Land Combat:**
- After sea is clear (or transports/submerged subs only remain) and at least one attacking land unit committed, move all attacking + defending land/air to battle strip.
- Standard General Combat.
- **Seaborne (offloaded) land units cannot retreat.** Overland units and air units may retreat together as a group between rounds (overland to one originating space; air units retreat per air retreat rules and land in Noncombat).
- If no land/air attackers survive, assault ends.
- If no land units survived sea combat (or all sea attackers retreated), other designated land/air attackers must still fight **one round of land combat** before being allowed to retreat.

**Air units in amphibious assaults:**
- Each attacking air unit must be **pre-declared** as assigned to either the sea combat OR the land combat. Cannot do both. Cannot change.
- Scrambled defending air units are placed after the assault is announced and the attacker's air assignments are declared.
- Defending air based in territory cannot participate in the sea combat (exception: scrambled fighters/tac bombers from an operative air base on a coastal/island territory may scramble into the adjacent sea zone).
- Strategic bombers cannot scramble.
- After the assault, all attacking air units stay in place until Noncombat Move (then land).

### 5.4 Scramble (Air Base ability)
Fighters and tactical bombers in a territory with an operative air base may scramble to defend an **adjacent sea zone** when it is attacked. Base ability: up to 3 scrambling air units (max 3, up to 3 may be allied). With **Radar and A.T.C.** tech, this becomes up to 6 (still up to 3 allied).

---

## 6. Special Rules & Edge Cases

### 6.1 AAA Units (in normal combat, not bombing)

- AAA fires **once, before round 1** of combat in the territory it's in, when **attacked by air units**.
- **Shots = min(3 × number of AAA units, number of attacking air units).** Each attacking air unit can be fired upon at most once.
- Each shot: hit on `≤1` (base). With **Radar and A.T.C. tech**: hit on `≤2`.
- Hits are removed immediately and do not participate further in the battle. Attacker picks which air units die.
- **AAA cannot fire in defending units fire step** (A=0, D=1 only counts for being a casualty in normal combat — it's a "free hit absorber").

### 6.2 Battleship & Cruiser Built-in AAA

- Same mechanic as AAA units, but per-ship:
  - Battleship: **up to 3 shots** per battleship (max = min(3 × #BB, #attacking air)). Hit on `≤1`.
  - Cruiser: **up to 1 shot** per cruiser (max = min(1 × #CR, #attacking air)). Hit on `≤1`.
- Fires before round 1 of combat against attacking air.
- Subject to fly-over rules in the same way as land AAA.
- **Damaged battleships cannot fire AAA.**
- **This AAA negates Target Select** by tactical bombers.

### 6.3 Submarines — Full Behavior Summary

- **Treat Hostile Sea Zones as Friendly**: subs ignore enemy units when moving (unless an enemy destroyer is present, which forces stop).
- **Does Not Block Enemy Movement**: a sea zone with ONLY enemy subs does not stop a non-sub unit's movement. Entering a sub-only sea zone, the moving player may choose to attack or not.
- **Cannot hit / be hit by air units** unless a friendly destroyer is in the battle.
- All special abilities (Target Select, Surprise Strike, Submerge, stealth, air-immunity) are **cancelled by an enemy destroyer in the same battle**.
- Defending destroyers belonging to a power *friendly to the attacker but not in the battle* do NOT cancel sub abilities.

### 6.4 Transports — Full Behavior Summary

- A=0, D=0, no combat value. Cannot fire in combat steps. Can be killed.
- **Cannot attack alone** (must be accompanied by an attack-valued unit) — exception: amphibious assault from a friendly sea zone clear of enemy subs.
- **Does Not Block Enemy Movement** when alone: a sea zone with only one enemy transport doesn't stop movement. Sea/air units with an attack value that can fight >1 round and end combat move there **automatically destroy** the transport (counts as a sea combat).
  - Exception: an air unit can't auto-kill (it can only attack 1 round? — actually air units do attack multiple rounds in general combat; the rule applies to "air or sea units with an attack value which can attack more than a single round". Strategic bombers can NOT auto-kill because they only fight 1 round. Fighters/tac bombers CAN.)
- **Two transports paired** (Combined Arms): one transport gains D=1 and **the pair DOES block enemy movement**.
- A **lone Improved Transport** (with tech) does NOT block enemy movement — still needs pairing.
- **Chosen last as casualty** (exception: attacking sub Target Select can pick a transport).
- **Carry capacity**: 2 units max, where the second unit must be infantry. Valid configurations: 2 infantry, OR 1 infantry + 1 of {tank, mech infantry, artillery, AAA}. Cannot carry IC, air base, or naval base.
- **Loading and offloading rules**:
  - Loading/offloading consumes a land unit's entire move that turn.
  - Transport can load before/during/after its move, in friendly sea zones.
  - May load → move 1 → load more → move 1 → offload. Or stay at sea with cargo (if cargo was loaded previously, or this turn in Noncombat, or for a retreated amphibious assault).
  - Cannot load or offload in a hostile sea zone (subs/transports are ignored when determining "hostile").
  - **One offload destination per turn** (one territory).
  - Cannot offload after retreating.
  - "Bridging" allowed: load and offload in same sea zone without moving.
  - Friendly powers' units must load on their controller's turn, ride on transport owner's turn, offload on a later controller turn.

### 6.5 Destroyer (Anti-Sub)

- Cancels **Treat Hostile Sea Zones as Friendly**: an enemy sub entering a sea zone with a destroyer must stop movement. Combat may ensue.
- When in a battle, cancels enemy submarines': **Target Select, Surprise Strike, Submersible, and air-immunity**. (Super Submarines partially override — see §7.)
- Destroyers from a power friendly to attacker but NOT in the battle do not enable these effects.

### 6.6 Fighters & Tactical Bombers — Carrier Operations

- Both can land on/take off from carriers.
- Carrier base capacity: 2 air units. With **Super Carriers** tech: 3.
- Air units on a friendly power's carrier are cargo on the carrier owner's turn (they can defend if the carrier is attacked, per below).
- Carrier aircraft move independently on their own turn but with the carrier on its turn if owned by a different power.
- On its own turn, air launches BEFORE the carrier moves (even if not leaving the sea zone). Possible: carrier combat-moves while its planes stay behind to noncombat-move.
- **During Noncombat Move**: fighters/tac bombers may move to land on carriers. Carriers that did not combat-move may also reposition for landings. Carriers **must** move if they're the only way to land an otherwise stranded plane.
- **Damaged carrier**: cannot launch or recover air. Any guest air on board becomes cargo, cannot defend, cannot leave until repaired. Planes that planned to land must find alternates or be destroyed.
- **Defending carrier**: when an undamaged carrier is attacked, its planes (including allied guests) defend in the air, even vs subs-only attackers (but they still can't hit subs without a friendly destroyer present).
- **Defending carrier destroyed/damaged mid-combat**: air units that were defending must, in this priority order during the subsequent Noncombat Move (before the acting player's normal noncombat movements):
  1. Land on the same carrier if it survived undamaged.
  2. Land on a different friendly carrier in the same sea zone.
  3. Move 1 space to a friendly carrier or friendly territory.
  4. Otherwise, be destroyed.

### 6.7 Air Unit Landing & Range Rules

- Air units cannot land in territories captured this turn, or territories converted from friendly neutrals this turn.
- Each sea-zone or territory crossing = 1 movement point.
- **During Combat Move, you must be able to demonstrate a plausible landing path for every attacking air unit** (combat moves, planned noncombat moves, carrier mobilizations). After demonstrating this, you have no guarantee — battle losses may strand planes (they die at end of Noncombat).
- If you declared a carrier would noncombat-move to receive a plane, you must follow through (unless the plane is already landed safely or destroyed, or a clearing combat failed).

### 6.8 Strategic Bomber Air Transport (Reclassification)
At Combat Move or Noncombat Move, a strategic or heavy bomber may be reclassified:

| Reclassified Unit | Move | Attack | Defense | Capacity |
|---|---|---|---|---|
| Transport Plane (strat or heavy) | 6 | — | — | 2 infantry |
| Cargo Plane (heavy only) | 6 | — | — | 2 units: artillery, mech infantry, or tank (tech applies); may swap 1 unit for 1 infantry |

- Transported units must start in the same territory as the plane.
- Subject to AAA fire — if hit, plane AND cargo destroyed.
- Air Transports are casualty-chosen-last.
- **Combat Drop**: drop up to 6 units into a territory where other ground units are attacking. Dropped units cannot exceed the count of overland attackers. No retreat for dropped units. Once dropped, the transport is considered retreated and cannot be a casualty.
- **Noncombat Drop**: max 2 units per territory; the territory must have been controlled by you or an ally at start of your turn.
- Reverts to bomber stats at the next Repair Units phase.

---

## 7. Research & Technology Effects

Tech is per-nation, 4 IPCs to start at Phase 1, progresses through P1 → P2 → P3 → Hold. Only one tech in development at a time. Cancelling forfeits all IPCs spent. 11 techs available.

Below is how each tech mutates combat-relevant behavior:

### 7.1 Advanced Mechanized (Mech Infantry tech)
- Mech Infantry may carry 2 infantry **or** tow 1 artillery during movement phases.
- Mech Infantry can **blitz without a tank**.
- Loaded mech infantry count as 1 unit when railing from an IC.
- **Cannot** load carried/towed units onto a transport.

### 7.2 Self-Propelled Artillery (Artillery tech)
- Artillery supports **2** infantry/mech infantry (instead of 1) per artillery unit for the A=2 buff.
- Artillery movement: **2** (up from 1).
- Artillery may blitz with a tank originating in the same territory.

### 7.3 Improved Transports
- Transport capacity: **3 ground units** (was 2). If carrying 3, **at least 1 must be infantry**.
- Transports now **defend at 1**.
- A lone Improved Transport is still ignored (does not block movement on its own).

### 7.4 Super Battleships
- Battleship rolls **2 dice on attack/defense**: one at hit-on-≤4, one at hit-on-≤2. **Applies to shore bombardment too** (so super-BB bombardment rolls 2 dice: one ≤4 and one ≤2).
- Battleships: **damage capacity 3** (3 hits to destroy); still fully operational at 1 hit (only the second & third hits represent damage states; rules say "considered fully operational with 1 hit").
- **AAA defend at 2 (up from 1)** — this line is bundled with Super Battleships in the source rules. It is ambiguous whether this refers to:
  - (a) AAA-fire die going from `≤1` to `≤2` (matching what Radar and A.T.C. does for AAA), OR
  - (b) AAA unit's *defense value* (used when taken as a casualty) going from 1 to 2.
  - **Implementation note**: the most common interpretation, given Radar's parallel wording ("AAA Artillery units and Facility fire is increased to 2"), is interpretation (a). Treat AAA-fire hits as `≤2` when *either* tech is held. The defending-step defense value of AAA (D=1) is unchanged.

### 7.5 Super Submarines
- Submarine attack: **3** (up from 2). Target Select hit on `≤3`.
- Destroyers detect only **3 submarines each** — i.e., a single destroyer cancels the special abilities (Target Select, Surprise Strike, Submerge) of only 3 enemy super-subs. Subs in the battle beyond that detection cap may still submerge, Strike, or Target Select normally.
- **Implementation:** count `cap = 3 × (number of enemy destroyers in the battle)`; cancel sub abilities for `min(cap, number of subs)` subs; the remainder retain full sub abilities.

### 7.6 Heavy Bombers
- Strategic bombers on attack: **2 dice at hit-on-≤3** (was 2@2).
- Strategic bombing raid roll: **2 dice** (sum + 2 per die for damage).
- Bombers may be reclassified as **cargo plane** (heavy only) — see §6.8.

### 7.7 Jet Fighters
- Fighter attack: **4** (up from 3).
- Fighter escort/intercept value: **2** (up from 1) in the special bombing-raid air battle.

### 7.8 Super Carriers
- Carrier capacity: **3 air units** (up from 2).
- Carrier damage capacity: **3 hits** (still considered fully operational at 1 hit).

### 7.9 Improved Shipyards
- Naval costs reduced: Submarine 5, Transport 5, Destroyer 7, Cruiser 10, Carrier 13, Battleship 16.
- Minor industrial complexes may now build capital ships.

### 7.10 Heavy Tanks
- Tank attack: **4** (up from 3).

### 7.11 Radar and A.T.C.
- AAA units AND facility AAA fire: hit on `≤2` (up from `≤1`).
- Air bases scramble up to **6** (up to 3 may be allied), up from 3.
- Air base movement bonus: **+2** to air movement, up from +1.

---

## 8. Combat-Time Targeting & Casualty Restrictions

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

## 9. Sequence Cheat-Sheet (For Implementation)

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
       - Subs: Target Select (att) / Surprise Strike (def) / Submerge — only if no enemy destroyer
           - Target Select, Surprise Strike: declare specific target before rolling; on miss nothing happens; excess hits on a destroyed target are lost, not reassigned
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

## 10. Edge Cases & Implementation Gotchas

- **Allied units in the contested sea zone do not fight.** If you attack into a sea zone that already contains friendly allied units, those units are NOT placed on the Battle Board — they take no hits and fire no shots. They stay on the map, out of play, for the duration of that battle.
- **Submarines and transports are "invisible" for sea-zone status checks.** When determining whether a sea zone is "hostile" (for movement, loading/offloading, retreat destinations), enemy subs and transports are ignored. A sea zone with only enemy subs and/or transports is treated as friendly for movement/loading purposes.
- **Combined Arms is 1:1 and re-assignable across phases** but only one pairing per unit per combat round. Implementation should track pairings as a per-round assignment.
- **Strategic bombers only fight round 1** in general combat — track and force retreat (or casualty) after round 1.
- **Damaged capital ship attack/move halved** — but defense unchanged. Damage state is re-applied at the start of each round, not mid-round.
- **Super Battleship rolls two dice** (one ≤4, one ≤2). Damaged super-BB still rolls two dice at 50% values (one ≤2, one ≤1).
- **AAA only fires once per battle** — track a "has fired" flag per AAA source.
- **Step 2 (subs) repeats per round; step 2 (tac bombers) does NOT repeat (round 1 only).**
- **Submerged subs**: stay in the sea zone with a marker; surface at owner's next turn (Repair Units phase). They cannot disrupt convoy/lend-lease while submerged.
- **Subs that submerged before any dice were rolled** are NOT casualties and are NOT removed from play — they're set aside until the controller's next turn.
- **Attacking sub Target Select is the ONLY scenario where a transport is a valid first-choice target** despite "transport chosen last" — defending subs using Surprise Strike also pre-declare their target (defender's choice), but the transport-last rule still applies.
- **Target Select and Surprise Strikes are pre-declared, not a post-roll casualty pick.** The player (attacker in case of Target Select; defender for Surprise Strikes) names the specific target unit before any die is rolled. If the declared target is already gone when a later die resolves (e.g. two subs both named the same cruiser and the first hit killed it), the second hit is lost — it is NOT reassigned to another unit.
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

## 11. Unit Quick-Reference Card

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

## 12. Source Ambiguities & Interpretation Notes

Items where the source rulebook is unclear, contradictory, or contains implementation-critical nuances worth flagging:

1. **AAA defense value vs AAA fire die under Super Battleships tech.** Source says "AAA defend at 2 up from 1" bundled with Super BBs, but AAA's listed tech upgrade is Radar and A.T.C. The most consistent reading is that both techs independently raise AAA *fire* hit-on-die to `≤2`. AAA's casualty-step defense value (D=1) should be treated as unchanged. (See §7.4.)

2. **"Damaged capital ship attacks/moves at 50% capacity, rounded down."** The source says "50% capacity" and gives a battleship example (4 → 2). Implementation should floor-divide attack/move values by 2. Defense is explicitly unchanged. For a damaged super-battleship (2 dice, ≤4 and ≤2), halving each die produces ≤2 and ≤1.

3. **Tactical bomber Target Select round-1-only AND forfeits Combined Arms for the entire battle.** This combination means: if you Target Select with a tac bomber in round 1, in rounds 2+ that tac bomber fires at base attack 3 only — it does NOT get the Combined Arms bonus to 4, even if paired with a fighter or tank for the whole battle. Track a "used Target Select this battle" flag per tac bomber.

4. **Sub-only or transport-only sea zone status.** When checking whether a sea zone is "hostile" for movement, loading, retreat destinations, etc., enemy submarines and enemy transports are *ignored*. But they are still units — they can still be attacked, and a paired-transport defender (D=1) DOES block enemy movement.

5. **Defenseless transport auto-destroy** requires the attacker to have a unit that can fight more than 1 round. Strategic bombers (round-1 only) do NOT trigger this. A force of strat bombers vs lone transports must roll the bombing round normally.

6. **Capital ship "fully operational with 1 hit" under Super Battleships / Super Carriers tech.** The source explicitly says these are fully operational at 1 hit. Implementation: super-BB / super-Carrier with 1 hit fights at full values; the 50%-when-damaged rule kicks in only at 2 hits. (For a normal BB/Carrier, the 50% rule kicks in at 1 hit.)

7. **Cruiser combined arms (battleship + cruiser → cruiser D=4) is listed twice** in the source under the cruiser profile. This is a source duplication, not an indication of stacking. A single cruiser pairs with at most one battleship for this defense buff.

8. **Bombing-raid damage range:**
   - Tactical bomber: 1d6 per bomber → 1-6 damage per bomber.
   - Strategic bomber (normal): 1d6+2 per bomber → 3-8 damage per bomber.
   - Strategic bomber (Heavy Bombers tech): 2d6+2 each die (sum) per bomber → 6-16 damage per bomber. (Each die individually gets +2 then summed.)

9. **Submarine "Strike" terminology.** The source uses "Strike" and "Surprise Strike" for defending submarine attacks in step 2. "Target Select" is reserved for attacking submarines (and attacking tac bombers). Both mechanics involve the **firing side pre-declaring a specific target before rolling** — the attacker for Target Select, the defender for Surprise Strike. The key difference is targeting restrictions: Target Select can pick any naval unit including transports (first choice); Surprise Strike follows the transport-last rule.

10. **Attacking sub Target Select can pick a transport.** This is the single exception to the "transports chosen last" rule. Other targeting (including air units hitting non-sub targets) still follows the "transport chosen last" rule.

13. **Target Selects and Surprise Strikes are a pre-declared commits, not a post-roll casualty pick.** For attacking submarines and attacking tactical bombers target selecting, and defending submarines surprise striking, the player names the specific target unit *before* any dice are rolled for that step. Consequence: if two subs both declare the same target and the first hit destroys it, the second hit is wasted — it cannot be redirected to another unit.

11. **Air units in an amphibious assault**: must be pre-declared as sea-combat OR land-combat assigned. The source does not say this assignment occurs before the attacker sees the defender's scramble decision, but it does say scrambling happens AFTER the attacker assigns its air. So the sequence is: attacker announces amphibious assault → attacker assigns each attacking air unit to sea or land → defender declares scrambles → resolve.

12. **Carrier "must move to land otherwise-stranded planes" rule** only applies if the carrier did not combat-move and did not participate in combat. A carrier already used in combat is not obligated.