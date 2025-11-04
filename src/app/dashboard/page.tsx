import { SessionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatIST } from "@/lib/time";
import DashboardSection from "@/components/dashboard/DashboardSection";

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

  const sessionMap: any = {};

  for (const session of openSessions) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((session.endAtUTC.getTime() - now.getTime()) / 1000)
    );

    if (remainingSeconds > 0) {
      sessionMap[session.sectionId] = {
        sessionId: session.id,
        remainingSeconds,
        endsAtLabel: formatIST(session.endAtUTC, "hh:mm a"),
      };
    }
  }

  return (
    <div className="bg-[#f6f7f9] w-full min-h-screen flex flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-6 py-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Live session overview by semester and section.
          </p>
        </header>

        <div className="flex flex-col md:flex-row justify-between">
          <div className="space-y-3 bg-white border p-5 rounded-lg w-96">
            <h1 className="text-xl font-semibold">Total Semesters</h1>
            <p className="text-xl">{semesters.length}</p>
          </div>

          <div className="space-y-3 bg-white border p-5 rounded-lg w-96">
            <h1 className="text-xl font-semibold">Total Subjects</h1>
            <p className="text-xl">
              {semesters.flatMap((sem) => sem.sections).length}
            </p>
          </div>
        </div>

        <DashboardSection semesters={semesters} sessionMap={sessionMap} />
      </main>
    </div>
  );
}
