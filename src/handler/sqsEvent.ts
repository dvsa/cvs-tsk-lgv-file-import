/* eslint-disable security/detect-non-literal-fs-filename */
import type { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import logger from '../util/logger';
import { LgvExcelAttributes } from '../models/lgvExcelAttributes';
import { LightVehicleRecord, LightVehicleTechRecord } from '../models/techRecords';

const dynamo = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;
const vinIndex = process.env.VIN_INDEX;
const vrmIndex = process.env.VRM_INDEX;
const CURRENT_STATUS_CODE = 'CURRENT';
const ARCHIVE_STATUS_CODE = 'ARCHIVE';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const response:SQSBatchResponse = {
    batchItemFailures: [],
  };

  const doUpdate = async (record:SQSRecord):Promise<boolean> => {
    const modelUpdate = JSON.parse(record.body) as LgvExcelAttributes;
    try {
      if (!modelUpdate.application || !modelUpdate.vin || !modelUpdate.vrm) {
        throw new Error('Row doesn\'t have the required information for an update');
      }

      const techRecord = await findRecord(modelUpdate);
      const updatedTechRecord = updateFromModel(techRecord, modelUpdate);
      await dynamo.put({
        TableName:tableName,
        Item:updatedTechRecord,
      }).promise();
    } catch (err:unknown) {
      let message = 'unknown error';
      if (err instanceof Error) message = err.message;
      logger.error(`error with row ${modelUpdate.rowNumber} of ${modelUpdate.filename}: ${message}`);
      throw err;
    }

    return true;
  };

  const records = event.Records.map(r => doUpdate(r));
  const results = await Promise.allSettled(records);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      response.batchItemFailures.push({ itemIdentifier: event.Records[parseInt(`${i}`)].messageId });
    }
  });

  return response;
};

const updateFromModel = (item: LightVehicleRecord, modelUpdate: LgvExcelAttributes): LightVehicleRecord => {
  const candidateRecords = item.techRecord.filter(v => v.statusCode === 'CURRENT');
  if (candidateRecords.length !== 1) {
    throw new Error('no single current record for this vehicle');
  }

  candidateRecords[0].statusCode = ARCHIVE_STATUS_CODE;
  const newTechRecord = JSON.parse(JSON.stringify(candidateRecords[0])) as LightVehicleTechRecord;
  item.techRecord.push(newTechRecord);

  item.vin = modelUpdate.vin;
  item.primaryVrm = modelUpdate.vrm;


  newTechRecord.statusCode = CURRENT_STATUS_CODE;
  newTechRecord.reasonForCreation = 'Update to LGV fields from Excel spreadsheet';
  newTechRecord.vehicleClass =

  return item;
};

const findRecord = async (modelUpdate: LgvExcelAttributes):Promise<LightVehicleRecord> => {
  const vinResult = await dynamo.query({
    TableName:tableName,
    IndexName:vinIndex,
    KeyConditionExpression:'',
    ExpressionAttributeValues:{

    },
  }).promise();

  if (vinResult.Items.length === 1) {
    return vinResult.Items[0] as LightVehicleRecord;
  }

  const vrmResult = await dynamo.query({
    TableName:tableName,
    IndexName:vrmIndex,
    KeyConditionExpression:'',
    ExpressionAttributeValues:{

    },
  }).promise();

  if (vrmResult.Items.length === 1) {
    return vrmResult.Items[0] as LightVehicleRecord;
  }

  //Unable to guarantee vehicle - throw
  throw new Error(`Application on row ${modelUpdate.rowNumber} of ${modelUpdate.filename} doesn't resolve to a single vehicle`);
};

