import Link from "next/link";
import PhoneFrame from "@/AdminModule/PhoneFrame";
import { TEMPLATES } from "@/InvitationModule/templates/registry";

export const metadata = { title: "Templates · Baba Saab Admin" };

export default function TemplatesPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Templates</h1>
      <p className="mt-1 text-stone-600">Each design shown with sample details. Open one to try its colour palettes and languages.</p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2 2xl:grid-cols-4">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="flex flex-col items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <PhoneFrame src={`/preview/template/${t.id}`} title={`${t.name} preview`} scale={0.55} />
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <p className="text-center text-sm text-stone-600">{t.description}</p>
            <ul className="flex gap-2" aria-label={`${t.name} palettes`}>
              {t.palettes.map((p) => (
                <li
                  key={p.id}
                  title={p.name}
                  className="h-6 w-6 rounded-full border border-stone-300"
                  style={{ background: `linear-gradient(135deg, ${p.vars["--bg"]} 50%, ${p.vars["--primary"]} 50%)` }}
                />
              ))}
            </ul>
            <Link href={`/admin/templates/${t.id}`} className="flex min-h-[44px] items-center rounded-full bg-stone-900 px-5 text-sm text-white">
              Preview
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
