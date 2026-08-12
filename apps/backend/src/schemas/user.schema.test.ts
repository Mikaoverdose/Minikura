import { describe, expect, test } from "bun:test";
import { updateSuspensionSchema } from "./user.schema";

describe("updateSuspensionSchema", () => {
  test("accepts an RFC 3339 timestamp with timezone", () => {
    expect(
      updateSuspensionSchema.parse({
        isSuspended: true,
        suspendedUntil: "2026-08-13T12:30:00Z",
      }).suspendedUntil
    ).toBe("2026-08-13T12:30:00Z");
  });

  test.each(["not-a-date", "2026-08-13", "2026-08-13T12:30:00"])(
    "rejects invalid or timezone-free timestamp %s",
    (suspendedUntil) => {
      expect(
        updateSuspensionSchema.safeParse({ isSuspended: true, suspendedUntil }).success
      ).toBeFalse();
    }
  );
});
