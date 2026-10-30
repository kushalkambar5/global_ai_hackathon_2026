import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter both email and password.");
        }

        const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
        let res;
        try {
          res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
        } catch (fetchErr: any) {
          console.error("Error connecting to backend auth endpoint:", fetchErr);
          throw new Error("Unable to connect to authentication backend server.");
        }

        if (!res.ok) {
          let errorMsg = "Invalid email or password.";
          try {
            const err = await res.json();
            errorMsg = err.error || err.message || errorMsg;
          } catch (e) {
            // Ignore non-JSON backend error
          }
          throw new Error(errorMsg);
        }

        let data;
        try {
          data = await res.json();
        } catch (e) {
          throw new Error("Invalid response format received from authentication server.");
        }

        const user = data.user;
        if (!user) {
          throw new Error("User data missing from authentication response.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          onboardingComplete: !!user.onboardingComplete,
          image: user.profileImageUrl || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.onboardingComplete = user.onboardingComplete;
        token.picture = (user as any).image || (user as any).picture || null;
      }
      
      if (trigger === "update" && session) {
        if (session.onboardingComplete !== undefined) token.onboardingComplete = session.onboardingComplete;
        if (session.name) token.name = session.name;
        if (session.picture) token.picture = session.picture;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        try {
          if (process.env.DATABASE_URL) {
            const { db } = await import("@/lib/db");
            const { users } = await import("@/lib/schema");
            const { eq } = await import("drizzle-orm");

            const dbUser = await db.query.users.findFirst({
              where: eq(users.id, token.id as string),
            }).catch(() => null);

            if (!dbUser) {
              console.log(`Session notice: user ${token.id} not found in database.`);
            }
          }
        } catch (error) {
          console.error("Error verifying user in session callback:", error);
        }

        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.onboardingComplete = !!token.onboardingComplete;
        session.user.image = (token.picture as string) || (token.image as string) || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "hippohealth_nextauth_secret_key_9876543210_antigravity",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
