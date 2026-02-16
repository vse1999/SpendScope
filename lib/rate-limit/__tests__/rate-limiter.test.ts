interface MockPipeline {
  zremrangebyscore: (key: string, min: number, max: number) => MockPipeline;
  zcard: (key: string) => MockPipeline;
  zadd: (key: string, entry: { score: number; member: string }) => MockPipeline;
  pexpire: (key: string, ttlMs: number) => MockPipeline;
  exec: () => Promise<[unknown, { result: number }, unknown, unknown]>;
}

interface MockRedisClient {
  pipeline: () => MockPipeline;
  zrem: (key: string, member: string) => Promise<number>;
  zrange: (
    key: string,
    start: number,
    stop: number,
    options: { withScores: boolean }
  ) => Promise<string[]>;
}

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn(),
}));

describe("rate-limiter", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("enforces auth limits in memory mode", async (): Promise<void> => {
    const { checkRateLimit } = await import("../rate-limiter");

    const identifier = `memory-user-${Date.now()}`;
    for (let index = 0; index < 5; index += 1) {
      const result = await checkRateLimit(identifier, { tier: "auth" });
      expect(result.allowed).toBe(true);
    }

    const blockedResult = await checkRateLimit(identifier, { tier: "auth" });
    expect(blockedResult.allowed).toBe(false);
  });

  it("removes the exact added Redis member when limit is exceeded", async (): Promise<void> => {
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.local";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

    const redisModule = await import("@upstash/redis");
    const redisConstructor = redisModule.Redis as unknown as jest.Mock;
    let addedMember: string | null = null;

    const pipeline: MockPipeline = {
      zremrangebyscore: jest.fn().mockReturnThis(),
      zcard: jest.fn().mockReturnThis(),
      zadd: jest.fn((_key: string, entry: { score: number; member: string }) => {
        addedMember = entry.member;
        return pipeline;
      }),
      pexpire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([null, { result: 5 }, null, null]),
    };

    const zrem = jest.fn().mockResolvedValue(1);
    const zrange = jest.fn().mockResolvedValue(["existing-member", String(Date.now())]);

    const redisClient: MockRedisClient = {
      pipeline: () => pipeline,
      zrem,
      zrange,
    };

    redisConstructor.mockImplementation(() => redisClient);

    const { checkRateLimit } = await import("../rate-limiter");
    const result = await checkRateLimit("redis-user-1", { tier: "auth" });

    expect(result.allowed).toBe(false);
    expect(addedMember).not.toBeNull();
    expect(zrem).toHaveBeenCalledWith("ratelimit:auth:redis-user-1", addedMember);
  });
});
