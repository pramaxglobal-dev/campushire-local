import type { JwtPayload, TenantContext } from "@campushire/types";

declare global {
  namespace Express {
    interface User extends JwtPayload {
      isEmailVerified: boolean;
      isApproved: boolean;
      isSuspended: boolean;
    }

    interface Request {
      tenant?: TenantContext;
      file?: Multer.File;
    }
  }
}

export {};