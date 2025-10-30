import { SessionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { closeSession } from "./session-service";

export type SessionReportFilter = {
  sessionId?: string;
  filter?: {
    date: string;
    periodId: string;
    sectionId: number;
  };
};

export async function loadSessionReport(input: SessionReportFilter) {
  const session =
    input.sessionId != null
      ? await prisma.session.findUnique({
          where: { id: input.sessionId },
          include: {
            section: { include: { semester: true } },
            period: true,
          },
        })
      : await prisma.session.findFirst({
          where: {
            dateLocal: input.filter?.date,
            periodId: input.filter?.periodId,
            sectionId: input.filter?.sectionId,
          },
          include: {
            section: { include: { semester: true } },
            period: true,
          },
          orderBy: { startAtUTC: "desc" },
        });

  if (!session) {
    return null;
  }

  if (
    session.status === SessionStatus.OPEN &&
    session.endAtUTC.getTime() <= Date.now()
  ) {
    await closeSession(session.id, { silent: true });
    return loadSessionReport(input);
  }

  const submissions = await prisma.attendanceSubmission.findMany({
    where: { sessionId: session.id },
    select: {
      id: true,
      roll: true,
      name: true,
      submittedAtUTC: true,
    },
    orderBy: { submittedAtUTC: "asc" },
  });

  return { session, submissions };
}
