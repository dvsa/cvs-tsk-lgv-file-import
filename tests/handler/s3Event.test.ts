import event from '../resources/s3event.json';
import type { S3Event } from 'aws-lambda';
import * as fs from 'fs';
import { handler } from '../../src/s3Event';
import { EOL } from 'os';

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-var */
var promise: jest.Mock;
var filePull: { data: Buffer; filename: string }[] = [];
var mockSQS: { sendMessage: jest.Mock; promise: jest.Mock };

jest.mock('aws-sdk', () => {
  promise = jest.fn();
  mockSQS = {
    sendMessage: jest.fn().mockReturnThis(),
    promise,
  };
  return {
    SQS: jest.fn(() => mockSQS),
  };
});

jest.mock('../../src/filePull/fromS3', () => {
  var mockFilePull = {
    filePull: async () => Promise.resolve(filePull.pop()),
  };
  return mockFilePull;
});

describe('Test S3 Event Lambda Function', () => {
  beforeEach(() => {
    process.env.QUEUE_URL = 'FakeQueueUrl';
    jest.clearAllMocks();
  });
  it('should return success', async () => {
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    const eventMock: S3Event = event as S3Event;

    const res: string = (await handler(eventMock)) ?? '';

    expect(res).toBe(
      'All rows of Light Vehicles for VTM.xlsx processed successfully.',
    );
  });

  it('should send SQS event per row', async () => {
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    const eventMock: S3Event = event as S3Event;

    await handler(eventMock);

    expect(mockSQS.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockSQS.sendMessage).toHaveBeenCalledWith({
      QueueUrl: 'FakeQueueUrl',
      MessageBody: JSON.stringify({
        application: 'PSMVA1',
        vin: 'ABCDEF',
        vrm: 'C234',
        trl: 'CCC234',
        class: 'E',
        cycle: 'sidecar',
        cc: 1500,
        filename: 'Light Vehicles for VTM.xlsx',
        rowNumber: 3,
      }),
    });
  });

  it('should return success with multiple s3 events', async () => {
    const eventMock: S3Event = event as S3Event;
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    const res = await handler(eventMock);
    expect(res).toBe(
      'All rows of Light Vehicles for VTM.xlsx processed successfully.',
    );
  });

  it('should return error message with multiple s3 events if one breaks', async () => {
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    filePull.push({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: null as any,
      filename: 'Light Vehicles for VTM.xlsx',
    });

    const eventMock: S3Event = event as S3Event;
    const res = handler(eventMock);
    await expect(res).rejects.toThrow(
      'The file Light Vehicles for VTM.xlsx errored during processing.',
    );
  });

  it('should log the error message with the line number and continue processing', async () => {
    filePull.push({
      data: fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename: 'Light Vehicles for VTM.xlsx',
    });
    const errorMessage = 'things are broken';

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const consoleSpy = jest.spyOn(console._stdout, 'write');
    promise.mockRejectedValueOnce(new Error(errorMessage));

    const eventMock: S3Event = event as S3Event;
    await handler(eventMock);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      `error: Invalid data on row 3: ${errorMessage}${EOL}`,
    );
    expect(mockSQS.sendMessage).toHaveBeenCalledTimes(2);
  });
});
