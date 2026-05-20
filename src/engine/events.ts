import type { HitReason, Outcome, PlayerId, TechId, UnitType } from './state.js';

export type Event =
  | {
      kind: 'DiceRolled';
      step: number;
      round: number;
      unitId: string;
      threshold: number;
      roll: number;
      hit: boolean;
    }
  | {
      kind: 'HitAssigned';
      sourceId: string;
      targetId: string;
      reason: HitReason;
    }
  | {
      kind: 'CasualtyOptionsConsidered';
      hitFromId: string;
      eligibleIds: readonly string[];
      chosenId: string;
      strategy: string;
    }
  | {
      kind: 'CapitalShipDamaged';
      unitId: string;
      hpTaken: number;
      newAttack: number;
      newDefense: number;
    }
  | {
      kind: 'PairingActivated';
      step: number;
      supporterId: string;
      supportedId: string;
      stat: string;
      before: number;
      after: number;
    }
  | {
      kind: 'TechModifierApplied';
      unitId: string;
      techId: TechId;
      field: string;
      before: number;
      after: number;
    }
  | {
      kind: 'TargetSelectDeclared';
      unitId: string;
      targetId: string;
      auto: boolean;
    }
  | {
      kind: 'AAAVolleyFired';
      totalShots: number;
      hits: number;
      casualtyIds: readonly string[];
    }
  | {
      kind: 'UnitSubmerged';
      unitId: string;
    }
  | {
      kind: 'UnitRemoved';
      unitId: string;
      reason: 'casualty' | 'compulsory_removal' | 'auto_destroy' | 'submerge';
    }
  | {
      kind: 'RoundEnded';
      round: number;
      attackerCount: number;
      defenderCount: number;
    }
  | {
      kind: 'BattleEnded';
      outcome: Outcome;
      capturedBy: PlayerId | null;
    }
  | {
      kind: 'ShoreBombardmentFired';
      unitId: string;
      unitType: UnitType;
      rolls: readonly { threshold: number; roll: number; hit: boolean }[];
    };
