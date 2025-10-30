
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ensureStartupSweep,
  getActiveSessionForSection,
} from "@/lib/session-service";
import { SectionSessionCard } from "@/components/dashboard/section-session-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SectionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SectionPage({ params }: SectionPageProps) {
  const { id } = await params;
  const sectionId = Number(id);
  if (!Number.isFinite(sectionId)) {
    notFound();
  }

  await ensureStartupSweep();

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      semester: true,
    },
  });

  if (!section) {
    notFound();
  }

  const activeSession = await getActiveSessionForSection(section.id);

  let sessionData:
    | {
        sessionId: string;
        shortCode: string;
        token: string;
        periodLabel: string;
        course: string;
        endsAtISO: string;
        remainingSeconds: number;
      }
    | undefined;

  if (activeSession) {
    const session = await prisma.session.findUnique({
      where: { id: activeSession.id },
      include: { period: true },
    });

    if (session) {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.floor((session.endAtUTC.getTime() - now) / 1000)
      );
      if (remaining > 0) {
        sessionData = {
          sessionId: session.id,
          shortCode: session.shortCode,
          token: session.token,
          course: session.course,
          periodLabel: session.period.label,
          endsAtISO: session.endAtUTC.toISOString(),
          remainingSeconds: remaining,
        };
      }
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <SectionSessionCard
        sectionName={section.name}
        semesterNumber={section.semester.number}
        data={sessionData}
      />
    </main>
  );
}
