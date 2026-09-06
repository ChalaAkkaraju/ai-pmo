-- 0047: a hold can be lifted early by the authority that placed it.
-- Adds 'resume' to the gate-decision vocabulary (recorded against the held stage).
alter table gate_decisions drop constraint if exists gate_decisions_decision_check;
alter table gate_decisions add constraint gate_decisions_decision_check
  check (decision in ('go', 'hold', 'kill', 'recycle', 'defer', 'resume'));
