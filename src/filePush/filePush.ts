import Client from 'ssh2-sftp-client';
import logger from '../util/logger';


export const filePush = async (filename: string) => {

  const config = {
    host: process.env.SFTP_Address,
    username: process.env.SFTP_User,
    password: process.env.SFTP_Password,
    retries: 3, 
  };
  
  const sftp = new Client();

  const remoteFileLocation = process.env.SFTP_Path + filename;
  
  await sftp
    .connect(config)
    .then(() => sftp.fastPut(filename, remoteFileLocation))
    .then(() => {
      logger.info('Successfully uploaded to SFTP');
      return sftp.end();
    })
    .catch((err) => {
      logger.error('', err);
      throw err;
    });

};
