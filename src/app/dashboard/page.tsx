
import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import { SectionTile } from "@/components/dashboard/section-tile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {

  const now = new Date();

  const [semesters, openSessions] = await Promise.all([
    prisma.semester.findMany({
      orderBy: { number: "asc" },
      include: {
        sections: {
          orderBy: { name: "asc" },
        },
      },
    }),
    prisma.session.findMany({
      where: { status: SessionStatus.OPEN },
      select: {
        id: true,
        sectionId: true,
        endAtUTC: true,
      },
    }),
  ]);

  const sessionMap = new Map<
    number,
    { sessionId: string; remainingSeconds: number; endsAtLabel: string }
  >();

  for (const session of openSessions) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((session.endAtUTC.getTime() - now.getTime()) / 1000)
    );
    if (remainingSeconds <= 0) {
      continue;
    }
    sessionMap.set(session.sectionId, {
      sessionId: session.id,
      remainingSeconds,
      endsAtLabel: formatIST(session.endAtUTC, "hh:mm a"),
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live session overview by semester and section. No student data is
          displayed here.
        </p>
      </header>

      <div className="space-y-6">
        {semesters.map((semester) => (
          <section key={semester.id} className="space-y-3">
            <h2 className="text-xl font-semibold">
              Semester {semester.number} — {semester.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {semester.sections.map((section) => {
                const status = sessionMap.get(section.id);
                return (
                  <SectionTile
                    key={section.id}
                    href={`/dashboard/section/${section.id}`}
                    name={section.name}
                    status={status ? "OPEN" : "IDLE"}
                    remainingSeconds={status?.remainingSeconds}
                    endsAtLabel={status?.endsAtLabel}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
