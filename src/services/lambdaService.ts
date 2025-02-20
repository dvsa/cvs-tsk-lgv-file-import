import { LgvExcelAttributes } from '../models/lgvExcelAttributes';
import { LightVehicleRecord } from '../models/techRecords';
import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { InvocationRequest } from 'aws-sdk/clients/lambda';
import logger from '../util/logger';

const lambdaName = process.env.LAMBDA_NAME;
const lambda = new AWS.Lambda();

const getTechRecord = async (
  modelUpdate: LgvExcelAttributes,
): Promise<LightVehicleRecord | undefined> => {
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    requestContext: null as any,
    isBase64Encoded: false,
    headers: {},
    stageVariables: {},
    resource: '',
  };

  const lambdaRequest: InvocationRequest = {
    FunctionName: lambdaName ?? '',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  const response = await lambda.invoke(lambdaRequest).promise();
  const responsePayload = JSON.parse(
    response.Payload?.toString('utf8') ?? '',
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
};

const updateTechRecord = async (
  updatedRecord: LightVehicleRecord,
  excelFields: LgvExcelAttributes,
): Promise<boolean> => {
  const payload: APIGatewayEvent = {
    body: JSON.stringify(updatedRecord),
    path: '/vehicles/' + updatedRecord.systemNumber.toString(),
    httpMethod: 'PUT',
    pathParameters: { systemNumber: updatedRecord.systemNumber.toString() },
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    requestContext: null as any,
    isBase64Encoded: false,
    headers: {},
    stageVariables: {},
    resource: '',
  };
  const lambdaRequest: InvocationRequest = {
    FunctionName: lambdaName ?? '',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  const response = await lambda.invoke(lambdaRequest).promise();
  const responsePayload = JSON.parse(
    response.Payload?.toString('utf8') ?? '',
  ) as APIGatewayProxyResult;

  if (responsePayload.statusCode !== 200) {
    logger.error(
      `Row number: ${excelFields.rowNumber}. Received status code ${
        responsePayload.statusCode
      } from tech record update. Response body: ${JSON.stringify(
        responsePayload.body,
      )}`,
    );
    return false;
  }
  return true;
};

const createTechRecord = async (
  updatedRecord: LightVehicleRecord,
  excelFields: LgvExcelAttributes,
): Promise<boolean> => {
  const payload: APIGatewayEvent = {
    body: JSON.stringify(updatedRecord),
    path: '/vehicles',
    httpMethod: 'POST',
    pathParameters: null,
    queryStringParameters: null,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    requestContext: null as any,
    isBase64Encoded: false,
    headers: {},
    stageVariables: {},
    resource: '',
  };
  const lambdaRequest: InvocationRequest = {
    FunctionName: lambdaName ?? '',
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload),
  };

  const response = await lambda.invoke(lambdaRequest).promise();
  const responsePayload = JSON.parse(
    response.Payload?.toString('utf8') ?? '',
  ) as APIGatewayProxyResult;

  if (responsePayload.statusCode !== 201) {
    logger.error(
      `Row number: ${excelFields.rowNumber}. Received status code ${
        responsePayload.statusCode
      } from tech record update. Response body: ${JSON.stringify(
        responsePayload.body,
      )}`,
    );
    return false;
  }
  return true;
};

export { getTechRecord, updateTechRecord, lambda, createTechRecord };
