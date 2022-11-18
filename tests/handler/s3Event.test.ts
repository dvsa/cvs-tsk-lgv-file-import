import event from '../resources/s3event.json';
import type { S3Event } from 'aws-lambda';
import { handler } from '../../src/handler/s3Event';
import * as fs from 'fs';

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-var */
var promise:jest.Mock = jest.fn();
var filePull:{ data:Buffer, filename:string }[] = [];
var mockSQS = {
  promise,
};

jest.mock('aws-sdk', () => {
  return {
    SQS: jest.fn().mockImplementation(() => { return mockSQS; }),
  };
});

jest.mock('../../src/filePull/fromS3', () => {
  var mockFilePull = {
    filePull:async () => Promise.resolve(filePull.pop()),
  };
  return mockFilePull;
});

describe('Test S3 Event Lambda Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('should return 204', async () => {
    filePull.push({
      data:fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename:'Light Vehicles for VTM.xlsx' });
    const eventMock: S3Event = event as S3Event;

    const res: string = await handler(eventMock);

    expect(res).toBe('All rows of Light Vehicles for VTM.xlsx processed successfully.');
  });

  test('should return 204 with multiple s3 events', async () => {
    const eventMock: S3Event = event as S3Event;
    filePull.push({
      data:fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename:'Light Vehicles for VTM.xlsx' });
    filePull.push({
      data:fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename:'Light Vehicles for VTM.xlsx' });
    const res = await handler(eventMock);
    expect(res).toBe('All rows of Light Vehicles for VTM.xlsx processed successfully.');
  });

  test('should return error message with multiple s3 events if one breaks', async () => {
    filePull.push({
      data:fs.readFileSync('./tests/resources/Light Vehicles for VTM.xlsx'),
      filename:'Light Vehicles for VTM.xlsx' });
    filePull.push({
      data:null,
      filename:'Light Vehicles for VTM.xlsx' });

    const eventMock: S3Event = event as S3Event;
    const res = handler(eventMock);
    await expect(res).rejects.toThrow(
      'The file Light Vehicles for VTM.xlsx errored during processing.',
    );
  });
});
