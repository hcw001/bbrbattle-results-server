import { z } from 'zod';

const UnitTypeSchema = z.enum([
  'Infantry',
  'Artillery',
  'MechanizedInfantry',
  'Tank',
  'Cavalry',
  'AAA',
  'Fighter',
  'TacticalBomber',
  'StrategicBomber',
  'Submarine',
  'Transport',
  'Destroyer',
  'Cruiser',
  'AircraftCarrier',
  'Battleship',
]);

const TechIdSchema = z.enum([
  'AdvancedMechanized',
  'SelfPropelledArtillery',
  'ImprovedTransports',
  'SuperBattleships',
  'SuperSubmarines',
  'HeavyBombers',
  'JetFighters',
  'SuperCarriers',
  'ImprovedShipyards',
  'HeavyTanks',
  'RadarATC',
]);

const SideInputSchema = z.object({
  tech: z.array(TechIdSchema).default([]),
  units: z.record(UnitTypeSchema, z.number().int().positive()).default({}),
  orderOfLoss: z.array(UnitTypeSchema).optional(),
});

const TargetAssignmentsSchema = z.record(z.string(), z.string()).optional();

export const BattleRequestSchema = z.object({
  terrain: z.enum(['land', 'sea']),
  attacker: SideInputSchema,
  defender: SideInputSchema,
  seed: z.number().int().optional(),
  subTargetAssignments: TargetAssignmentsSchema,
  tacTargetAssignments: TargetAssignmentsSchema,
});

export const SimulateRequestSchema = z.object({
  terrain: z.enum(['land', 'sea']),
  attacker: SideInputSchema,
  defender: SideInputSchema,
  nIterations: z.number().int().min(1).max(100_000).default(20_000),
  seed: z.number().int().optional(),
  subTargetAssignments: TargetAssignmentsSchema,
  tacTargetAssignments: TargetAssignmentsSchema,
});

export type BattleRequest = z.infer<typeof BattleRequestSchema>;
export type SimulateRequest = z.infer<typeof SimulateRequestSchema>;

export type UnitCountMap = Partial<Record<z.infer<typeof UnitTypeSchema>, number>>;

export type BattleResponse = {
  outcome: 'attacker' | 'defender' | 'draw';
  rounds: number;
  survivingAttacker: UnitCountMap;
  survivingDefender: UnitCountMap;
  ipcLost: { attacker: number; defender: number };
  events: unknown[];
};

export type SimulateResponse = {
  stats: {
    attackerWinRate: number;
    defenderWinRate: number;
    drawRate: number;
    avgRounds: number;
    avgIpcLost: { attacker: number; defender: number };
  };
  outcomeDistribution: {
    attacker: Array<{ units: UnitCountMap; probability: number; ipcLost: number }>;
    defender: Array<{ units: UnitCountMap; probability: number; ipcLost: number }>;
  };
};
