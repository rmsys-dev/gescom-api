CREATE UNIQUE INDEX IF NOT EXISTS "nfe_operations_states_state_cst_cfop_unique"
  ON "nfe_operations_states" ("state_id", "situation_tributary_cst_id", "cfop_enterprises_id");
