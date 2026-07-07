import { describe, expect, it } from "vitest";
import { parseRedisConnection } from "./connection.js";

describe("parseRedisConnection", () => {
  it("parses host and port from a basic redis URL", () => {
    const conn = parseRedisConnection("redis://localhost:6379") as Record<
      string,
      unknown
    >;
    expect(conn.host).toBe("localhost");
    expect(conn.port).toBe(6379);
    // BullMQ workers require this to be null.
    expect(conn.maxRetriesPerRequest).toBeNull();
  });

  it("defaults the port to 6379 when omitted", () => {
    const conn = parseRedisConnection("redis://cache") as Record<
      string,
      unknown
    >;
    expect(conn.port).toBe(6379);
  });

  it("extracts username and password credentials", () => {
    const conn = parseRedisConnection(
      "redis://user:s3cret@host:6380",
    ) as Record<string, unknown>;
    expect(conn.username).toBe("user");
    expect(conn.password).toBe("s3cret");
    expect(conn.port).toBe(6380);
  });

  it("enables TLS for rediss:// URLs", () => {
    const conn = parseRedisConnection("rediss://host:6379") as Record<
      string,
      unknown
    >;
    expect(conn.tls).toEqual({});
  });

  it("selects a logical database from the path", () => {
    const conn = parseRedisConnection("redis://host:6379/3") as Record<
      string,
      unknown
    >;
    expect(conn.db).toBe(3);
  });

  it("throws on a non-URL string", () => {
    expect(() => parseRedisConnection("not a url")).toThrow(/Invalid REDIS_URL/);
  });

  it("throws on a non-redis protocol", () => {
    expect(() => parseRedisConnection("http://host:6379")).toThrow(
      /expected redis: or rediss:/,
    );
  });
});
