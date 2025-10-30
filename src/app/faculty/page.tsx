

import { prisma } from "@/lib/prisma";
import { ensureStartupSweep } from "@/lib/session-service";
import { FacultyPanel } from "@/components/faculty/faculty-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FacultyPage() {
  await ensureStartupSweep();
  const semesters = await prisma.semester.findMany({
    orderBy: { number: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
      },
    },
  });

  const serialized = semesters.map((semester) => ({
    id: semester.id,
    number: semester.number,
    name: semester.name,
    sections: semester.sections.map((section) => ({
      id: section.id,
      name: section.name,
    })),
  }));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Faculty Session Control</h1>
        <p className="text-sm text-muted-foreground">
          Start a new attendance session during an active period. Passkey is
          required to open or close sessions.
        </p>
      </header>
      <FacultyPanel semesters={serialized} />
    </main>
  );
}
