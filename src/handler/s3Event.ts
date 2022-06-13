import 'dotenv/config';
import type { Context, S3Event } from 'aws-lambda';
import { createLogger, Logger } from '../util/logger';

/**
 * Lambda Handler
 *
 * @param {S3Event} event
 * @param {Context} context
 * @returns {Promise<Record<string, unknown>>}
 */
export const handler = async (
  event: S3Event,
  context: Context,
): Promise<Record<string, unknown>> => {
  const bucketName = event.Records[0].s3.bucket.name;
  const logger: Logger = createLogger(null, context);

  logger.info(`Triggered with ${bucketName}`);

  return Promise.resolve({
    statusCode: 200,
    body: `Triggered with ${bucketName}`,
  });
};
