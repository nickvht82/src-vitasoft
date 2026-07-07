import { All, Controller, Inject, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { AUTH_INSTANCE, type Auth } from "@vitasoft/auth";
import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Catch-all bridge that forwards every `/v1/auth/*` request to better-auth's
 * framework-agnostic `handler` (web `Request` → `Response`) and streams the
 * response back through Fastify. This is the only place the raw better-auth
 * handler is exposed; all higher-level auth logic lives in `@vitasoft/auth`.
 *
 * @remarks
 * Excluded from Swagger — better-auth owns and documents these routes.
 */
@ApiExcludeController()
@Controller("auth")
export class AuthController {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: Auth) {}

  @All("*")
  async handle(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const webRequest = this.toWebRequest(request);
    const response = await this.auth.handler(webRequest);

    reply.status(response.status);
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });
    const body = response.body ? await response.text() : null;
    await reply.send(body);
  }

  /** Rebuild a web `Request` from the Fastify request (headers + body). */
  private toWebRequest(request: FastifyRequest): Request {
    const host = request.headers.host ?? "localhost";
    const url = new URL(request.url, `http://${host}`);
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value === undefined) continue;
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
    const hasBody =
      request.body !== undefined &&
      request.body !== null &&
      request.method !== "GET" &&
      request.method !== "HEAD";
    return new Request(url.toString(), {
      method: request.method,
      headers,
      body: hasBody ? JSON.stringify(request.body) : undefined,
    });
  }
}
