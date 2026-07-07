import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  AuthGuard,
  type AuthContext,
  CurrentUser,
} from "@vitasoft/auth";

/** Wire shape of `GET /v1/auth/me`. */
interface MeResponse {
  readonly user: AuthContext["user"];
  readonly organizationId: string | null;
  readonly role: string | null;
}

/**
 * Returns the authenticated principal: user + active organization + role.
 * Guarded by {@link AuthGuard} (401 without a valid session cookie).
 */
@ApiTags("auth")
@Controller("auth")
export class MeController {
  @Get("me")
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: "The authenticated user, org, and role." })
  me(@CurrentUser() auth: AuthContext): MeResponse {
    return {
      user: auth.user,
      organizationId: auth.organizationId ?? null,
      role: auth.role ?? null,
    };
  }
}
