import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PERIODS } from "@/lib/time";
import { AdminReportsPanel } from "@/components/admin/admin-reports-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SemesterWithSections = Prisma.SemesterGetPayload<{
  include: {
    sections: true;
  };
}>;

export default async function AdminReportsPage() {
  const semesters = await prisma.semester.findMany({
    orderBy: { number: "asc" },
    include: {
      sections: {
        orderBy: { name: "asc" },
      },
    },
  });

  const serialized = semesters.map((semester: SemesterWithSections) => ({
    id: semester.id,
    number: semester.number,
    name: semester.name,
    sections: semester.sections.map((section: { id: number; name: string }) => ({
      id: section.id,
      name: section.name,
    })),
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Attendance reports</h1>
        <p className="text-sm text-muted-foreground">Filter sessions by date, period, semester, and section.</p>
      </header>
      <AdminReportsPanel semesters={serialized} periods={PERIODS} />
    </div>
  );
}
