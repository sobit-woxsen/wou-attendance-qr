"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

type SectionTileProps = {
  href: string;
  name: string;
  status: "OPEN" | "IDLE";
  remainingSeconds?: number;
  endsAtLabel?: string;
};

export function SectionTile({
  href,
  name,
  status,
  remainingSeconds = 0,
  endsAtLabel,
}: SectionTileProps) {
  const [secondsLeft, setSecondsLeft] = React.useState(remainingSeconds);

  React.useEffect(() => {
    setSecondsLeft(remainingSeconds);
  }, [remainingSeconds]);

  React.useEffect(() => {
    if (status !== "OPEN") return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        status === "OPEN"
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-background"
      )}
    >
      <div>
        <p className="text-lg font-semibold">{name}</p>
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        {status === "OPEN" ? (
          <div className="space-y-1">
            <p className="font-medium text-primary">Open {timeLabel} left</p>
            {endsAtLabel ? (
              <p className="text-xs text-muted-foreground">
                Ends at {endsAtLabel}
              </p>
            ) : null}
          </div>
        ) : (
          <p>Idle</p>
        )}
      </div>
    </Link>
  );
}
