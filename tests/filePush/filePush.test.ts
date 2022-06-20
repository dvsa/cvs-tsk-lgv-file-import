const mockConnect = jest.fn();
const mockFastPut = jest.fn();
const mockEnd = jest.fn();

jest.mock('ssh2-sftp-client', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {
        connect: mockConnect,
        fastPut: mockFastPut,
        end: mockEnd,
      };
    }),
  };
});

import { filePush, createConfig, Config } from '../../src/filePush/filePush';

describe('test the push to SFTP server', () => {
  test('should allow me to push to sftp', async () => {
    process.env.SFTP_Password = 'testPassword';
    mockConnect.mockReturnValue(Promise.resolve(true));
    mockFastPut.mockReturnValue(Promise.resolve('uploaded'));
    mockEnd.mockReturnValue(Promise.resolve(void 0));
    expect(await filePush('fakefile.txt')).toBe(void 0);
  });

  test('should error and not allow me to push to sftp', async () => {
    process.env.SFTP_Password = 'testPassword';
    mockConnect.mockReturnValue(Promise.reject(new Error('no connection')));
    await expect(filePush('fakefile.txt')).rejects.toThrow(
      new Error('no connection'),
    );
  });
});

describe('test the create config function', () => {
  afterEach(() => {
    delete process.env.SFTP_Password;
    delete process.env.SFTP_PrivateKey;
  });

  test('the config is correct with just a password supplied', () => {
    process.env.SFTP_Password = 'testPassword';
    const config = createConfig();
    const expectedConfig: Config = {
      host: process.env.SFTP_Host,
      username: process.env.SFTP_User,
      retries: 3,
      password: 'testPassword',
    };

    expect(config).toStrictEqual(expectedConfig);
  });

  test('the config is correct with just a privateKey supplied', () => {
    process.env.SFTP_PrivateKey = 'privateKey';
    const config = createConfig();
    const expectedConfig: Config = {
      host: process.env.SFTP_Host,
      username: process.env.SFTP_User,
      retries: 3,
      privateKey: 'privateKey',
    };

    expect(config).toStrictEqual(expectedConfig);
  });

  test('the config is correct with both a privateKey and password supplied', () => {
    process.env.SFTP_Password = 'testPassword';
    process.env.SFTP_PrivateKey = 'privateKey';
    const config = createConfig();
    const expectedConfig: Config = {
      host: process.env.SFTP_Host,
      username: process.env.SFTP_User,
      retries: 3,
      privateKey: 'privateKey',
    };

    expect(config).toStrictEqual(expectedConfig);
  });

  test('the config throws an error if no password or key is supplied', () => {
    expect.assertions(1);

    try {
      createConfig();
    } catch (error) {
      expect(error).toHaveProperty(
        'message',
        'No password or private key found, please check the env variables',
      );
    }
  });
});
