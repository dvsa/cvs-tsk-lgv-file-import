import { LgvExcelAttributes } from '../models/lgvExcelAttributes';
import { LightVehicleRecord } from '../models/techRecords';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import logger from '../util/logger';

const lambdaName = process.env.LAMBDA_NAME;
const lambda = new AWS.Lambda();

const getTechRecord: (
  modelUpdate: LgvExcelAttributes,
) => Promise<LightVehicleRecord> = async (
  modelUpdate: LgvExcelAttributes,
): Promise<LightVehicleRecord> => {
  const payload: APIGatewayEvent = {
    body: '',
    path: `/vehicles/${modelUpdate.vin}/tech-records`,
    httpMethod: 'GET',
    pathParameters: { 'proxy+': modelUpdate.vin },
    queryStringParameters: {
      status: 'current',
      searchCriteria: 'vin',
    },
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    requestContext: null,
    isBase64Encoded: false,
    headers: {},
    stageVariables: {},
    resource: '',
  };

  const lambdaRequest: InvocationRequest = {
    FunctionName: lambdaName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  const response = await lambda.invoke(lambdaRequest).promise();
  const responsePayload = JSON.parse(
    response.Payload.toString('utf8'),
  ) as APIGatewayProxyResult;
  const vehicles = JSON.parse(responsePayload.body) as LightVehicleRecord[];

  if (vehicles.length > 1) {
    const vrmFilter = vehicles.filter((v) => v.primaryVrm === modelUpdate.vrm);
    if (vrmFilter.length === 1) {
      return vrmFilter[0];
    }
  }

  if (vehicles.length > 0) {
    return vehicles[0];
  }

  //Unable to guarantee vehicle - throw
  throw new Error(
    `Application on row ${modelUpdate.rowNumber} of ${modelUpdate.filename} doesn't resolve to a single vehicle`,
  );
};

const updateTechRecord: (
  updatedRecord: LightVehicleRecord,
) => Promise<boolean> = async (
  updatedRecord: LightVehicleRecord,
): Promise<boolean> => {
  const payload: APIGatewayEvent = {
    body: JSON.stringify(updatedRecord),
    path: '/vehicles/update-status/' + updatedRecord.systemNumber.toString(),
    httpMethod: 'PUT',
    pathParameters: { systemNumber: updatedRecord.systemNumber.toString() },
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    requestContext: null,
    isBase64Encoded: false,
    headers: {},
    stageVariables: {},
    resource: '',
  };
  const lambdaRequest: InvocationRequest = {
    FunctionName: lambdaName,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  const response = await lambda.invoke(lambdaRequest).promise();
  const responsePayload = JSON.parse(
    response.Payload.toString('utf8'),
  ) as APIGatewayProxyResult;

  if ( responsePayload.statusCode !== 200 ) {
    logger.error(`received status code ${responsePayload.statusCode} from tech record update`);
    return false;
  }
  return true;
};

export { getTechRecord, updateTechRecord };
