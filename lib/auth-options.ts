import type { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getUserSettings } from './notion'

const USERS = [
  { id: '1', name: process.env.USER1_NAME!, username: process.env.USER1_USERNAME!, password: process.env.USER1_PASSWORD! },
  { id: '2', name: process.env.USER2_NAME!, username: process.env.USER2_USERNAME!, password: process.env.USER2_PASSWORD! },
]

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Identifiant', type: 'text' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const user = USERS.find(u => u.username === credentials?.username)
        if (!user) return null

        let expectedPassword = user.password
        try {
          const settings = await getUserSettings(user.name)
          if (settings?.passwordOverride) expectedPassword = settings.passwordOverride
        } catch {}

        if (credentials?.password !== expectedPassword) return null
        return { id: user.id, name: user.name, username: user.username } as never
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 6 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((user as any).username) token.username = (user as any).username
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.name = token.name as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session.user as any).username = token.username
      }
      return session
    },
  },
}
