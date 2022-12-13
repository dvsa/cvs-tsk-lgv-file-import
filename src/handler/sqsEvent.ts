/* eslint-disable security/detect-non-literal-fs-filename */
import type { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import logger from '../util/logger';
import { LgvExcelAttributes } from '../models/lgvExcelAttributes';
import { LightVehicleRecord } from '../models/techRecords';
import { getTechRecord, updateTechRecord } from '../services/lambdaService';

const CURRENT_STATUS_CODE = 'current';

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const response: SQSBatchResponse = {
    batchItemFailures: [],
  };

  const records = event.Records.map((r) => doUpdate(r));
  const results = await Promise.allSettled(records);

  results.forEach((r, i) => {
    if (r.status === 'rejected' || !r.value) {
      response.batchItemFailures.push({
        itemIdentifier: event.Records[parseInt(`${i}`)].messageId,
      });
    }
  });

  return response;
};

const doUpdate = async (record: SQSRecord): Promise<boolean> => {
  const modelUpdate = JSON.parse(record.body) as LgvExcelAttributes;
  try {
    if (!modelUpdate.application || !modelUpdate.vin || !modelUpdate.vrm) {
      throw new Error(
        "Row doesn't have the required information for an update",
      );
    }

    const techRecord = await getTechRecord(modelUpdate);
    const updatedTechRecord = updateFromModel(techRecord, modelUpdate);
    return await updateTechRecord(updatedTechRecord);
  } catch (err: unknown) {
    let message = 'unknown error';
    if (err instanceof Error) message = err.message;
    logger.error(
      `error with row ${modelUpdate.rowNumber} of ${modelUpdate.filename}: ${message}`,
    );
    throw err;
  }

  return true;
};

const updateFromModel = (
  item: LightVehicleRecord,
  modelUpdate: LgvExcelAttributes,
): LightVehicleRecord => {
  const candidateRecords = item.techRecord.filter(
    (v) => v.statusCode.toLowerCase() === CURRENT_STATUS_CODE,
  );

  if (candidateRecords.length !== 1) {
    throw new Error('no single current record for this vehicle');
  }

  const newTechRecord = candidateRecords[0];
  item.techRecord = [newTechRecord];

  const newDate = new Date().toISOString();

  item.vin = modelUpdate.vin;
  item.primaryVrm = modelUpdate.vrm;
  item.msUserDetails = {
    msUser: 'LGV Update Process',
    msOid: 'lgvUpdateProcess',
  };

  newTechRecord.lastUpdatedAt = newDate;
  newTechRecord.noOfAxles = 2;
  newTechRecord.statusCode = CURRENT_STATUS_CODE;
  newTechRecord.reasonForCreation =
    'Update to LGV fields from Excel spreadsheet';
  newTechRecord.createdAt = newDate;
  newTechRecord.lastUpdatedAt = newDate;

  if (modelUpdate.class) {
    newTechRecord.vehicleSubclass = [modelUpdate.class];
  }

  switch (modelUpdate.application) {
    case 'IVA1C':
      newTechRecord.vehicleType = 'car';
      break;
    case 'MSVA1':
    case 'PSMVA1':
      newTechRecord.vehicleType = 'motorcycle';

      const isClassTwo =
        (modelUpdate.cc && modelUpdate.cc > 200) ||
        (modelUpdate.cycle.length > 6 &&
          modelUpdate.cycle.indexOf('sidecar') > -1);
      newTechRecord.vehicleClass = {
        code: isClassTwo ? '2' : '1',
        description: isClassTwo
          ? 'motorbikes over 200cc or with a sidecar'
          : 'motorbikes up to 200cc',
      };

      switch (modelUpdate.cycle.toLowerCase()) {
        case 'bike':
        case 'bike and sidecar':
          newTechRecord.numberOfWheelsDriven = 1;
          break;
        case 'trike':
          newTechRecord.numberOfWheelsDriven = 2;
          break;
        case 'quad':
          newTechRecord.numberOfWheelsDriven = 3;
      }

      break;
    case 'IVA1LG':
    case 'Emissions/LEC':
      newTechRecord.vehicleType = 'LGV';
    default:
      throw new Error(
        `application ${modelUpdate.application} doesn't map to vehicle type`,
      );
  }

  return item;
};
