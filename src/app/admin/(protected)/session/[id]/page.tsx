import { notFound } from "next/navigation";
import { loadSessionReport } from "@/lib/reports";
import { ensureStartupSweep } from "@/lib/session-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminSessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  await ensureStartupSweep();
  const report = await loadSessionReport({ sessionId: id });
  if (!report) {
    notFound();
  }

  type Submission = typeof report.submissions[number];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{report.session.course}</CardTitle>
          <CardDescription>
            {report.session.section.name} - Semester {report.session.section.semester.number}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <p>Faculty: {report.session.facultyName}</p>
          <p>Date: {report.session.dateLocal}</p>
          <p>
            Period {report.session.period.label} - {timeFormatter.format(new Date(report.session.startAtUTC))} - {timeFormatter.format(
              new Date(report.session.endAtUTC)
            )}
          </p>
          <p>Total submissions: {report.submissions.length}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Attendance submissions</CardTitle>
          <CardDescription>Ordered by submission timestamp. Duplicates are deduplicated by roll.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Roll</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Submitted (IST)</th>
              </tr>
            </thead>
            <tbody>
              {report.submissions.map((submission: Submission) => (
                <tr key={submission.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-sm">{submission.roll}</td>
                  <td className="px-3 py-2">{submission.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {timeFormatter.format(new Date(submission.submittedAtUTC))}
                  </td>
                </tr>
              ))}
              {report.submissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-muted-foreground">
                    No submissions captured for this session.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
