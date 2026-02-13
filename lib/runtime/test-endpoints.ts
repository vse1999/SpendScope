export function areTestEndpointsEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_ENDPOINTS === "true"
  );
}

