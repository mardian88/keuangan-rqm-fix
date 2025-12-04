import { getServerSession } from "next-auth"
import { authOptions } from "./api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin")
  } else if (session.user.role === "KOMITE") {
    redirect("/komite")
  } else if (session.user.role === "SANTRI") {
    redirect("/santri")
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Welcome, {session.user?.name}</h1>
      <p>Role: {session.user?.role}</p>
      <p>Redirecting...</p>
    </div>
  )
}
