import event from '../resources/sqsEvent.json';
import type { SQSEvent } from 'aws-lambda';
import {
  LightVehicleRecord,
  LightVehicleTechRecord,
} from '../../src/models/techRecords';
import {
  Application,
  LgvExcelAttributes,
} from '../../src/models/lgvExcelAttributes';
import {
  handler,
  processVehicleSubclass,
  updateFromModel,
} from '../../src/sqsEvent';

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-var */
var promise: jest.Mock;
var mockDynamo: { DocumentClient: jest.Mock };
var mockDocumentClient: { put: jest.Mock; promise: jest.Mock };
var mockLambdaService: {
  getTechRecord: jest.Mock;
  updateTechRecord: jest.Mock;
  createTechRecord: jest.Mock;
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
    createTechRecord: jest.fn(),
  };
  return mockLambdaService;
});

const generateSQSEvent: () => SQSEvent = () =>
  JSON.parse(JSON.stringify(event)) as SQSEvent;

describe('Test SQS Event Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should return success with zero records', async () => {
    const eventMock = generateSQSEvent();
    eventMock.Records = [];
    const res = await handler(eventMock);

    expect(res.batchItemFailures).toHaveLength(0);
  });

  it('should run update process on each record', async () => {
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

  it('should return failure if the update service returns non 200', async () => {
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

  it('should throw an error if there is no single current record', () => {
    expect(() => {
      updateFromModel(
        { techRecord: [] } as unknown as LightVehicleRecord,
        {} as unknown as LgvExcelAttributes,
      );
    }).toThrow();
    expect(() => {
      updateFromModel(
        {
          techRecord: [{ statusCode: 'current' }, { statusCode: 'current' }],
        } as unknown as LightVehicleRecord,
        {} as LgvExcelAttributes,
      );
    }).toThrow();
  });

  it('should set the vehicle type as car for an IVA1C', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = { application: Application.IVA1C } as LgvExcelAttributes;
    const result = updateFromModel(record, excelRows);
    expect(result?.techRecord[0].vehicleType).toBe('car');
  });

  it('should set the vehicle type as motorycle for an MVSA', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = {
      application: Application.MSVA,
      cycle: 'bike',
    } as LgvExcelAttributes;
    const result = updateFromModel(record, excelRows);
    expect(result?.techRecord[0].vehicleType).toBe('motorcycle');
  });

  it('should set vehicle class to class 2 if there is a sidecar', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = {
      application: Application.MSVA,
      cycle: 'bike and sidecar',
    } as LgvExcelAttributes;
    const result = updateFromModel(record, excelRows);
    expect(result?.techRecord[0].vehicleType).toBe('motorcycle');
    expect(result?.techRecord[0].vehicleClass?.code).toBe('2');
    expect(result?.techRecord[0].vehicleClass?.description).toBe(
      'motorbikes over 200cc or with a sidecar',
    );
  });
  it('should set the vehicle type to LGV', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = {
      application: Application.MSVA,
      cycle: 'bike and sidecar',
    } as LgvExcelAttributes;
    const result = updateFromModel(record, excelRows);
    expect(result?.techRecord[0].vehicleType).toBe('motorcycle');
    expect(result?.techRecord[0].vehicleClass?.code).toBe('2');
    expect(result?.techRecord[0].vehicleClass?.description).toBe(
      'motorbikes over 200cc or with a sidecar',
    );
  });
  it('should be undefined for a 1P application', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = {
      application: Application._1P,
      cycle: 'bike',
    } as LgvExcelAttributes;
    const result = updateFromModel(record, excelRows);
    expect(result).toBeUndefined();
  });
  const testCases = [
    {
      expectedNumberOfWheels: 1,
      cycle: 'bike',
    },
    {
      expectedNumberOfWheels: 1,
      cycle: 'bike and sidecar',
    },
    {
      expectedNumberOfWheels: 2,
      cycle: 'trike',
    },
    {
      expectedNumberOfWheels: 3,
      cycle: 'quad',
    },
  ];
  it.each(testCases)(
    'should set the numberOfWheelsDriven',
    ({ expectedNumberOfWheels, cycle }) => {
      const record = {
        techRecord: [{ statusCode: 'current' }],
      } as LightVehicleRecord;
      const excelRows = {
        application: Application.MSVA,
        cycle,
      } as LgvExcelAttributes;
      const result = updateFromModel(record, excelRows);
      expect(result?.techRecord[0].vehicleType).toBe('motorcycle');
      expect(result?.techRecord[0].numberOfWheelsDriven).toBe(
        expectedNumberOfWheels,
      );
    },
  );

  it('should throw an error', () => {
    const record = {
      techRecord: [{ statusCode: 'current' }],
    } as LightVehicleRecord;
    const excelRows = {
      application: 'application is not real',
    } as LgvExcelAttributes;
    expect(() => {
      updateFromModel(record, excelRows);
    }).toThrow();
  });
});

describe('vehicleSubclass', () => {
  const testCases = [
    {
      input: 'R',
      expected: 'r',
    },
    {
      input: 'R WAV',
      expected: 'r',
    },
    {
      input: 'M Class M',
      expected: 'm',
    },
    {
      input: 'N1',
      expected: 'n',
    },
    {
      input: 'n1',
      expected: 'n',
    },
    {
      input: 'NM1',
      expected: 'nm',
    },
    {
      input: 'L',
      expected: 'l',
    },
    {
      input: 'RW',
      expected: 'rw',
    },
  ];
  it.each(testCases)(
    'should generate the $expected subclass for input $input',
    ({ input, expected }) => {
      expect(processVehicleSubclass(input)).toEqual(expected.split(''));
    },
  );
});
