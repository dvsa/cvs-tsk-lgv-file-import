import event from '../resources/sqsEvent.json';
import type { SQSEvent } from 'aws-lambda';
import { handler } from '../../src/handler/sqsEvent';

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable no-var */
var promise: jest.Mock;
var mockDynamo: { DocumentClient: jest.Mock };
var mockDocumentClient: { put: jest.Mock; promise: jest.Mock };

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
});
