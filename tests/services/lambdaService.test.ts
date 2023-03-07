import { LgvExcelAttributes } from '../../src/models/lgvExcelAttributes';
import { getTechRecord } from '../../src/services/lambdaService';

const mockPromise = jest.fn();

process.env.LAMBDA_NAME = 'cvs-svc-local-tech-records';

jest.mock('aws-sdk', () => {
  return {
    Lambda: jest.fn(() => {
      return {
        invoke: jest.fn(() => ({ promise: mockPromise })),
      };
    }),
  };
});

describe('getTechRecord',  () => {
  it('should call the lambda and return the first record if there is only one', async () => {
    const mockVehicleRecords = [{ vin: 'foo' }];
    const mockBody = { body: JSON.stringify(mockVehicleRecords) };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await getTechRecord({ vin: 'foo' } as LgvExcelAttributes);
    expect(result).toEqual(mockVehicleRecords[0]);
  });
});
