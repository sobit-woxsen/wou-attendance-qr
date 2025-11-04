"use client";
import { useEffect, useState } from "react";
import { SectionTile } from "@/components/dashboard/section-tile";
import DashBoardSearch from "./DashboardSearch";

export default function DashboardSection({ semesters, sessionMap }: any) {
  const [openSemester, setOpenSemester] = useState<number>(1);

  const toggleSemester = (id: number) => {
    setOpenSemester((prev) => (prev === id ? prev : id));
  };

  const [searchTerm, setsearchTerm] = useState<string>("");

  const filteredItems = semesters.filter((semester: any) => {
    if (!searchTerm || searchTerm.trim() === "") {
      return true;
    }

    return semester.sections.some((section: any) =>
      section.name.toLowerCase().includes(searchTerm?.toLowerCase())
    );
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <>
      <DashBoardSearch searchTerm={searchTerm} setsearchTerm={setsearchTerm} />
      <div className="space-y-6">
        {filteredItems.map((semester: any) => (
          <section
            key={semester.id}
            className="space-y-3 bg-white p-5 shadow-md shadow-slate-100 rounded-lg border"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSemester(semester.id)}
            >
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">
                  Semester {semester.number}
                </h2>
                <p className="text-sm">
                  Total Sections {semester.sections.length}
                </p>
              </div>

              <svg
                className={`transition-transform ${openSemester === semester.id ? "rotate-180" : "rotate-0"
                  }`}
                width="20"
                height="20"
                viewBox="0 0 15 15"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.18179 6.18181C4.35753 6.00608 4.64245 6.00608 4.81819 6.18181L7.49999 8.86362L10.1818 6.18181C10.3575 6.00608 10.6424 6.00608 10.8182 6.18181C10.9939 6.35755 10.9939 6.64247 10.8182 6.81821L7.81819 9.81821C7.73379 9.9026 7.61934 9.95001 7.49999 9.95001C7.38064 9.95001 7.26618 9.9026 7.18179 9.81821L4.18179 6.81821C4.00605 6.64247 4.00605 6.35755 4.18179 6.18181Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>

            {openSemester === semester.id && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {semester.sections.map((section: any) => {
                  const status = sessionMap[section.id];
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
            )}
          </section>
        ))}
      </div>
    </>
  );
}
