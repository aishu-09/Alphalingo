import Link from "next/link";

import computerScience from "@/app/data/computer-science.json";
import mathematics from "@/app/data/mathematics.json";
import biology from "@/app/data/biology.json";
import history from "@/app/data/history.json";

const subjects = {
  "computer-science": computerScience,
  mathematics,
  biology,
  history,
};

type SubjectKey = keyof typeof subjects;

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectSlug } = await params;

  const subject = subjects[subjectSlug as SubjectKey];

  if (!subject) {
    return (
      <main className="min-h-screen bg-[#f7f7f8] p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold text-zinc-900">
            Subject not found
          </h1>

          <Link
            href="/study"
            className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
          >
            ← Back to subjects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f8]">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">

        {/* Back */}
        <Link
          href="/study"
          className="text-sm font-medium text-zinc-500 transition hover:text-zinc-900"
        >
          ← All subjects
        </Link>

        {/* Header */}
        <section className="mt-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
              {subject.icon}
            </div>

            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-indigo-600">
                Subject
              </p>

              <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                {subject.subject}
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-zinc-500">
            Choose a question type to start studying.
          </p>
        </section>

        {/* Decks */}
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {subject.decks.map((deck) => (
            <Link
              key={deck.id}
              href={`/study/${subjectSlug}/${deck.id}`}
              className="group"
            >
              <div className="h-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg">

                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-lg">
                    📚
                  </div>

                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500">
                    {deck.questions.length} cards
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-semibold text-zinc-900">
                  {deck.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  {deck.description}
                </p>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-600">
                    Start deck
                  </span>

                  <span className="text-zinc-400 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}