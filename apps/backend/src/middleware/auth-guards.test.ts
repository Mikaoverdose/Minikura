import { describe, expect, test } from "bun:test";
import { assertAdmin } from "./auth-guards";

describe("assertAdmin", () => {
  test("allows administrators", () => {
    expect(() => assertAdmin({ role: "admin" })).not.toThrow();
  });

  test("rejects non-administrators", () => {
    expect(() => assertAdmin({ role: "user" })).toThrow("admin access required");
  });
});
