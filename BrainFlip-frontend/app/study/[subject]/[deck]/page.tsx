import Link from "next/link";

import computerScience from "@/app/data/computer-science.json";
import mathematics from "@/app/data/mathematics.json";
import biology from "@/app/data/biology.json";
import history from "@/app/data/history.json";

import StudySession from "@/app/components/StudySession";

const subjects = {
  "computer-science": computerScience,
  mathematics,
  biology,
  history,
};

type SubjectKey = keyof typeof subjects;

export default async function DeckPage({
  params,
}: {
  params: Promise<{
    subject: string;
    deck: string;
  }>;
}) {
  const {
    subject: subjectSlug,
    deck: deckId,
  } = await params;

  const subject =
    subjects[subjectSlug as SubjectKey];

  if (!subject) {
    return (
      <main className="min-h-screen bg-[#f7f7f8] p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Subject not found
          </h1>

          <Link
            href="/study"
            className="mt-4 inline-block text-indigo-600"
          >
            ← Back to subjects
          </Link>
        </div>
      </main>
    );
  }

  const deck = subject.decks.find(
    (deck) => deck.id === deckId
  );

  if (!deck) {
    return (
      <main className="min-h-screen bg-[#f7f7f8] p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold">
            Deck not found
          </h1>

          <Link
            href={`/study/${subjectSlug}`}
            className="mt-4 inline-block text-indigo-600"
          >
            ← Back to {subject.subject}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <StudySession
      questions={deck.questions}
      title={deck.title}
      subject={subject.subject}
    />
  );
}