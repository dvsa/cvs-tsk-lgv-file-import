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

jest.mock('../../src/util/getSecret', () => ({
  getSecret: jest.fn(() =>
    Promise.resolve(
      '{ "host" : "test", "username" : "user", "retries" : 3, "password": "psswrd" }',
    ),
  ),
}));

import { filePush, createConfig, Config } from '../../src/filePush/filePush';

describe('test the push to SFTP server', () => {
  process.env.EVL_SFTP_CONFIG = 'mockString';
  process.env.TFL_SFTP_CONFIG = 'mockString';

  test('should allow me to push to sftp', async () => {
    mockConnect.mockReturnValue(Promise.resolve(true));
    mockFastPut.mockReturnValue(Promise.resolve('uploaded'));
    mockEnd.mockReturnValue(Promise.resolve(void 0));
    expect(await filePush('fakefile.txt', 'evl')).toBe(void 0);
  });

  test('should allow me to push to sftp with TFL even', async () => {
    mockConnect.mockReturnValue(Promise.resolve(true));
    mockFastPut.mockReturnValue(Promise.resolve('uploaded'));
    mockEnd.mockReturnValue(Promise.resolve(void 0));
    expect(await filePush('fakefile.txt', 'tfl')).toBe(void 0);
  });

  test('should error and not allow me to push to sftp', async () => {
    mockConnect.mockReturnValue(Promise.reject(new Error('no connection')));
    await expect(filePush('fakefile.txt', 'evl')).rejects.toThrow(
      new Error('no connection'),
    );
  });
});

describe('test the create config function', () => {
  test('the config is correct', async () => {
    const config = await createConfig('evl');
    const expectedConfig: Config = {
      host: 'test',
      username: 'user',
      retries: 3,
      password: 'psswrd',
    };

    expect(config).toStrictEqual(expectedConfig);
  });

  test('the config throws an error on wrong event type', async () => {
    expect.assertions(1);
    delete process.env.EVL_SFTP_CONFIG;
    await expect(createConfig('evl')).rejects.toThrow(
      new Error('Unexpected token u in JSON at position 0'),
    );
  });
});
