import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Founder Login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const expectedEmail = process.env.FOUNDER_LOGIN_EMAIL;
        const expectedPassword = process.env.FOUNDER_LOGIN_PASSWORD;

        if (!expectedEmail || !expectedPassword) {
          return null;
        }

        if (
          credentials?.email === expectedEmail &&
          credentials.password === expectedPassword
        ) {
          return {
            id: "founder",
            email: expectedEmail,
            name: "Founder",
          };
        }

        return null;
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
