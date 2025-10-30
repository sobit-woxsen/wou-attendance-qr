
import { ensureStartupSweep, getPublicSessionByShortCode } from "@/lib/session-service";
import { StudentSessionForm } from "@/components/student/student-session-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface StudentPageProps {
  params: Promise<{ shortCode: string }>;
  searchParams: Promise<{ t?: string }>;
}

export default async function StudentPage({
  params,
  searchParams,
}: StudentPageProps) {
  const { shortCode } = await params;
  const { t: token } = await searchParams;
  if (!token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Session link invalid</h1>
        <p className="text-sm text-muted-foreground">
          The session token is missing. Please scan the latest QR code shared by your faculty.
        </p>
      </main>
    );
  }

  await ensureStartupSweep();
  const session = await getPublicSessionByShortCode(shortCode);

  if (!session) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Session not found</h1>
        <p className="text-sm text-muted-foreground">
          This QR code may be expired. Ask your faculty for a fresh link.
        </p>
      </main>
    );
  }

  if (session.token !== token) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Invalid token</h1>
        <p className="text-sm text-muted-foreground">
          Please rescan the QR code and try again.
        </p>
      </main>
    );
  }

  if (session.status !== "OPEN" || session.endAtUTC.getTime() <= Date.now()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-semibold">Session closed</h1>
        <p className="text-sm text-muted-foreground">
          Attendance submissions are no longer accepted for this session.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-6 py-10">
      <StudentSessionForm
        session={{
          sessionId: session.id,
          token,
          course: session.course,
          sectionName: session.section.name,
          semesterNumber: session.section.semester.number,
          endsAtISO: session.endAtUTC.toISOString(),
        }}
      />
    </main>
  );
}
