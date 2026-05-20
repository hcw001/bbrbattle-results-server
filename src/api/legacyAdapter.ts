/**
 * Adapter between the legacy Python API format (used by bbr40.com) and the new engine.
 *
 * Legacy request format:
 *   - attackerTech / defenderTech: single integer (0–9); 9 = no tech
 *   - attackerUnits / defenderUnits: { [LegacyUnitName]: count }
 *   - Unit names include derived types: DamagedBattleship, SuperBattleship, etc.
 *
 * Legacy response format:
 *   { code: 1, message: 'OK', outputs: { outcomes: {...}, stats: {...} } }
 */

import type { TechId, Unit, UnitType } from '../engine/state.js';
import type { BattleResult } from '../engine/engine.js';
import { runBattle, buildBattleState } from '../engine/engine.js';
import { Dice } from '../engine/dice.js';
import { UNIT_PROFILES } from '../profiles/units.js';
import { resolveProfile } from '../rules/profile.js';

// ── Tech mapping ─────────────────────────────────────────────────────────────

const LEGACY_TECH_MAP: Readonly<Record<number, TechId | null>> = {
  0: 'SelfPropelledArtillery', // ADV_ART
  1: 'RadarATC',               // ATC
  2: 'HeavyBombers',           // HEAVY_BOMB
  3: 'HeavyTanks',             // HEAVY_TANK
  4: 'JetFighters',            // JET_FTR
  5: 'SuperBattleships',       // SUP_BTS
  6: 'SuperSubmarines',        // SUP_SUB
  7: 'SuperCarriers',          // SUP_ACC
  8: 'ImprovedTransports',     // IMP_TPT
  9: null,                     // NONE
};

function parseLegacyTech(techValue: unknown): readonly TechId[] {
  if (techValue === null || techValue === undefined) return [];
  const n = Number(techValue);
  if (isNaN(n)) return [];
  const mapped = LEGACY_TECH_MAP[n];
  return mapped ? [mapped] : [];
}

// ── Unit type mapping ─────────────────────────────────────────────────────────

type LegacyUnitInfo = Readonly<{
  type: UnitType;
  hpTaken: number;
  isBombarding: boolean;
  usedTargetSelect: boolean;
  impliedTech?: TechId;
}>;

const LEGACY_UNIT_MAP: Readonly<Record<string, LegacyUnitInfo>> = {
  Infantry:                    { type: 'Infantry',         hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Artillery:                   { type: 'Artillery',        hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  MechanizedInfantry:          { type: 'MechanizedInfantry', hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Tank:                        { type: 'Tank',             hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Cavalry:                     { type: 'Cavalry',          hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  AAA:                         { type: 'AAA',              hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Fighter:                     { type: 'Fighter',          hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  TacticalBomber:              { type: 'TacticalBomber',   hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  TargetStrikeTacticalBomber:  { type: 'TacticalBomber',   hpTaken: 0, isBombarding: false, usedTargetSelect: true },
  StrategicBomber:             { type: 'StrategicBomber',  hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Submarine:                   { type: 'Submarine',        hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  SurpriseStrikeSubmarine:     { type: 'Submarine',        hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Transport:                   { type: 'Transport',        hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Destroyer:                   { type: 'Destroyer',        hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  Cruiser:                     { type: 'Cruiser',          hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  CruiserBombard:              { type: 'Cruiser',          hpTaken: 0, isBombarding: true,  usedTargetSelect: false },
  // Carriers
  AircraftCarrier:             { type: 'AircraftCarrier',  hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  DamagedAircraftCarrier:      { type: 'AircraftCarrier',  hpTaken: 1, isBombarding: false, usedTargetSelect: false },
  SuperAircraftCarrier:        { type: 'AircraftCarrier',  hpTaken: 0, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperCarriers' },
  SuperAircraftCarrierX:       { type: 'AircraftCarrier',  hpTaken: 1, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperCarriers' },
  DamagedSuperAircraftCarrier: { type: 'AircraftCarrier',  hpTaken: 2, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperCarriers' },
  // Battleships
  Battleship:                  { type: 'Battleship',       hpTaken: 0, isBombarding: false, usedTargetSelect: false },
  DamagedBattleship:           { type: 'Battleship',       hpTaken: 1, isBombarding: false, usedTargetSelect: false },
  BattleshipBombard:           { type: 'Battleship',       hpTaken: 0, isBombarding: true,  usedTargetSelect: false },
  SuperBattleship:             { type: 'Battleship',       hpTaken: 0, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperBattleships' },
  SuperBattleshipX:            { type: 'Battleship',       hpTaken: 1, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperBattleships' },
  DamagedSuperBattleship:      { type: 'Battleship',       hpTaken: 2, isBombarding: false, usedTargetSelect: false, impliedTech: 'SuperBattleships' },
  // Air transport: ignore in combat (reclassified strat bomber; fights as cargo)
  AirTransport:                { type: 'StrategicBomber',  hpTaken: 0, isBombarding: false, usedTargetSelect: false },
};

/** Maps a legacy unit name to our engine type info. Returns null if unknown or non-combat. */
function mapLegacyUnit(legacyName: string): LegacyUnitInfo | null {
  return LEGACY_UNIT_MAP[legacyName] ?? null;
}

// ── Legacy unit name output mapping ──────────────────────────────────────────

/**
 * Converts a surviving Unit from our engine back to a legacy unit type name.
 * Damage state + tech context → the appropriate legacy class name.
 */
function toLegacyUnitName(unit: Unit, tech: ReadonlySet<TechId>): string {
  const hasSuperBB = tech.has('SuperBattleships');
  const hasSuperACC = tech.has('SuperCarriers');

  if (unit.type === 'Battleship') {
    if (hasSuperBB) {
      if (unit.hpTaken === 0) return 'SuperBattleship';
      if (unit.hpTaken === 1) return 'SuperBattleshipX';
      return 'DamagedSuperBattleship';
    }
    if (unit.hpTaken >= 1) return 'DamagedBattleship';
    return 'Battleship';
  }

  if (unit.type === 'AircraftCarrier') {
    if (hasSuperACC) {
      if (unit.hpTaken === 0) return 'SuperAircraftCarrier';
      if (unit.hpTaken === 1) return 'SuperAircraftCarrierX';
      return 'DamagedSuperAircraftCarrier';
    }
    if (unit.hpTaken >= 1) return 'DamagedAircraftCarrier';
    return 'AircraftCarrier';
  }

  return unit.type;
}

// ── Input parsing ─────────────────────────────────────────────────────────────

let _legacyCounter = 0;

type BuildResult = Readonly<{
  units: readonly Unit[];
  impliedTechs: readonly TechId[];
}>;

function buildLegacyUnits(
  unitMap: Record<string, number>,
  owner: string,
): BuildResult {
  const units: Unit[] = [];
  const impliedTechs = new Set<TechId>();

  for (const [legacyName, count] of Object.entries(unitMap)) {
    if (!count || count <= 0) continue;

    const info = mapLegacyUnit(legacyName);
    if (!info) continue;

    if (info.impliedTech) impliedTechs.add(info.impliedTech);

    for (let i = 0; i < count; i++) {
      units.push({
        id: `${info.type}_${_legacyCounter++}`,
        type: info.type,
        owner,
        hpTaken: info.hpTaken,
        tags: new Set(),
        usedTargetSelect: info.usedTargetSelect,
        isBombarding: info.isBombarding,
        firedInStep2: false,
        submerged: false,
      });
    }
  }

  return { units, impliedTechs: [...impliedTechs] };
}

// ── Legacy response building ──────────────────────────────────────────────────

type LegacyUnitMap = Record<string, number>;

function toUnitCountMap(units: readonly Unit[], tech: ReadonlySet<TechId>): LegacyUnitMap {
  const map: LegacyUnitMap = {};
  for (const unit of units) {
    const name = toLegacyUnitName(unit, tech);
    map[name] = (map[name] ?? 0) + 1;
  }
  return map;
}

function computeDeadUnits(
  initial: Record<string, number>,
  alive: LegacyUnitMap,
): LegacyUnitMap {
  const dead: LegacyUnitMap = {};
  for (const [name, count] of Object.entries(initial)) {
    if (!count) continue;
    const survived = alive[name] ?? 0;
    const casualties = Math.max(0, count - survived);
    if (casualties > 0) dead[name] = casualties;
  }
  return dead;
}

function computeIpcLost(initial: Record<string, number>, alive: LegacyUnitMap): number {
  let lost = 0;
  for (const [legacyName, count] of Object.entries(initial)) {
    if (!count) continue;
    const info = mapLegacyUnit(legacyName);
    if (!info) continue;
    const survived = alive[legacyName] ?? 0;
    const casualties = Math.max(0, count - survived);
    lost += casualties * UNIT_PROFILES[info.type].cost;
  }
  return lost;
}

// ── Main legacy simulation runner ─────────────────────────────────────────────

export type LegacyRequest = Readonly<{
  terrain: 'land' | 'sea';
  attackerTech: unknown;
  defenderTech: unknown;
  attackerUnits: Record<string, number>;
  defenderUnits: Record<string, number>;
  attackerSubAssignments?: Record<string, string>;
  defenderSubAssignments?: Record<string, string>;
  targetSelectAssignments?: Record<string, string>;
  nIterations?: number;
}>;

type OutcomeStat = {
  alive: LegacyUnitMap;
  dead: LegacyUnitMap;
  ipc: number;
  count: number;
  percentile: number;
};

export function runLegacySimulation(req: LegacyRequest): unknown {
  _legacyCounter = 0;
  const N = req.nIterations ?? 20_000;

  const attackerTechs = parseLegacyTech(req.attackerTech);
  const defenderTechs = parseLegacyTech(req.defenderTech);

  // Pre-build unit templates to get implied techs
  const attackerBuild = buildLegacyUnits(req.attackerUnits, 'attacker');
  const defenderBuild = buildLegacyUnits(req.defenderUnits, 'defender');

  const finalAttackerTechs = new Set<TechId>([...attackerTechs, ...attackerBuild.impliedTechs]);
  const finalDefenderTechs = new Set<TechId>([...defenderTechs, ...defenderBuild.impliedTechs]);

  // Outcome tracking
  const attackerOutcomes = new Map<string, OutcomeStat>();
  const defenderOutcomes = new Map<string, OutcomeStat>();

  let attackerWins = 0;
  let defenderWins = 0;
  let draws = 0;
  let stalemates = 0;
  let totalRounds = 0;
  let totalAttackerIpc = 0;
  let totalDefenderIpc = 0;

  const subAssignments = req.attackerSubAssignments && Object.keys(req.attackerSubAssignments).length > 0
    ? new Map(Object.entries(req.attackerSubAssignments))
    : undefined;

  const tacAssignments = req.targetSelectAssignments && Object.keys(req.targetSelectAssignments).length > 0
    ? new Map(Object.entries(req.targetSelectAssignments))
    : undefined;

  for (let i = 0; i < N; i++) {
    _legacyCounter = 0;
    const dice = new Dice(i);

    // Rebuild units for each iteration (ids need to be fresh and deterministic)
    const aUnits = buildLegacyUnits(req.attackerUnits, 'attacker');
    const dUnits = buildLegacyUnits(req.defenderUnits, 'defender');

    const state = {
      terrain: req.terrain,
      round: 1,
      aaaFired: false,
      flags: new Set<string>(),
      attacker: {
        player: 'attacker' as const,
        units: aUnits.units,
        tech: finalAttackerTechs,
        casualtyStrip: [] as readonly import('../engine/state.js').Unit[],
        aaaFired: false,
      },
      defender: {
        player: 'defender' as const,
        units: dUnits.units,
        tech: finalDefenderTechs,
        casualtyStrip: [] as readonly import('../engine/state.js').Unit[],
        aaaFired: false,
      },
    };

    const result = runBattle(state, dice, {}, subAssignments, tacAssignments);

    totalRounds += result.rounds;

    const attAlive = toUnitCountMap(result.survivingAttacker, finalAttackerTechs);
    const defAlive = toUnitCountMap(result.survivingDefender, finalDefenderTechs);

    const attIpc = computeIpcLost(req.attackerUnits, attAlive);
    const defIpc = computeIpcLost(req.defenderUnits, defAlive);
    totalAttackerIpc += attIpc;
    totalDefenderIpc += defIpc;

    if (result.outcome === 'attacker') attackerWins++;
    else if (result.outcome === 'defender') defenderWins++;
    else draws++;

    // Track outcomes by survivor composition
    const attKey = JSON.stringify(attAlive);
    const defKey = JSON.stringify(defAlive);

    const existingAtt = attackerOutcomes.get(attKey);
    if (existingAtt) {
      existingAtt.count++;
      existingAtt.ipc += attIpc;
    } else {
      attackerOutcomes.set(attKey, {
        alive: attAlive,
        dead: computeDeadUnits(req.attackerUnits, attAlive),
        ipc: attIpc,
        count: 1,
        percentile: 0,
      });
    }

    const existingDef = defenderOutcomes.get(defKey);
    if (existingDef) {
      existingDef.count++;
      existingDef.ipc += defIpc;
    } else {
      defenderOutcomes.set(defKey, {
        alive: defAlive,
        dead: computeDeadUnits(req.defenderUnits, defAlive),
        ipc: defIpc,
        count: 1,
        percentile: 0,
      });
    }
  }

  // Sort by IPC lost descending (worst outcomes first, like original)
  const sortedAtt = [...attackerOutcomes.values()]
    .sort((a, b) => (b.ipc / b.count) - (a.ipc / a.count));
  const sortedDef = [...defenderOutcomes.values()]
    .sort((a, b) => (b.ipc / b.count) - (a.ipc / a.count));

  // Assign percentiles and normalize ipc averages
  let cumAtt = 0;
  for (const o of sortedAtt) {
    o.percentile = cumAtt / N;
    cumAtt += o.count;
    o.ipc = o.ipc / o.count; // convert from total to average
    o.count = o.count / N;   // convert to probability
  }

  let cumDef = 0;
  for (const o of sortedDef) {
    o.percentile = cumDef / N;
    cumDef += o.count;
    o.ipc = o.ipc / o.count;
    o.count = o.count / N;
  }

  return {
    outcomes: {
      attacker: {
        unitsAlive:        sortedAtt.map(o => o.alive),
        unitsDead:         sortedAtt.map(o => o.dead),
        outcomePercentile: sortedAtt.map(o => o.percentile),
        outcomeCount:      sortedAtt.map(o => o.count),
        ipcLoss:           sortedAtt.map(o => o.ipc),
      },
      defender: {
        unitsAlive:        sortedDef.map(o => o.alive),
        unitsDead:         sortedDef.map(o => o.dead),
        outcomePercentile: sortedDef.map(o => o.percentile),
        outcomeCount:      sortedDef.map(o => o.count),
        ipcLoss:           sortedDef.map(o => o.ipc),
      },
    },
    stats: {
      attackerIpc:    totalAttackerIpc / N,
      defenderIpc:    totalDefenderIpc / N,
      numberRounds:   totalRounds / N,
      endConditions: [
        ['Attacker Wins', attackerWins / N],
        ['Defender Wins', defenderWins / N],
        ['Draw', draws / N],
        ['Stalemate', stalemates / N],
      ],
      nIterations: N,
    },
  };
}
