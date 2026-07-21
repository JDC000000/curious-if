import { describe, expect, it } from "vitest";
import { parseArchiveMonthParams } from "@/lib/archiveDate";

const FIXED_NOW = new Date("2026-07-21T00:00:00Z");

describe("parseArchiveMonthParams", () => {
  it("accepts a valid archive year and month", () => {
    expect(parseArchiveMonthParams("2026", "7", FIXED_NOW)).toEqual({ year: 2026, month: 7 });
    expect(parseArchiveMonthParams("2027", "12", FIXED_NOW)).toEqual({ year: 2027, month: 12 });
  });

  it("rejects an absurd year before Date construction can throw", () => {
    expect(parseArchiveMonthParams("999999998", "1", FIXED_NOW)).toBeNull();
  });

  it("rejects malformed years and out-of-range months", () => {
    expect(parseArchiveMonthParams("2026abc", "1", FIXED_NOW)).toBeNull();
    expect(parseArchiveMonthParams("2026", "0", FIXED_NOW)).toBeNull();
    expect(parseArchiveMonthParams("2026", "13", FIXED_NOW)).toBeNull();
  });
});
