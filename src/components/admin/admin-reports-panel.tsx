"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

export type AdminReportsPanelProps = {
  semesters: ReadonlyArray<{
    id: number;
    number: number;
    name: string;
    sections: Array<{ id: number; name: string }>;
  }>;
  periods: ReadonlyArray<{ id: string; label: string }>;
};

type LoadedReport = {
  session: {
    id: string;
    course: string;
    facultyName: string;
    periodLabel: string;
    startAtUTC: string;
    endAtUTC: string;
    closedAtUTC: string | null;
    dateLocal: string;
    section: {
      id: number;
      name: string;
      semesterNumber: number;
    };
  };
  submissions: Array<{
    id: string;
    name: string;
    roll: string;
    submittedAtUTC: string;
  }>;
  total: number;
};

export function AdminReportsPanel({ semesters, periods }: AdminReportsPanelProps) {
  const router = useRouter();
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<number | null>(semesters[0]?.id ?? null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<number | null>(semesters[0]?.sections[0]?.id ?? null);
  const [periodId, setPeriodId] = React.useState(periods[0]?.id ?? "P1");
  const [loading, setLoading] = React.useState(false);
  const [report, setReport] = React.useState<LoadedReport | null>(null);

  const sections = React.useMemo(() => {
    const semester = semesters.find((item) => item.id === selectedSemesterId);
    return semester?.sections ?? [];
  }, [selectedSemesterId, semesters]);

  React.useEffect(() => {
    if (sections.length && !sections.some((item) => item.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id ?? null);
    }
  }, [sections, selectedSectionId]);

  const handleLoad = async () => {
    if (!selectedSectionId) {
      toast({ title: "Select a section", description: "Choose a section to load attendance." });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/reports/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filter: {
            date,
            periodId,
            sectionId: selectedSectionId,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "No session found",
          description: result?.message ?? "No session matched the selected filters.",
        });
        setReport(null);
        return;
      }
      setReport({
        session: {
          id: result.session.id,
          course: result.session.course,
          facultyName: result.session.facultyName,
          periodLabel: result.session.periodLabel,
          startAtUTC: result.session.startAtUTC,
          endAtUTC: result.session.endAtUTC,
          closedAtUTC: result.session.closedAtUTC,
          dateLocal: result.session.dateLocal,
          section: result.session.section,
        },
        submissions: result.submissions,
        total: result.metrics?.totalSubmissions ?? result.submissions.length,
      });
    } catch (error) {
      console.error("Load session", error);
      toast({ title: "Unexpected error", description: "Unable to load the session." });
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!report?.session) {
      toast({ title: "Load a session first" });
      return;
    }
    try {
      const response = await fetch("/api/reports/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: report.session.id }),
      });
      if (!response.ok) {
        const result = await response.json();
        toast({ title: "Export failed", description: result?.message ?? "Unable to export CSV." });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] ?? "attendance.csv";
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export CSV", error);
      toast({ title: "Unexpected error", description: "Unable to export CSV." });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session filters</CardTitle>
        <CardDescription>Select a date, period, and section to preview attendance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="report-date">Date</Label>
            <Input
              id="report-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-period">Period</Label>
            <Select value={periodId} onValueChange={setPeriodId}>
              <SelectTrigger id="report-period">
                <SelectValue placeholder="Choose period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.id} - {period.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-semester">Semester</Label>
            <Select
              value={selectedSemesterId?.toString() ?? ""}
              onValueChange={(value) => setSelectedSemesterId(Number(value))}
            >
              <SelectTrigger id="report-semester">
                <SelectValue placeholder="Choose semester" />
              </SelectTrigger>
              <SelectContent>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id.toString()}>
                    Semester {semester.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-section">Section</Label>
            <Select
              value={selectedSectionId?.toString() ?? ""}
              onValueChange={(value) => setSelectedSectionId(Number(value))}
            >
              <SelectTrigger id="report-section">
                <SelectValue placeholder="Choose section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id.toString()}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleLoad} disabled={loading}>
            {loading ? "Loading..." : "Load session"}
          </Button>
          <Button variant="secondary" onClick={handleExport} disabled={!report?.session}>
            Export CSV
          </Button>
          {report?.session ? (
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/session/${report.session.id}`)}
            >
              Open session detail
            </Button>
          ) : null}
        </div>

        {report?.session ? (
          <div className="space-y-4">
            <div className="rounded-md border border-border p-4 text-sm">
              <p className="font-semibold">{report.session.course}</p>
              <p className="text-muted-foreground">
                {report.session.section.name} - Semester {report.session.section.semesterNumber}
              </p>
              <p className="text-muted-foreground">
                Period {report.session.periodLabel} - {timeFormatter.format(new Date(report.session.startAtUTC))} - {timeFormatter.format(
                  new Date(report.session.endAtUTC)
                )}
              </p>
              <p className="text-muted-foreground">Faculty: {report.session.facultyName}</p>
              <p className="text-muted-foreground">Total submissions: {report.total}</p>
            </div>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Roll</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Submitted (IST)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.submissions.map((submission) => (
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
                        No attendance submissions recorded.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Load a session to preview attendance records.</p>
        )}
      </CardContent>
    </Card>
  );
}
