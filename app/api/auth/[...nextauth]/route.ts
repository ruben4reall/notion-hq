import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

const USERS = [
  { id: '1', name: process.env.USER1_NAME!, username: process.env.USER1_USERNAME!, password: process.env.USER1_PASSWORD! },
  { id: '2', name: process.env.USER2_NAME!, username: process.env.USER2_USERNAME!, password: process.env.USER2_PASSWORD! },
]

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Identifiant', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const user = USERS.find(
          u => u.username === credentials?.username && u.password === credentials?.password
        )
        if (!user) return null
        return { id: user.id, name: user.name }
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
      if (session.user) session.user.name = token.name as string
      return session
    },
  },
})

export { handler as GET, handler as POST }
