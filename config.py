from units import Abbr
from lib import Role

ONESHOT = (Abbr.STRAT, Abbr.CBOMB, Abbr.BBOMB)
HASAAA = (Abbr.TRIPLEA, Abbr.CSR, Abbr.BTS, Abbr.sBTS, Abbr.sBTSx)
TAKELAST = (Abbr.TPT, Abbr.ATPT)
PLANES = (Abbr.STRAT, Abbr.ATPT, Abbr.FTR, Abbr.TSTAC, Abbr.TAC)
LANDUNITS = (Abbr.TRIPLEA, Abbr.ART, Abbr.CAV, Abbr.INF, Abbr.MECH, Abbr.TANK)
SHIPUNITS = (
    Abbr.CSR, Abbr.BTS, Abbr.BTSx, Abbr.sBTS, Abbr.sBTSx, Abbr.sBTSxx, Abbr.DTR,
    Abbr.ACC, Abbr.ACCx, Abbr.sACC, Abbr.sACCx, Abbr.sACCxx, Abbr.TPT
)
SUBUNITS = (Abbr.SUB,)

REPEATS = 10000

ATTACK_STATIC_SUB_TARGET_ORDER = (
    Abbr.CSR, Abbr.sBTSxx, Abbr.BTSx, Abbr.BTS, Abbr.sBTSx, Abbr.DTR, Abbr.ACC, 
    Abbr.sACCx, Abbr.sACCxx, Abbr.ACCx, Abbr.SUB, Abbr.sBTS, Abbr.sACC
)

DEFENSE_STATIC_SUB_TARGET_ORDER = (
    Abbr.CSR, Abbr.sBTSxx, Abbr.BTSx, Abbr.BTS, Abbr.sBTSx, Abbr.DTR, Abbr.SUB,
    Abbr.sBTS, Abbr.ACCx, Abbr.sACCxx, Abbr.ACC, Abbr.sACCx, Abbr.sACC
)

def defaultOrderOfLoss(role, terrain):
    if role == Role.ATTACK:
        if terrain == 'land':
            return [
                Abbr.STRAT,
                Abbr.INF,
                Abbr.MECH,
                Abbr.CAV,
                Abbr.ART,
                Abbr.TANK,
                Abbr.FTR,
                Abbr.TAC,
            ]
        else:
            return [
                Abbr.STRAT,
                Abbr.sACC,    # free first hit — still fully operational
                Abbr.sACCx,   # free second hit — still fully operational
                Abbr.ACC,
                Abbr.ACCx,
                Abbr.sACCxx,
                Abbr.SUB,
                Abbr.DTR,
                Abbr.sBTSxx,  # already damaged super BB
                Abbr.BTSx,    # already damaged BB
                Abbr.sBTS,    # free first hit — still fully operational
                Abbr.sBTSx,   # still fully operational, one hit from damage
                Abbr.BTS,
                Abbr.FTR,
                Abbr.CSR,
                Abbr.TAC,
            ]
    else:
        if terrain == 'land':
            return [
                Abbr.TRIPLEA,
                Abbr.CAV,
                Abbr.STRAT,
                Abbr.INF,
                Abbr.MECH,
                Abbr.ART,
                Abbr.TANK,
                Abbr.TAC,
                Abbr.FTR,
            ]
        else:
            return [
                Abbr.SUB,
                Abbr.sACC,    # free first hit — still fully operational
                Abbr.sACCx,   # free second hit — still fully operational
                Abbr.ACC,
                Abbr.ACCx,
                Abbr.sACCxx,
                Abbr.DTR,
                Abbr.sBTSxx,  # already damaged super BB
                Abbr.BTSx,    # already damaged BB
                Abbr.sBTS,    # free first hit — still fully operational
                Abbr.sBTSx,   # still fully operational, one hit from damage
                Abbr.TAC,
                Abbr.BTS,
                Abbr.CSR,
                Abbr.FTR,
            ]