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

export const createConfig = async () => {
  const config: Config = {
    host: process.env.SFTP_Address,
    username: process.env.SFTP_User,
    retries: 3,
  };

  if (process.env.SFTP_Key && process.env.SFTP_Key != '') {
    const sftpKey = await getSecret(process.env.SFTP_Key);
    config.privateKey = sftpKey;
  } else if (process.env.SFTP_Password && process.env.SFTP_Password != '') {
    const sftpPassword = await getSecret(process.env.SFTP_Password);
    config.password = sftpPassword;
  } else {
    logger.error(
      'No password or private key found, please check the env variables',
    );
    throw new Error(
      'No password or private key found, please check the env variables',
    );
  }

  return config;
};

export const filePush = async (filepath: string) => {
  const config = await createConfig();
  const sftp = new Client();
  const remoteFileLocation =
    (process.env.SFTP_Path ?? '') + path.basename(filepath);

  await sftp
    .connect(config)
    .then(() => sftp.fastPut(filepath, remoteFileLocation))
    .then(() => {
      logger.info('Successfully uploaded to SFTP');
      return sftp.end();
    })
    .catch((err) => {
      logger.error('', err);
      throw err;
    });
};
