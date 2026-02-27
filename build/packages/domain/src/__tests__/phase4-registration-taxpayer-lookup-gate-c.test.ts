import { beforeEach, describe, expect, it, vi } from "vitest";
import { _clearRegistrationStore } from "../registration/index.js";

const registrationRepoMock = {
  saveRegistration: vi.fn(async () => {}),
  findRegistration: vi.fn(async () => null),
  findRegistrationsByTaxpayerId: vi.fn(async () => []),
  updateRegistration: vi.fn(async () => null),
  updateRegistrationStatus: vi.fn(async () => {}),
  loadIntoMemory: vi.fn(async () => {}),
  ensureRecurringObligationsForTaxpayer: vi.fn(async () => []),
};

const registrationPublisherMock = {
  publishRegistrationCreated: vi.fn(async () => {}),
  publishRegistrationDeregistered: vi.fn(async () => {}),
  publishRegistrationTransferred: vi.fn(async () => {}),
};

vi.mock("../../../../services/registration-service/src/db/repository.js", () => {
  return {
    RegistrationRepository: class RegistrationRepository {
      async saveRegistration(...args: unknown[]): Promise<void> {
        await registrationRepoMock.saveRegistration(...args);
      }
      async findRegistration(...args: unknown[]): Promise<unknown> {
        return registrationRepoMock.findRegistration(...args);
      }
      async findRegistrationsByTaxpayerId(...args: unknown[]): Promise<unknown[]> {
        return registrationRepoMock.findRegistrationsByTaxpayerId(...args);
      }
      async updateRegistration(...args: unknown[]): Promise<unknown> {
        return registrationRepoMock.updateRegistration(...args);
      }
      async updateRegistrationStatus(...args: unknown[]): Promise<void> {
        await registrationRepoMock.updateRegistrationStatus(...args);
      }
      async loadIntoMemory(...args: unknown[]): Promise<void> {
        await registrationRepoMock.loadIntoMemory(...args);
      }
      async ensureRecurringObligationsForTaxpayer(...args: unknown[]): Promise<unknown[]> {
        return registrationRepoMock.ensureRecurringObligationsForTaxpayer(...args);
      }
    },
  };
});

vi.mock("../../../../services/registration-service/src/events/publisher.js", () => {
  return {
    RegistrationEventPublisher: class RegistrationEventPublisher {
      async publishRegistrationCreated(...args: unknown[]): Promise<void> {
        await registrationPublisherMock.publishRegistrationCreated(...args);
      }
      async publishRegistrationDeregistered(...args: unknown[]): Promise<void> {
        await registrationPublisherMock.publishRegistrationDeregistered(...args);
      }
      async publishRegistrationTransferred(...args: unknown[]): Promise<void> {
        await registrationPublisherMock.publishRegistrationTransferred(...args);
      }
    },
  };
});

function makeKafkaStub() {
  return {
    producer: () => ({
      connect: async () => {},
      send: async () => {},
      disconnect: async () => {},
    }),
  } as unknown;
}

describe("Phase 4 registration lookup contract [gate:C][backlog:TB-S4B-03]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _clearRegistrationStore();
    registrationRepoMock.findRegistrationsByTaxpayerId.mockResolvedValue([]);
    registrationRepoMock.ensureRecurringObligationsForTaxpayer.mockResolvedValue([]);
    registrationRepoMock.updateRegistration.mockResolvedValue(null);
  });

  it("[case:TC-PORTAL-ADM-01] returns empty list when taxpayer has no registrations", async () => {
    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "GET",
      url: "/registrations?taxpayer_id=tp-search-none",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().taxpayer_id).toBe("tp-search-none");
    expect(res.json().registrations).toEqual([]);
    expect(res.json().trace_id).toBeTypeOf("string");
    await app.close();
  });

  it("[case:TC-PORTAL-ADM-02] returns single registration for taxpayer", async () => {
    registrationRepoMock.findRegistrationsByTaxpayerId.mockResolvedValueOnce([
      {
        registration_id: "reg-1",
        taxpayer_id: "tp-search-one",
        cvr_number: "12345678",
        annual_turnover_dkk: 60000,
        status: "pending_registration",
        cadence: "quarterly",
      },
    ]);
    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "GET",
      url: "/registrations?taxpayer_id=tp-search-one",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().registrations).toHaveLength(1);
    expect(res.json().registrations[0].registration_id).toBe("reg-1");
    await app.close();
  });

  it("[case:TC-PORTAL-ADM-03] returns multiple registrations for taxpayer", async () => {
    registrationRepoMock.findRegistrationsByTaxpayerId.mockResolvedValueOnce([
      {
        registration_id: "reg-a",
        taxpayer_id: "tp-search-many",
        cvr_number: "12345678",
        annual_turnover_dkk: 60000,
        status: "registered",
        cadence: "quarterly",
      },
      {
        registration_id: "reg-b",
        taxpayer_id: "tp-search-many",
        cvr_number: "87654321",
        annual_turnover_dkk: 200000,
        status: "registered",
        cadence: "monthly",
      },
    ]);
    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "GET",
      url: "/registrations?taxpayer_id=tp-search-many",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().registrations).toHaveLength(2);
    expect(res.json().registrations.map((x: { registration_id: string }) => x.registration_id)).toEqual([
      "reg-a",
      "reg-b",
    ]);
    await app.close();
  });

  it("[case:TC-PORTAL-ADM-04] creating active registration seeds recurring obligations", async () => {
    registrationRepoMock.ensureRecurringObligationsForTaxpayer.mockResolvedValueOnce([
      { obligation_id: "obl-1" },
      { obligation_id: "obl-2" },
    ]);

    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });

    const res = await app.inject({
      method: "POST",
      url: "/registrations",
      payload: {
        taxpayer_id: "tp-active-seed",
        cvr_number: "12345678",
        annual_turnover_dkk: 60000,
        business_profile: {
          status: "active",
          effective_date: "2026-01-01",
        },
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe("registered");
    expect(res.json().obligations_created).toBe(2);
    expect(registrationRepoMock.updateRegistrationStatus).toHaveBeenCalled();
    expect(registrationRepoMock.ensureRecurringObligationsForTaxpayer).toHaveBeenCalledWith(
      expect.objectContaining({
        taxpayer_id: "tp-active-seed",
        cadence: "half_yearly",
        effective_date: "2026-01-01",
      }),
    );
    await app.close();
  });

  it("[case:TC-PORTAL-ADM-05] PUT updates existing registration in place without creating duplicate snapshots", async () => {
    registrationRepoMock.findRegistration.mockResolvedValueOnce({
      registration_id: "11111111-1111-4111-8111-111111111111",
      taxpayer_id: "tp-update",
      cvr_number: "12345678",
      annual_turnover_dkk: 60000,
      status: "pending_registration",
      cadence: "half_yearly",
      business_profile: { status: "pending" },
      contact: { email: "old@example.com" },
      address: { city: "Aarhus" },
    });
    registrationRepoMock.updateRegistration.mockResolvedValueOnce({
      registration_id: "11111111-1111-4111-8111-111111111111",
      taxpayer_id: "tp-update",
      cvr_number: "12345678",
      annual_turnover_dkk: 7_000_000,
      status: "registered",
      cadence: "quarterly",
    });

    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const res = await app.inject({
      method: "PUT",
      url: "/registrations/11111111-1111-4111-8111-111111111111",
      payload: {
        taxpayer_id: "tp-update",
        cvr_number: "12345678",
        annual_turnover_dkk: 7_000_000,
        business_profile: { status: "active", effective_date: "2026-01-01" },
        contact: { email: "new@example.com" },
        address: { city: "Copenhagen" },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().registration_id).toBe("11111111-1111-4111-8111-111111111111");
    expect(registrationRepoMock.saveRegistration).not.toHaveBeenCalled();
    expect(registrationRepoMock.updateRegistration).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.objectContaining({
        cadence: "quarterly",
        status: "registered",
      }),
    );
    await app.close();
  });

  it("[case:TC-PORTAL-ADM-06] PATCH updates cadence-driving turnover without creating new registration rows", async () => {
    registrationRepoMock.findRegistration.mockResolvedValueOnce({
      registration_id: "22222222-2222-4222-8222-222222222222",
      taxpayer_id: "tp-patch",
      cvr_number: "87654321",
      annual_turnover_dkk: 7_000_000,
      status: "registered",
      cadence: "quarterly",
      business_profile: { status: "active", effective_date: "2026-02-01" },
      contact: { email: "patch@example.com" },
      address: { city: "Odense" },
    });
    registrationRepoMock.updateRegistration.mockResolvedValueOnce({
      registration_id: "22222222-2222-4222-8222-222222222222",
      taxpayer_id: "tp-patch",
      cvr_number: "87654321",
      annual_turnover_dkk: 55_000_000,
      status: "registered",
      cadence: "monthly",
    });

    const { buildApp } = await import("../../../../services/registration-service/src/app.js");
    const app = buildApp({ sql: {} as never, kafka: makeKafkaStub() as never });
    const res = await app.inject({
      method: "PATCH",
      url: "/registrations/22222222-2222-4222-8222-222222222222",
      payload: {
        annual_turnover_dkk: 55_000_000,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().registration_id).toBe("22222222-2222-4222-8222-222222222222");
    expect(res.json().cadence).toBe("monthly");
    expect(registrationRepoMock.saveRegistration).not.toHaveBeenCalled();
    expect(registrationRepoMock.updateRegistration).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      expect.objectContaining({
        annual_turnover_dkk: 55_000_000,
        cadence: "monthly",
      }),
    );
    await app.close();
  });
});
