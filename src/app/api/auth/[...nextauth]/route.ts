import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    console.log('🔐 Login attempt:', { username: credentials?.username });

                    if (!credentials?.username || !credentials?.password) {
                        console.log('❌ Missing credentials');
                        return null
                    }

                    console.log('🔍 Querying Supabase for user...');
                    const { data: user, error } = await supabase
                        .from('User')
                        .select('*')
                        .eq('username', credentials.username)
                        .single()

                    console.log('🔍 Query completed');

                    if (error || !user) {
                        console.log('❌ User not found:', credentials.username, error);
                        return null
                    }

                    console.log('✅ User found:', { id: user.id, username: user.username, role: user.role });

                    const isPasswordValid = await compare(
                        credentials.password,
                        user.password
                    )

                    console.log('🔑 Password valid:', isPasswordValid);

                    if (!isPasswordValid) {
                        console.log('❌ Invalid password for user:', credentials.username);
                        return null
                    }

                    console.log('✅ Login successful:', { username: user.username, role: user.role });

                    return {
                        id: user.id,
                        name: user.name,
                        email: user.username,
                        role: user.role,
                    }
                } catch (error) {
                    console.error('💥 ERROR in authorize:', error);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role
            }
            return token
        },
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
