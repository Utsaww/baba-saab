import LoginPanel from "@/AdminModule/auth/LoginPanel";
import { safeNextPath } from "@/AdminModule/auth/access";

export const metadata = { title: "Sign in · Baba Saab Admin" };

export default function LoginPage({ searchParams }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <p className="text-sm uppercase tracking-widest text-stone-500">Baba Saab Events</p>
        <h1 className="mt-1 text-2xl font-semibold">Invitations · Staff sign in</h1>
      </div>
      <div className="w-full max-w-md">
        <LoginPanel next={safeNextPath(searchParams?.next)} error={searchParams?.error} />
      </div>
    </main>
  );
}
