import event from '../resources/sqsEvent.json';
import type { SQSEvent } from 'aws-lambda';
import { handler } from '../../src/handler/sqsEvent';
import {
  LightVehicleRecord,
  LightVehicleTechRecord,
} from '../../src/models/techRecords';

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-var */
var promise: jest.Mock;
var mockDynamo: { DocumentClient: jest.Mock };
var mockDocumentClient: { put: jest.Mock; promise: jest.Mock };
var mockLambdaService: {
  getTechRecord: jest.Mock;
  updateTechRecord: jest.Mock;
};

jest.mock('aws-sdk', () => {
  promise = jest.fn();
  mockDocumentClient = {
    put: jest.fn().mockReturnThis(),
    promise,
  };
  mockDynamo = {
    DocumentClient: jest.fn(() => mockDocumentClient),
  };
  return {
    DynamoDB: mockDynamo,
  };
});

jest.mock('../../src/services/lambdaService', () => {
  mockLambdaService = {
    getTechRecord: jest.fn(),
    updateTechRecord: jest.fn(),
  };
  return mockLambdaService;
});

const generateSQSEvent: () => SQSEvent = () =>
  JSON.parse(JSON.stringify(event)) as SQSEvent;

describe('Test SQS Event Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should return success with zero records', async () => {
    const eventMock = generateSQSEvent();
    eventMock.Records = [];
    const res = await handler(eventMock);

    expect(res.batchItemFailures).toHaveLength(0);
  });

  test('should run update process on each record', async () => {
    mockLambdaService.updateTechRecord.mockResolvedValue(true);
    const techRecord = {
      statusCode: 'current',
    } as unknown as LightVehicleTechRecord;
    const vehicle: LightVehicleRecord = {
      techRecord: [techRecord],
    } as unknown as LightVehicleRecord;

    mockLambdaService.getTechRecord.mockResolvedValue(vehicle);
    const eventMock = generateSQSEvent();
    const res = await handler(eventMock);

    expect(mockLambdaService.getTechRecord).toHaveBeenCalledTimes(1);
    expect(mockLambdaService.updateTechRecord).toHaveBeenCalledTimes(1);
    expect(res.batchItemFailures).toHaveLength(0);
  });

  test('should return failure if the update service returns non 200', async () => {
    mockLambdaService.updateTechRecord.mockResolvedValue(false);

    const techRecord = {
      statusCode: 'current',
    } as unknown as LightVehicleTechRecord;
    const vehicle: LightVehicleRecord = {
      techRecord: [techRecord],
    } as unknown as LightVehicleRecord;

    mockLambdaService.getTechRecord.mockResolvedValue(vehicle);
    const eventMock = generateSQSEvent();
    const res = await handler(eventMock);

    expect(res.batchItemFailures).toHaveLength(1);
  });
});
