import { describe, expect, it } from "vitest";
import { parseMcpTokens } from "@/lib/mcp/auth";

const token = (char: string) => char.repeat(32);

describe("mcp tokens", () => {
  it("keeps the single-token configuration working", () => {
    expect(parseMcpTokens({ MCP_TOKEN: token("a"), MCP_TOKEN_LABEL: "旧设备" })).toEqual([
      { label: "旧设备", token: token("a") },
    ]);
  });

  it("parses labeled tokens for multiple people", () => {
    const parsed = parseMcpTokens({
      MCP_TOKENS: `小王:${token("b")}, 小李:${token("c")}`,
    });
    expect(parsed).toEqual([
      { label: "小王", token: token("b") },
      { label: "小李", token: token("c") },
    ]);
  });

  it("ignores malformed or short entries", () => {
    const parsed = parseMcpTokens({
      MCP_TOKENS: `没有冒号, 短:${"d".repeat(10)}, 正常:${token("e")}, :${token("f")}`,
    });
    expect(parsed).toEqual([{ label: "正常", token: token("e") }]);
  });

  it("returns nothing when MCP is disabled", () => {
    expect(parseMcpTokens({})).toEqual([]);
  });
});
