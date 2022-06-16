const mockConnect = jest.fn();
const mockFastPut = jest.fn();
const mockEnd = jest.fn();

jest.mock('ssh2-sftp-client', () => {
  return { 
    __esModule: true,
    default: jest.fn().mockImplementation(() =>{
      return { 
        connect: mockConnect,
        fastPut: mockFastPut,
        end: mockEnd,
      };
    }),
  };
});

import { filePush } from '../../src/filePush/filePush';

describe('test the push to SFTP server', () => {
  test('should allow me to push to sftp', async () => {
    mockConnect.mockReturnValue(Promise.resolve(true));
    mockFastPut.mockReturnValue(Promise.resolve('uploaded'));
    mockEnd.mockReturnValue(Promise.resolve(void 0));
    expect(await filePush('fakefile.txt')).toBe(void 0);
  });

  test('should error and not allow me to push to sftp', async () => {
    mockConnect.mockReturnValue(Promise.reject(new Error('no connection')));
    await expect(filePush('fakefile.txt')).rejects.toThrow(new Error('no connection'));
  });
});

