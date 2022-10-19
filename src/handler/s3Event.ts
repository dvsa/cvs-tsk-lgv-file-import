/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import type { S3Event, S3EventRecord } from 'aws-lambda';
import { configureEvlFile } from '../fileConvert/fileConvert';
import { filePull } from '../filePull/fromS3';
import { filePush } from '../filePush/filePush';
import { randomUUID } from 'crypto';
import logger from '../util/logger';

const handleEvlEvent = async (record: S3EventRecord) => {
  const workingDir = `/tmp/evl/${randomUUID()}/`;
  try {
    fs.mkdirSync(workingDir, { recursive: true });
    const evlFileData = await filePull(record);
    const filepath = await configureEvlFile(
      workingDir,
      evlFileData.data,
      evlFileData.filename,
    );
    await filePush(filepath, 'evl');
  } finally {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }
};

const handleTflEvent = async (record: S3EventRecord) => {
  const workingDir = `/tmp/tfl/${randomUUID()}/`;
  try {
    fs.mkdirSync(workingDir, { recursive: true });
    const tflFileData = await filePull(record);
    const filepath = workingDir + tflFileData.filename;
    fs.writeFileSync(filepath, tflFileData.data);
    await filePush(filepath, 'tfl');
  } finally {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }
};

/**
 * Lambda Handler
 *
 * @param {S3Event} event
 * @returns {Promise<string>}
 */
export const handler = async (event: S3Event): Promise<string> => {
  logger.debug(`event: ${JSON.stringify(event, null, 2)}`);

  for (const record of event.Records) {
    try {
      const fileName = record.s3.object.key;

      if (fileName.startsWith('EVL_') && process.env.EVL_SFTP_SEND === 'true') {
        await handleEvlEvent(record);
      } else if (
        fileName.startsWith('VOSA') &&
        process.env.TFL_SFTP_SEND === 'true'
      ) {
        await handleTflEvent(record);
      } else {
        logger.info('Did not send to SFTP server, check the env vars');
      }
    } catch (err) {
      logger.error('', err);
      return Promise.reject(
        `The file ${record.s3.object.key} errored during processing.`,
      );
    }
  }

  return Promise.resolve('All records processed successfully.');
};
