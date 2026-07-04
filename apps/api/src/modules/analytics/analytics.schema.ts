import { z } from "zod";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const AnalyticsDateRangeSchema = z.object({
  from: z
    .string()
    .trim()
    .regex(isoDatePattern, "from must be YYYY-MM-DD")
    .optional(),
  to: z
    .string()
    .trim()
    .regex(isoDatePattern, "to must be YYYY-MM-DD")
    .optional()
});

export type AnalyticsDateRangeDto = z.infer<typeof AnalyticsDateRangeSchema>;

export interface DateRange {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
}

const parseDateOnly = (value: string, boundary: "start" | "end"): Date => {
  const time = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  return new Date(`${value}${time}`);
};

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export const resolveDateRange = (input: AnalyticsDateRangeDto): DateRange => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

  const from = input.from ? parseDateOnly(input.from, "start") : defaultFrom;
  const to = input.to ? parseDateOnly(input.to, "end") : now;

  if (from.getTime() > to.getTime()) {
    throw Object.assign(new Error("Invalid date range: from must be before to."), {
      statusCode: 400
    });
  }

  return {
    from,
    to,
    fromIso: toIsoDate(from),
    toIso: toIsoDate(to)
  };
};
