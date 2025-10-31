
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type StudentSessionFormProps = {
  session: {
    sessionId: string;
    token: string;
    course: string;
    sectionName: string;
    semesterNumber: number;
    endsAtISO: string;
  };
};

export function StudentSessionForm({ session }: StudentSessionFormProps) {
  const [name, setName] = React.useState("");
  const [roll, setRoll] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(0);

  React.useEffect(() => {
    const endsAt = new Date(session.endsAtISO).getTime();
    const update = () => {
      const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        setSubmitted(true);
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [session.endsAtISO]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !roll) {
      toast({
        title: "Missing details",
        description: "Enter both name and roll number.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          token: session.token,
          name,
          roll,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast({
          title: "Submission failed",
          description: result?.message ?? "Unable to record attendance.",
        });
        return;
      }
      setSubmitted(true);
      setName("");
      setRoll("");
      toast({
        title: "Attendance recorded",
        description: result.alreadySubmitted
          ? "Your attendance was already recorded."
          : "Thanks! Your attendance has been submitted.",
      });
    } catch (error) {
      console.error("Submit error", error);
      toast({
        title: "Unexpected error",
        description: "Unable to submit attendance.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Attendance submission</CardTitle>
        <CardDescription>
          Semester {session.semesterNumber} • {session.sectionName} • {session.course}
        </CardDescription>
        <p className="text-sm font-medium text-primary">
          Time left: {minutes}:{seconds.toString().padStart(2, "0")}
        </p>
      </CardHeader>
      <CardContent>
        {submitted && secondsRemaining === 0 ? (
          <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
            Session closed. If you missed the window, contact your faculty.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                disabled={submitted}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll">Roll number</Label>
              <Input
                id="roll"
                value={roll}
                onChange={(event) => setRoll(event.target.value.toUpperCase())}
                placeholder="Enter roll number"
                disabled={submitted}
              />
            </div>
            <Button type="submit" disabled={submitted || submitting} className="w-full">
              {submitted
                ? "Attendance recorded"
                : submitting
                  ? "Submitting..."
                  : "Mark attendance"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
