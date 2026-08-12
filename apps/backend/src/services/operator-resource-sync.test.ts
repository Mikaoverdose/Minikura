import { describe, expect, test } from "bun:test";
import { operatorResourceName } from "./operator-resource-sync";

describe("operatorResourceName", () => {
  test("preserves short valid lowercase DNS names", () => {
    expect(operatorResourceName("survival-1")).toBe("survival-1");
  });

  test("rejects non-canonical IDs", () => {
    expect(() => operatorResourceName("Lobby_A")).toThrow("Invalid Kubernetes resource ID");
    expect(() => operatorResourceName("lobby-")).toThrow("Invalid Kubernetes resource ID");
  });

  test("keeps names short enough for operator-generated prefixes and suffixes", () => {
    expect(() => operatorResourceName("a".repeat(52))).toThrow("Invalid Kubernetes resource ID");
  });
});
