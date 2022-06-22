const mockS3 = {
  getObject: jest.fn().mockReturnThis(),
  promise: jest.fn(),
};

jest.mock('aws-sdk', () => {
  return { S3: jest.fn(() => mockS3) };
});

import event from '../resources/s3event.json';
import type { S3Event } from 'aws-lambda';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { filePull } from '../../src/filePull/fromS3';

describe('Test pull file from S3', () => {
  test('should return file content', async () => {
    const getObjectOutput: GetObjectOutput = {
      ContentType: 'text/csv',
      Body: Buffer.from('File content'),
    };
    mockS3.promise.mockResolvedValueOnce(getObjectOutput);
    const eventMock: S3Event = event as S3Event;
    const evlFileData = await filePull(eventMock.Records[0]);

    const expectedEvlFileData = {
      data: getObjectOutput.Body,
      filename: 'EVL_GVT_20220621.csv',
    };

    expect(evlFileData).toStrictEqual(expectedEvlFileData);
  });

  test('should return error if not text/csv', async () => {
    const getObjectOutput: GetObjectOutput = {
      ContentType: 'text/json',
      Body: Buffer.from('File content'),
    };
    mockS3.promise.mockResolvedValueOnce(getObjectOutput);
    const eventMock: S3Event = event as S3Event;

    await expect(async () => {
      await filePull(eventMock.Records[0]);
    }).rejects.toThrowError(
      "File with ETag undefined has content type of 'text/json' rather than 'text/csv'.",
    );
  });

  test('should return error if body not a Buffer', async () => {
    const getObjectOutput: GetObjectOutput = {
      ContentType: 'text/csv',
      ETag: 'c4c7b60167b533a5eae07b5ce38d7368',
      Body: 'File content',
    };
    mockS3.promise.mockResolvedValueOnce(getObjectOutput);
    const eventMock: S3Event = event as S3Event;

    await expect(async () => {
      await filePull(eventMock.Records[0]);
    }).rejects.toThrowError(
      'Body of object with ETag c4c7b60167b533a5eae07b5ce38d7368 is not a Buffer.',
    );
  });
});
