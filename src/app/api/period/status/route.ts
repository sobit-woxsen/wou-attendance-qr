import { jsonNoStore } from "@/lib/response";
import { computeSessionEnd, getCurrentPeriod, nowIST } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const now = nowIST();
  const period = getCurrentPeriod(now);

  if (!period) {
    return jsonNoStore({
      active: false,
    });
  }

  const windowEnds = computeSessionEnd(now, period);

  return jsonNoStore({
    active: true,
    periodId: period.id,
    periodLabel: period.label,
    endsAtIST: windowEnds.toISO(),
    secondsRemaining: Math.max(
      0,
      Math.floor((windowEnds.toMillis() - Date.now()) / 1000)
    ),
  });
}
