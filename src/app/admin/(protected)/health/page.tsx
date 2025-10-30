import { prisma } from "@/lib/prisma";
import { ensureStartupSweep } from "@/lib/session-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminHealthPage() {
  await ensureStartupSweep();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [openSessions, recentSubmissions, sections, sessionsLastDay] = await Promise.all([
    prisma.session.count({ where: { status: "OPEN" } }),
    prisma.attendanceSubmission.count({ where: { submittedAtUTC: { gte: oneHourAgo } } }),
    prisma.section.count(),
    prisma.session.count({ where: { createdAtUTC: { gte: oneDayAgo } } }),
  ]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Open sessions</CardTitle>
          <CardDescription>Sessions currently accepting attendance.</CardDescription>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{openSessions}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submissions (1h)</CardTitle>
          <CardDescription>Attendance entries received in the last hour.</CardDescription>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{recentSubmissions}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sections tracked</CardTitle>
          <CardDescription>Distinct sections configured in the system.</CardDescription>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{sections}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sessions started (24h)</CardTitle>
          <CardDescription>Sessions initiated in the last 24 hours.</CardDescription>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{sessionsLastDay}</CardContent>
      </Card>
    </div>
  );
}
