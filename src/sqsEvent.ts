/* eslint-disable security/detect-non-literal-fs-filename */
import { SQSBatchResponse, SQSEvent, SQSRecord } from 'aws-lambda';
import { LgvExcelAttributes, Application } from './models/lgvExcelAttributes';
import { LightVehicleRecord } from './models/techRecords';
import {
  createTechRecord,
  getTechRecord,
  updateTechRecord,
} from './services/lambdaService';
import logger from './util/logger';

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
    if (!modelUpdate.application || !modelUpdate.vin || (!modelUpdate.vrm && modelUpdate.application !=='1T')) {
      throw new Error(
        `Row doesn't have the required information for an update. Application: ${modelUpdate.application}; 
          Vin: ${modelUpdate.vin};  VRM: ${modelUpdate.vrm}`,
      );
    }

    const techRecord = await getTechRecord(modelUpdate);
    const techRecordToUpdate = techRecord
      ? techRecord
      : ({
        techRecord: [{ statusCode: CURRENT_STATUS_CODE }],
      } as LightVehicleRecord);
    const updatedTechRecord = updateFromModel(techRecordToUpdate, modelUpdate);
    if (!modelUpdate.vrm){
      throw new Error(`TEMP: ${JOSN.stringify(updateTechRecord)}, ${updateTechRecord.primaryVrm}`)
    }
    if (!updatedTechRecord) {
      return true;
    }
    const result = techRecord
      ? await updateTechRecord(updatedTechRecord, modelUpdate)
      : await createTechRecord(updatedTechRecord, modelUpdate);
    return result;
  } catch (err: unknown) {
    let message = 'unknown error';
    if (err instanceof Error) message = err.message;
    logger.error(
      `error with row ${modelUpdate.rowNumber} of ${modelUpdate.filename}: ${message}`,
    );
    throw err;
  }
};

export const updateFromModel = (
  item: LightVehicleRecord,
  modelUpdate: LgvExcelAttributes,
): LightVehicleRecord | undefined => {
  const candidateRecords = item.techRecord.filter(
    (v) => v.statusCode.toLowerCase() === CURRENT_STATUS_CODE,
  );

  if (candidateRecords.length > 1) {
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
    newTechRecord.vehicleSubclass = processVehicleSubclass(modelUpdate.class);
  }

  switch (modelUpdate.application) {
    case Application._1P:
      logger.info('Application type 1P, nothing to do...');
      return;
    case Application.IVA1C:
    case Application._1C:
      newTechRecord.vehicleType = 'car';
      break;
    case Application.MSVA:
    case Application.MSVA1:
    case Application.PSMVA1:
    case Application.PSMVA:
      newTechRecord.vehicleType = 'motorcycle';

      const isClassTwo =
        (modelUpdate.cc &&
          (modelUpdate.cc > 200 ||
            (modelUpdate.cc as unknown as string) === 'ELECTRIC')) ||
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
        case 'MOTORCYCLE':
        case 'Low powered moped':
          newTechRecord.numberOfWheelsDriven = 1;
          break;
        case 'tricycle':
          newTechRecord.numberOfWheelsDriven = 2;
          break;
        case 'quadricycle':
          newTechRecord.numberOfWheelsDriven = 3;
          break;
      }

      break;
    case Application.IVA1LG:
    case Application._1LG:
    case Application.LG:
    case Application.Emissions:
      newTechRecord.vehicleType = 'lgv';
      break;
    case Application._1T:
      newTechRecord.vehicleType = 'trl';
      newTechRecord.euVehicleCategory = 'o1';
      item.trailerId = modelUpdate.trl;
      break;
    default:
      throw new Error(
        `application ${modelUpdate.application} doesn't map to vehicle type`,
      );
  }

  return item;
};

export const processVehicleSubclass = (vehicleSubclass: string): string[] => {
  const stringsToDelete = ['WAV', 'Class'];
  const removedValues = stringsToDelete
    .reduce((prev, curr) => prev.replace(curr, ''), vehicleSubclass)
    .toUpperCase();
  const subclasses = removedValues
    .match(/[NPASCLTEMRW]/g)
    ?.map((upper) => upper.toLowerCase());
  return [...new Set(subclasses)] ?? [];
};
