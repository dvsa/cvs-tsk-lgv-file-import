/* eslint-disable security/detect-non-literal-fs-filename */
import type { S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { filePull } from '../filePull/fromS3';
import logger from '../util/logger';
import * as XLSX from 'xlsx';

const range = (start:number, end:number):number[] => Array.from({ length: (end + 1 - start) }, (v, k) => k + start);
const getValue = (sheet:XLSX.WorkSheet, row:number, column: number):string => (sheet[XLSX.utils.encode_cell({ r:row, c:column })] as XLSX.CellObject).v as string;
const sqsClient = new AWS.SQS();

export const handler = async (event: S3Event): Promise<string> => {
  logger.debug(`event: ${JSON.stringify(event, null, 2)}`);

  for (const record of event.Records) {
    try {
      const lgvExcelFile = await filePull(record);
      const workbook = XLSX.read(lgvExcelFile.data);

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const sheetRange = XLSX.utils.decode_range(worksheet['!ref']);

      for (const rowNumber of range(sheetRange.s.r + 1, sheetRange.e.r)) {
        try {
          const model = {
            'application': getValue(worksheet, rowNumber, 0),
            'vin': getValue(worksheet, rowNumber, 1),
            'vrm': getValue(worksheet, rowNumber, 2),
            'trl': getValue(worksheet, rowNumber, 3),
            'class': getValue(worksheet, rowNumber, 4),
            'cycle': getValue(worksheet, rowNumber, 5),
            'cc': getValue(worksheet, rowNumber, 6),
          };

          const msgResult = await sqsClient.sendMessage({
            QueueUrl:process.env.QUEUE_URL,
            MessageBody:JSON.stringify(model),
          }).promise();
          console.log(model);
        } catch (err) {

        }
      }
      return `All rows of ${record.s3.object.key} processed successfully.`;
    } catch (err) {
      console.log(err);
      throw new Error(`The file ${record.s3.object.key} errored during processing.`);
    }
  }
};
