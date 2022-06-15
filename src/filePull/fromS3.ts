import logger from '../util/logger';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { S3 } from 'aws-sdk';
import { S3EventRecord } from 'aws-lambda';

const s3 = new S3({ region: process.env.AWS_REGION });

export const filePull = async (record: S3EventRecord) => {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  const params = {
    Bucket: bucket,
    Key: key,
  };
  try {
    const s3Object: GetObjectOutput = await s3.getObject(params).promise();
    logger.info(`File pulled with ETag: ${s3Object.ETag}`);
    if (s3Object.ContentType !== 'text/csv') {
      throw new Error(
        `File with ETag ${s3Object.ETag} has content type of '${s3Object.ContentType}' rather than 'text/csv'.`,
      );
    }
    if (!Buffer.isBuffer(s3Object.Body)) {
      throw new Error(
        `Body of object with ETag ${s3Object.ETag} is not a Buffer.`,
      );
    }

    return s3Object.Body;
  } catch (err) {
    logger.error(err);
    const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
    logger.error(message);

    throw err;
  }
};
