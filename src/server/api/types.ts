import type { DateTime } from "luxon";
import type { Principal } from "../auth/principal";

export interface AppVariables {
  requestId: string;
  now: DateTime;
  principal: Principal;
  clientIp: string;
}

export type AppEnv = { Variables: AppVariables };
