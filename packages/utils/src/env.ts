export type CiFlags = {
  isCi: boolean;
  forbidOnly: boolean;
  retries: number;
  reuseExistingServer: boolean;
};

export const getCiFlags = (): CiFlags => {
  const isCi = Boolean(process.env.CI);

  return {
    isCi,
    forbidOnly: isCi,
    retries: isCi ? 1 : 0,
    reuseExistingServer: !isCi,
  };
};
