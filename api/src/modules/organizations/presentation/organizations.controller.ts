import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthGuard } from "@vitasoft/auth";
import { ZodValidationPipe } from "@vitasoft/http-kit";
import { CreateOrganizationCommand } from "../application/commands/create-organization.command.js";
import { GetOrganizationQuery } from "../application/queries/get-organization.query.js";
import { ListOrganizationsQuery } from "../application/queries/list-organizations.query.js";
import type { Organization } from "../domain/organization.entity.js";
import {
  OrganizationNotFoundError,
  OrganizationSlugTakenError,
} from "../domain/organization.errors.js";
import {
  type CreateOrganizationDto,
  createOrganizationSchema,
  type OrganizationResponse,
  toOrganizationResponse,
} from "./organization.dto.js";

/**
 * HTTP boundary for organizations. Depends only on the CQRS buses — it never
 * touches a service or repository directly. Domain errors are translated to
 * HTTP exceptions here (then rendered as RFC 7807 by the global filter).
 */
@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiCreatedResponse({ description: "Organization created." })
  @UsePipes(new ZodValidationPipe(createOrganizationSchema))
  async create(
    @Body() body: CreateOrganizationDto,
  ): Promise<OrganizationResponse> {
    try {
      const organization = await this.commandBus.execute<
        CreateOrganizationCommand,
        Organization
      >(new CreateOrganizationCommand(body.slug, body.name));
      return toOrganizationResponse(organization);
    } catch (error) {
      if (error instanceof OrganizationSlugTakenError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Get(":id")
  @ApiOkResponse({ description: "The organization." })
  async getById(@Param("id") id: string): Promise<OrganizationResponse> {
    try {
      const organization = await this.queryBus.execute<
        GetOrganizationQuery,
        Organization
      >(new GetOrganizationQuery(id));
      return toOrganizationResponse(organization);
    } catch (error) {
      if (error instanceof OrganizationNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  @Get()
  @ApiOkResponse({ description: "All organizations, newest first." })
  async list(): Promise<OrganizationResponse[]> {
    const organizations = await this.queryBus.execute<
      ListOrganizationsQuery,
      Organization[]
    >(new ListOrganizationsQuery());
    return organizations.map(toOrganizationResponse);
  }
}
