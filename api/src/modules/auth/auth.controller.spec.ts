import type { Auth } from "@vitasoft/auth";
import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, expect, it, vi } from "vitest";
import { AuthController } from "./auth.controller.js";

/** A Fastify reply spy that records status/headers/body. */
function fakeReply(): FastifyReply & {
  _status?: number;
  _headers: Record<string, string>;
  _body?: unknown;
} {
  const reply = {
    _headers: {} as Record<string, string>,
    status(code: number) {
      reply._status = code;
      return reply;
    },
    header(key: string, value: string) {
      reply._headers[key] = value;
      return reply;
    },
    async send(body: unknown) {
      reply._body = body;
      return reply;
    },
  } as unknown as FastifyReply & {
    _status?: number;
    _headers: Record<string, string>;
    _body?: unknown;
  };
  return reply;
}

function fakeRequest(overrides: Partial<FastifyRequest>): FastifyRequest {
  return {
    url: "/v1/auth/sign-in/email",
    method: "POST",
    headers: { host: "localhost:3001", "content-type": "application/json" },
    body: undefined,
    ...overrides,
  } as unknown as FastifyRequest;
}

describe("AuthController", () => {
  it("forwards the request to better-auth and streams the response back", async () => {
    const handler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "set-cookie": "better-auth.session_token=abc", "x-h": "1" },
      }),
    );
    const controller = new AuthController({ handler } as unknown as Auth);
    const reply = fakeReply();

    await controller.handle(
      fakeRequest({ body: { email: "a@b.co", password: "pw" } }),
      reply,
    );

    // The web Request handed to better-auth carries method, url, and JSON body.
    const webReq = handler.mock.calls[0][0] as Request;
    expect(webReq.method).toBe("POST");
    expect(webReq.url).toContain("/v1/auth/sign-in/email");
    expect(reply._status).toBe(200);
    expect(reply._headers["x-h"]).toBe("1");
    expect(reply._body).toBe(JSON.stringify({ ok: true }));
  });

  it("sends null for an empty response body (no double-read)", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const controller = new AuthController({ handler } as unknown as Auth);
    const reply = fakeReply();

    await controller.handle(fakeRequest({ method: "GET", body: undefined }), reply);

    expect(reply._status).toBe(204);
    expect(reply._body).toBeNull();
  });

  it("omits the body for GET/HEAD requests", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const controller = new AuthController({ handler } as unknown as Auth);

    await controller.handle(
      fakeRequest({ method: "GET", body: { should: "be ignored" } }),
      fakeReply(),
    );

    const webReq = handler.mock.calls[0][0] as Request;
    expect(webReq.body).toBeNull();
  });

  it("falls back to a localhost host when the header is absent", async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    const controller = new AuthController({ handler } as unknown as Auth);

    await controller.handle(
      fakeRequest({ headers: {}, method: "GET" }),
      fakeReply(),
    );

    const webReq = handler.mock.calls[0][0] as Request;
    expect(webReq.url).toContain("localhost");
  });
});
