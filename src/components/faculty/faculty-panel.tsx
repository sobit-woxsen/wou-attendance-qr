
"use client";

import * as React from "react";
import QRCode from "react-qr-code";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

type FacultyPanelProps = {
  semesters: Array<{
    id: number;
    number: number;
    name: string;
    sections: Array<{ id: number; name: string }>;
  }>;
};

type PeriodStatus =
  | {
    active: true;
    periodId: string;
    periodLabel: string;
    endsAtIST: string;
    secondsRemaining: number;
  }
  | { active: false };

type ActiveSessionState = {
  sessionId: string;
  shortUrl: string;
  token: string;
  endsAtISO: string;
  tokenTail: string;
};

export function FacultyPanel({ semesters }: FacultyPanelProps) {
  const [selectedSemesterId, setSelectedSemesterId] = React.useState<
    number | null
  >(semesters[0]?.id ?? null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<
    number | null
  >(semesters[0]?.sections[0]?.id ?? null);

  const [course, setCourse] = React.useState("");
  const [facultyName, setFacultyName] = React.useState("");
  const [passkey, setPasskey] = React.useState("");
  const [periodStatus, setPeriodStatus] = React.useState<PeriodStatus>({
    active: false,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [closingSession, setClosingSession] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<
    ActiveSessionState | undefined
  >(undefined);
  const [secondsRemaining, setSecondsRemaining] = React.useState(0);
  const [closePasskey, setClosePasskey] = React.useState("");
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);

  const sections = React.useMemo(() => {
    const semester = semesters.find((s) => s.id === selectedSemesterId);
    return semester?.sections ?? [];
  }, [selectedSemesterId, semesters]);

  React.useEffect(() => {
    if (sections.length && !sections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(sections[0]?.id ?? null);
    }
  }, [sections, selectedSectionId]);

  const fetchPeriodStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/period/status", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      setPeriodStatus(data);
    } catch (error) {
      console.error("Failed to fetch period status", error);
      setPeriodStatus({ active: false });
    }
  }, []);

  React.useEffect(() => {
    fetchPeriodStatus();
    const interval = window.setInterval(fetchPeriodStatus, 30000);
    return () => window.clearInterval(interval);
  }, [fetchPeriodStatus]);

  React.useEffect(() => {
    if (!activeSession) return;
    const endsAt = new Date(activeSession.endsAtISO).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setActiveSession(undefined);
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    if (!selectedSectionId) return;
    if (!periodStatus.active) {
      toast({
        title: "Outside active period",
        description: "Sessions can only start during scheduled periods.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = crypto.randomUUID();
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          sectionId: selectedSectionId,
          course,
          facultyName,
          passkey,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Unable to start session",
          description: result?.message ?? "Check passkey or period timing.",
        });
        return;
      }

      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = new URL(result.shortUrl, origin).toString();
      const token = new URL(fullUrl).searchParams.get("t") ?? "";

      setActiveSession({
        sessionId: result.sessionId,
        shortUrl: fullUrl,
        token,
        tokenTail: result.tokenTail,
        endsAtISO: result.endsAtIST,
      });
      setPasskey("");
      fetchPeriodStatus();
      toast({
        title: "Session started",
        description: "QR code is now live for students.",
      });
    } catch (error) {
      console.error("Start session error", error);
      toast({
        title: "Unexpected error",
        description: "Unable to start session. Please retry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    setClosingSession(true);
    try {
      const response = await fetch("/api/sessions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          passkey: closePasskey,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Unable to close session",
          description: result?.message ?? "Check the passkey and try again.",
        });
        return;
      }
      setActiveSession(undefined);
      setClosePasskey("");
      setCloseDialogOpen(false);
      fetchPeriodStatus();
      toast({ title: "Session closed", description: "Attendance window ended." });
    } catch (error) {
      console.error("Close session error", error);
      toast({
        title: "Unexpected error",
        description: "Unable to close session.",
      });
    } finally {
      setClosingSession(false);
    }
  };

  const readyToStart =
    Boolean(selectedSectionId && course && facultyName && passkey) &&
    periodStatus.active &&
    !isSubmitting;

  return (
    <div className="grid gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Start a session</CardTitle>
          <CardDescription>
            Provide course details and passkey. Sessions run for 10 minutes or
            until the current period ends.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Select
                value={selectedSemesterId?.toString() ?? ""}
                onValueChange={(value) => setSelectedSemesterId(Number(value))}
              >
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester" />
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
              <Label htmlFor="section">Section</Label>
              <Select
                value={selectedSectionId?.toString() ?? ""}
                onValueChange={(value) => setSelectedSectionId(Number(value))}
              >
                <SelectTrigger id="section">
                  <SelectValue placeholder="Select section" />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                value={course}
                onChange={(event) => setCourse(event.target.value)}
                placeholder="Course name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facultyName">Faculty name</Label>
              <Input
                id="facultyName"
                value={facultyName}
                onChange={(event) => setFacultyName(event.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="passkey">Passkey</Label>
            <Input
              id="passkey"
              type="password"
              value={passkey}
              onChange={(event) => setPasskey(event.target.value)}
              placeholder="Enter shared passkey"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm">
            {periodStatus.active ? (
              <span>
                Period {periodStatus.periodId} active. {Math.floor(periodStatus.secondsRemaining / 60)}{" "}
                minutes remaining to start a session.
              </span>
            ) : (
              <span>Waiting for the next period window.</span>
            )}
          </div>
          <Button
            onClick={handleStartSession}
            disabled={!readyToStart}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Starting..." : "Start session"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live session</CardTitle>
          <CardDescription>
            The QR is visible only while the window is open. Students can submit once per roll.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {activeSession ? (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Session closes at{" "}
                {new Date(activeSession.endsAtISO).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                IST
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <QRCode value={activeSession.shortUrl} size={220} />
              </div>
              <div className="text-lg font-semibold text-primary">
                Time left:{" "}
                {`${Math.floor(secondsRemaining / 60)}:${(secondsRemaining % 60)
                  .toString()
                  .padStart(2, "0")}`}
              </div>
              <div className="flex flex-col items-center gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(activeSession.shortUrl)
                      .then(() =>
                        toast({
                          title: "Link copied",
                          description: "Share the URL if QR scanning is not possible.",
                        })
                      )
                      .catch(() =>
                        toast({
                          title: "Unable to copy",
                          description: "Copy manually from the browser address bar.",
                        })
                      );
                  }}
                >
                  Copy link
                </Button>
                <Dialog
                  open={closeDialogOpen}
                  onOpenChange={(open) => {
                    setCloseDialogOpen(open);
                    if (!open) {
                      setClosePasskey("");
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive">Close now</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Close session</DialogTitle>
                      <DialogDescription>
                        Enter the passkey to close the session immediately.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label htmlFor="close-passkey">Passkey</Label>
                      <Input
                        id="close-passkey"
                        type="password"
                        value={closePasskey}
                        onChange={(event) => setClosePasskey(event.target.value)}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="destructive"
                        onClick={handleCloseSession}
                        disabled={closingSession || !closePasskey}
                      >
                        {closingSession ? "Closing..." : "Confirm close"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              {/* <p className="text-xs text-muted-foreground">
                Token tail: {activeSession.tokenTail}
              </p> */}
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              No active session. Start one above during an eligible period.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
