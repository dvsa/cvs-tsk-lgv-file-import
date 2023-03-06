import event from '../resources/s3event.json';
import type { S3Event } from 'aws-lambda';
import * as fs from 'fs';
import { handler } from '../../src/s3Event';

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

    const res: string = await handler(eventMock);

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
        rowNumber: 2,
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
      data: null,
      filename: 'Light Vehicles for VTM.xlsx',
    });

    const eventMock: S3Event = event as S3Event;
    const res = handler(eventMock);
    await expect(res).rejects.toThrow(
      'The file Light Vehicles for VTM.xlsx errored during processing.',
    );
  });
});
