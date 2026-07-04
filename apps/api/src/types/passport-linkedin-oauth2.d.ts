declare module "passport-linkedin-oauth2" {
  import type { Strategy as PassportStrategy } from "passport-strategy";

  export interface Profile {
    id: string;
    displayName?: string;
    emails?: Array<{ value: string }>;
    name?: {
      givenName?: string;
      familyName?: string;
    };
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    state?: boolean;
    passReqToCallback?: boolean;
  }

  export type VerifyCallback = (error: Error | null, user?: unknown) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (...args: unknown[]) => void
    );
    name: string;
  }
}
