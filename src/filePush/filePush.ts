/* eslint-disable security/detect-object-injection */
import Client from 'ssh2-sftp-client';
import logger from '../util/logger';
import path from 'path';
import { getSecret } from '../util/getSecret';

export interface Config {
  host: string;
  username: string;
  retries: number;
  password?: string;
  privateKey?: string;
}

type Feeds = 'evl' | 'tfl';

export const createConfig = async (eventType: Feeds) => {
  let secretString: string;

  const sftpConfigSecretName: { [key in Feeds]: string | undefined } = {
    evl: process.env.EVL_SFTP_CONFIG,
    tfl: process.env.TFL_SFTP_CONFIG,
  };

  if (sftpConfigSecretName[eventType]) {
    secretString = await getSecret(sftpConfigSecretName[eventType]);
  } else {
    logger.error('Unable to determine event type, please try again');
  }

  try {
    return JSON.parse(secretString) as Config;
  } catch (e) {
    logger.error('Error parsing secret, see callstack below');
    logger.error('', e);
    throw e;
  }
};

export const filePush = async (filepath: string, eventType: Feeds) => {
  const config = await createConfig(eventType);
  logger.info('Created config from secrets');
  const sftp = new Client();
  const sftpPath: { [key in Feeds]: string | undefined } = {
    evl: process.env.EVL_SFTP_PATH,
    tfl: process.env.TFL_SFTP_PATH,
  };
  const remoteFileLocation =
    (sftpPath[eventType] ?? '') + path.basename(filepath);

  try {
    logger.info('Attempt connection');
    await sftp.connect(config);
    logger.info('Connected to server');
    await sftp.fastPut(filepath, remoteFileLocation);
    logger.info('Successfully uploaded to SFTP');
  } catch (err) {
    logger.error('', err);
    throw err;
  } finally {
    await sftp.end();
  }
};
