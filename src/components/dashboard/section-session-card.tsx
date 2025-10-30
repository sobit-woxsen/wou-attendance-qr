"use client";

import * as React from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type ActiveSessionProps = {
  sectionName: string;
  semesterNumber: number;
  data?: {
    sessionId: string;
    shortCode: string;
    token: string;
    periodLabel: string;
    course: string;
    endsAtISO: string;
    remainingSeconds: number;
  };
};

export function SectionSessionCard({ sectionName, semesterNumber, data }: ActiveSessionProps) {
  const [secondsRemaining, setSecondsRemaining] = React.useState(data?.remainingSeconds ?? 0);
  const [shareUrl, setShareUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSecondsRemaining(data?.remainingSeconds ?? 0);
  }, [data]);

  React.useEffect(() => {
    if (!data) return;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    setShareUrl(`${origin}/s/${data.shortCode}?t=${data.token}`);
  }, [data]);

  React.useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [data]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const countdownLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  const handleCopyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() =>
        toast({ title: "Link copied", description: "Session link copied to clipboard." })
      )
      .catch(() =>
        toast({ title: "Unable to copy", description: "Please copy the URL manually." })
      );
  };

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          Semester {semesterNumber} - {sectionName}
        </h1>
        <p className="text-sm text-muted-foreground">QR is visible only while a session is live.</p>
      </header>

      {data ? (
        <Card className="max-w-3xl">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-xl">Session in progress</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {data.course} - {data.periodLabel}
              </CardDescription>
            </div>
            <div className="grid gap-1 text-sm">
              <p className="font-medium text-primary">Time left: {countdownLabel}</p>
              <p className="text-muted-foreground">
                Ends at {new Date(data.endsAtISO).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })} IST
              </p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className={cn("rounded-lg bg-white p-4 shadow")}> 
              {shareUrl ? <QRCode value={shareUrl} size={220} /> : <div className="h-[220px] w-[220px] animate-pulse rounded bg-muted" />}
            </div>
            <div className="flex w-full flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <Button onClick={handleCopyLink} variant="secondary">
                Copy link
              </Button>
              {shareUrl ? (
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Open submission form
                </a>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Share this QR with students. They have 10 minutes or until the period ends to submit attendance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>No active session</CardTitle>
            <CardDescription>
              This section is currently idle. Once a faculty member starts a session, the QR code will appear here automatically.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </section>
  );
}
