/* eslint-disable security/detect-non-literal-fs-filename */
import * as fs from 'fs';
import type { S3Event } from 'aws-lambda';
import { configureFile } from '../fileConvert/fileConvert';
import { filePull } from '../filePull/fromS3';
import { filePush } from '../filePush/filePush';
import { randomUUID } from 'crypto';

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
  const workingDir = `/tmp/${randomUUID()}/`;
  try {
    fs.mkdirSync(workingDir);
    const record = event.Records[0];
    const evlFile = await filePull(record);
    const filename = await configureFile(workingDir, evlFile);
    await filePush(filename);
  } finally {
    fs.rmSync(workingDir, { recursive: true, force: true });
  }

  return Promise.resolve({
    statusCode: 204,
  });
};
