import type { Context, S3Event } from 'aws-lambda';
import { v4 } from 'uuid';
import { handler } from '../../src/handler/s3Event';
import event from '../resources/s3event.json';

describe('Test S3 Event Lambda Function', () => {
  test('should return 200 with a success message', async () => {
    const eventMock: S3Event = event as S3Event;
    const contextMock: Context = <Context>{ awsRequestId: v4() };

    const res: Record<string, unknown> = await handler(eventMock, contextMock);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual('Triggered with DOC-EXAMPLE-BUCKET');
  });
});
