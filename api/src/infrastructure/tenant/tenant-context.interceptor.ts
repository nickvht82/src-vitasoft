import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { AUTH_CONTEXT_KEY, type AuthContext } from "@vitasoft/auth";
import { ClsService } from "nestjs-cls";
import type { Observable } from "rxjs";
import { TENANT_ID_CLS_KEY } from "./tenant-context.js";

/** Request shape carrying the auth context populated by AuthGuard. */
interface RequestWithMaybeAuth {
  [AUTH_CONTEXT_KEY]?: AuthContext;
}

/**
 * Bridges the authenticated tenant into CLS so the Prisma tenant-scope extension
 * can read it without any layer passing `organizationId` down by hand.
 *
 * @remarks
 * Runs after guards (so `AuthGuard` has already attached the auth context) and
 * inside the CLS request context established by the nestjs-cls middleware. On
 * unauthenticated/public routes there is no auth context and nothing is set —
 * queries then run unscoped, which is correct for public data.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithMaybeAuth>();
    const organizationId = request[AUTH_CONTEXT_KEY]?.organizationId;
    if (organizationId && this.cls.isActive()) {
      this.cls.set(TENANT_ID_CLS_KEY, organizationId);
    }
    return next.handle();
  }
}
