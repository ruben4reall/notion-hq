import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const USERS = [
  { id: '1', name: process.env.USER1_NAME!, email: process.env.USER1_EMAIL!, password: process.env.USER1_PASSWORD! },
  { id: '2', name: process.env.USER2_NAME!, email: process.env.USER2_EMAIL!, password: process.env.USER2_PASSWORD! },
]

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const user = USERS.find(
          u => u.email === credentials?.email && u.password === credentials?.password
        )
        return user ?? null
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.id = user.id; token.name = user.name }
      return token
    },
    session({ session, token }) {
      if (session.user) { session.user.name = token.name as string }
      return session
    },
  },
})

export { handler as GET, handler as POST }
