import { ConflictException, NotFoundException } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { Test, type TestingModule } from "@nestjs/testing";
import { AUTH_INSTANCE } from "@vitasoft/auth";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CreateOrganizationHandler } from "../application/commands/create-organization.handler.js";
import { GetOrganizationHandler } from "../application/queries/get-organization.handler.js";
import { ListOrganizationsHandler } from "../application/queries/list-organizations.handler.js";
import { ORGANIZATION_REPOSITORY } from "../domain/organization.repository.js";
import { InMemoryOrganizationRepository } from "../testing/in-memory-organization.repository.js";
import { OrganizationsController } from "./organizations.controller.js";

/**
 * Integration test: the real controller drives the real CQRS buses and handlers,
 * with only the repository swapped for an in-memory fake. This exercises the full
 * presentation → application → domain flow without a database.
 */
describe("OrganizationsController (integration)", () => {
  let moduleRef: TestingModule;
  let controller: OrganizationsController;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [OrganizationsController],
      providers: [
        CreateOrganizationHandler,
        GetOrganizationHandler,
        ListOrganizationsHandler,
        {
          provide: ORGANIZATION_REPOSITORY,
          useClass: InMemoryOrganizationRepository,
        },
        // AuthGuard (on POST) needs AUTH_INSTANCE resolvable at compile time.
        // These tests call controller methods directly, so the guard never runs
        // — a stub is enough to satisfy the DI graph.
        { provide: AUTH_INSTANCE, useValue: {} },
      ],
    }).compile();

    await moduleRef.init();
    controller = moduleRef.get(OrganizationsController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("creates an organization and returns the wire shape", async () => {
    const created = await controller.create({ slug: "acme", name: "Acme Inc" });

    expect(created).toMatchObject({ slug: "acme", name: "Acme Inc" });
    expect(created.id).toBeTypeOf("string");
    expect(() => new Date(created.createdAt).toISOString()).not.toThrow();
  });

  it("fetches a created organization by id", async () => {
    const created = await controller.create({ slug: "acme", name: "Acme" });
    const fetched = await controller.getById(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it("maps a slug conflict to 409 ConflictException", async () => {
    await controller.create({ slug: "acme", name: "Acme" });
    await expect(
      controller.create({ slug: "acme", name: "Acme Two" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("maps a missing organization to 404 NotFoundException", async () => {
    await expect(controller.getById("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("lists organizations newest first", async () => {
    await controller.create({ slug: "a", name: "A" });
    // Guarantee distinct createdAt timestamps so ordering is deterministic.
    await new Promise((r) => setTimeout(r, 2));
    await controller.create({ slug: "b", name: "B" });
    const list = await controller.list();
    expect(list.map((o) => o.slug)).toEqual(["b", "a"]);
  });
});

/**
 * Unexpected (non-domain) errors must propagate unchanged — the controller only
 * translates known domain errors, and the global filter renders the rest as 500.
 */
describe("OrganizationsController (unexpected error propagation)", () => {
  function makeController(): OrganizationsController {
    const failing = new Error("infra down");
    const commandBus = { execute: () => Promise.reject(failing) };
    const queryBus = { execute: () => Promise.reject(failing) };
    return new OrganizationsController(
      commandBus as never,
      queryBus as never,
    );
  }

  it("re-throws a non-slug error from create", async () => {
    await expect(
      makeController().create({ slug: "acme", name: "Acme" }),
    ).rejects.toThrow("infra down");
  });

  it("re-throws a non-not-found error from getById", async () => {
    await expect(makeController().getById("any")).rejects.toThrow(
      "infra down",
    );
  });
});
