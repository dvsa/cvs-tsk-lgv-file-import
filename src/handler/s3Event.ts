import type { S3Event } from 'aws-lambda';
import logger from '../util/logger';
import { filePull } from '../filePull/fromS3';
import { configureFile } from '../fileConvert/fileConvert';
import { filePush } from '../filePush/filePush';

/**
 * Lambda Handler
 *
 * @param {S3Event} event
 * @param {Context} context
 * @returns {Promise<Record<string, unknown>>}
 */
export const handler = async (
  event: S3Event,
): Promise<Record<string, unknown>> => {
  const record = event.Records[0];
  const evlFile = await filePull(record);
  logger.info(`File contents ${evlFile.toString()}`);
  const filename = await configureFile(evlFile);
  logger.info('Wrote out file');
  await filePush(filename);
  logger.info('Uploaded file to SFTP');
  
  return Promise.resolve({
    statusCode: 204,
  });
};
