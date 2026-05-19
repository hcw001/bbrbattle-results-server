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

## 6. Sequence Cheatsheet (for implementation)
During the Conduct Combat Phase - before any general combat:
a. Resolve all Strategic/Tactical Bombing Raids:
   - Air battle (if interceptors), 1 round, all air @ A=1/D=1
   - Facility AAA fire (1 die per directly attacking bomber, hit ≤1)
   - Bombing damage (1d6 + 2 for strat/heavy, no +2 for tac; heavy rolls 2 dice)
   - Apply up to facility cap
b. Resolve all Naval Blockades (General Combat)
c. Resolve all Amphibious Assaults:
   - Sea combat (General Combat)
   - BB/CR bombardment (one die per ship, hit ≤4 BB or ≤3 CR, capped by offloaded unit count, hits go behind casualty strip)
   - Land combat (General Combat; seaborne units cannot retreat.
d. Resolve all remaining General Combat (land & sea)

## 7. Implementation Notes
- **Facility AAA fires per facility, per directly-assigned bomber.** Bombers assigned to the IC are only shot at by the IC's AAA, not the naval base's AAA. The attacker must declare per-bomber target facility.
- **Tactical bombers cannot strategic-bomb industrial complexes** — only air bases and naval bases.
- **Bombing-raid damage range:**
   - Tactical bomber: 1d6 per bomber → 1-6 damage per bomber.
   - Strategic bomber (normal): 1d6+2 per bomber → 3-8 damage per bomber.
   - Strategic bomber (Heavy Bombers tech): 2d6+2 each die (sum) per bomber → 6-16 damage per bomber. (Each die individually gets +2 then summed.)