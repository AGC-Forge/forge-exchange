
import type { Role } from "@forge-exchange/db"
declare module "#auth-utils" {
  interface User {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
    role_id: string;
    timezone: string | null;
    emailVerified: boolean;
    emailVerifiedAt: Date | null;
    role: Role;
    subscription?: Partial<Subscription> | null;
  }

  interface UserSession {
    user: User;
    loggedInAt?: string;
    provider?: "email" | "github" | "google";
  }
}

export { UserSession, User };
