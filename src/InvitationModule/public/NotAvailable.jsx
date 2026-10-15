export default function NotAvailable({ title = "This invitation is no longer available", detail }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-6 text-center text-stone-800">
      <h1 className="font-serif text-2xl">{title}</h1>
      {detail ? <p className="mt-3 text-sm text-stone-600">{detail}</p> : null}
      <p className="mt-10 text-xs text-stone-500">Baba Saab Events</p>
    </main>
  );
}
