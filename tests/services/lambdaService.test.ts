import { LgvExcelAttributes } from '../../src/models/lgvExcelAttributes';
import { LightVehicleRecord } from '../../src/models/techRecords';
import {
  createTechRecord,
  getTechRecord,
  updateTechRecord,
} from '../../src/services/lambdaService';

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

describe('getTechRecord', () => {
  it('should call the lambda and return the first record if there is only one', async () => {
    const mockVehicleRecords = [{ vin: 'foo' }];
    const mockBody = { body: JSON.stringify(mockVehicleRecords) };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await getTechRecord({ vin: 'foo' } as LgvExcelAttributes);
    expect(result).toEqual(mockVehicleRecords[0]);
  });
  it('should return the vehicle with the matching vrm', async () => {
    const mockVehicleRecords = [
      { vin: 'foo', primaryVrm: 'another Vrm' },
      { vin: 'foo', primaryVrm: 'foobar' },
    ];
    const mockBody = { body: JSON.stringify(mockVehicleRecords) };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await getTechRecord({
      vin: 'foo',
      vrm: 'foobar',
    } as LgvExcelAttributes);
    expect(result).toEqual(mockVehicleRecords[1]);
  });
});

describe('updateTechRecords', () => {
  it('should call the update endpoint and return true if it updated', async () => {
    const mockBody = { body: 'Tech Record Updated', statusCode: 200 };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await updateTechRecord(
      {
        vin: 'foo',
        systemNumber: 'bar',
      } as LightVehicleRecord,
      {} as LgvExcelAttributes,
    );
    expect(result).toBe(true);
  });
  it('should call the update endpoint and return false if it did not update', async () => {
    const mockBody = { body: 'axles is required', statusCode: 400 };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await updateTechRecord(
      {
        vin: 'foo',
        systemNumber: 'bar',
      } as LightVehicleRecord,
      {} as LgvExcelAttributes,
    );
    expect(result).toBe(false);
  });
});

describe('createTechRecords', () => {
  it('should call the update endpoint and return true if it created', async () => {
    const mockBody = { body: 'Tech Record Updated', statusCode: 201 };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await createTechRecord(
      {
        vin: 'foo',
        systemNumber: 'bar',
      } as LightVehicleRecord,
      {} as LgvExcelAttributes,
    );
    expect(result).toBe(true);
  });
  it('should call the update endpoint and return false if it did not create', async () => {
    const mockBody = { body: 'axles is required', statusCode: 400 };
    const mockBuffer = Buffer.from(JSON.stringify(mockBody));
    mockPromise.mockResolvedValueOnce({ Payload: mockBuffer });
    const result = await createTechRecord(
      {
        vin: 'foo',
        systemNumber: 'bar',
      } as LightVehicleRecord,
      {} as LgvExcelAttributes,
    );
    expect(result).toBe(false);
  });
});
