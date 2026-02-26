import { beforeEach, describe, expect, it, vi } from "vitest";

const registrationRepoMock = {
  saveRegistration: vi.fn(async () => {}),
  findRegistration: vi.fn(async () => null),
  findRegistrationsByTaxpayerId: vi.fn(async () => []),
  updateRegistrationStatus: vi.fn(async () => {}),
  loadIntoMemory: vi.fn(async () => {}),
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
      async updateRegistrationStatus(...args: unknown[]): Promise<void> {
        await registrationRepoMock.updateRegistrationStatus(...args);
      }
      async loadIntoMemory(...args: unknown[]): Promise<void> {
        await registrationRepoMock.loadIntoMemory(...args);
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
    registrationRepoMock.findRegistrationsByTaxpayerId.mockResolvedValue([]);
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
});
