import { getSecret } from '../../src/util/getSecret';

jest.mock('aws-sdk', () => {
  const mSecretsManagerInstance = {
    getSecretValue: () => {
      return {
        promise: jest
          .fn()
          .mockReturnValue({ SecretString: 'Secret From Secrets Manager' }),
      };
    },
  };
  const mSecretsManager = jest.fn(() => mSecretsManagerInstance);

  return { SecretsManager: mSecretsManager };
});

describe('getSecret functions', () => {
  it('GIVEN a variable WHEN variable not local THEN get variable from Secrets Manager.', async () => {
    const value = await getSecret('SecretVariable');

    expect(value).toBe('Secret From Secrets Manager');
  });

  it('GIVEN a variable WHEN variable found locally THEN get variable from process.env.', async () => {
    process.env.SecretVariable = 'Local Secret';
    const value = await getSecret('SecretVariable');

    expect(value).toBe('Local Secret');
  });
});
