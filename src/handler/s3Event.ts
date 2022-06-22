/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import type { S3Event, S3EventRecord } from 'aws-lambda';
import { configureFile } from '../fileConvert/fileConvert';
import { filePull } from '../filePull/fromS3';
import { filePush } from '../filePush/filePush';
import { randomUUID } from 'crypto';
import logger from '../util/logger';

const handleEvent = async (record: S3EventRecord) => {
  const workingDir = `/tmp/${randomUUID()}/`;
  try {
    fs.mkdirSync(workingDir);
    const evlFileData = await filePull(record);
    const filepath = await configureFile(
      workingDir,
      evlFileData.data,
      evlFileData.filename,
    );
    await filePush(filepath);
  } finally {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }
};

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
  for (const record of event.Records) {
    try {
      await handleEvent(record);
    } catch (err) {
      logger.error(err);
      logger.error(
        `The file ${record.s3.object.key} failed somewhere, 500 was returned.`,
      );
      return Promise.resolve({
        statusCode: 500,
      });
    }
  }

  return Promise.resolve({
    statusCode: 204,
  });
};
