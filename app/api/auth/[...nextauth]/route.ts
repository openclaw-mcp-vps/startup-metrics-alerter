import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialSchema = z.object({
  email: z.string().email(),
  accessCode: z.string().min(6),
});

const handler = NextAuth({
  session: {
    strategy: "jwt",
  },
  secret:
    process.env.NEXTAUTH_SECRET ??
    process.env.STRIPE_WEBHOOK_SECRET ??
    "dev-auth-secret-change-in-production",
  providers: [
    Credentials({
      name: "Founder Access",
      credentials: {
        email: { label: "Email", type: "email" },
        accessCode: { label: "Access Code", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const expectedCode = process.env.DASHBOARD_ACCESS_CODE;

        if (expectedCode && parsed.data.accessCode !== expectedCode) {
          return null;
        }

        return {
          id: parsed.data.email,
          email: parsed.data.email,
          name: parsed.data.email.split("@")[0],
        };
      },
    }),
  ],
  pages: {
    signIn: "/dashboard/unlock",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        session.user.email = token.email;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
