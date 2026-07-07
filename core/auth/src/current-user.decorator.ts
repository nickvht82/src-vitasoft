import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import {
  AUTH_CONTEXT_KEY,
  type AuthContext,
  type RequestWithAuth,
} from "./auth-context.js";

/**
 * Injects the {@link AuthContext} populated by {@link AuthGuard} into a handler
 * parameter. Only meaningful on routes guarded by `AuthGuard`.
 *
 * @example
 * ⁣@Get("me")
 * me(⁣@CurrentUser() ctx: AuthContext) { return ctx.user; }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    return request[AUTH_CONTEXT_KEY];
  },
);
