from units import Abbr

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