declare module "#auth-utils" {
  interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string | null;
    roleId: string;
  }

  interface UserSession {
    loggedInAt?: Date;
    provider?: "email" | "github" | "google";
  }
}

export { UserSession, User };
