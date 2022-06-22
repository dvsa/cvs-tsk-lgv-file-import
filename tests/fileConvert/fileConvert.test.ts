/* eslint-disable security/detect-non-literal-fs-filename */
import { configureFile } from '../../src/fileConvert/fileConvert';
import * as fs from 'fs';
import * as zlib from 'zlib';
import md5 from 'md5';

describe('test the file config', () => {
  const testFilename = 'tests/resources/EVL_GVT_20220621.csv';
  const dateFromFilename = testFilename.split('/')[2].split('_')[2].split('.')[0];
  const txtFilename = 'crc32_' + dateFromFilename + '.txt';
  const zipCsvFilename = 'EVL_GVT_' + dateFromFilename + '.csv.gz';
  const finalFilename = 'EVL_GVT_' + dateFromFilename + '.tar.gz';

  let buffer: Buffer;

  afterEach(() => {
    fs.unlinkSync(finalFilename);
    fs.unlinkSync(zipCsvFilename);
    fs.unlinkSync(txtFilename);
  });

  beforeAll(() => {
    buffer = fs.readFileSync(testFilename);
  });

  test('expect filename to be correct', async () => {
    await configureFile('', buffer, 'EVL_GVT_20220621.csv');
    const fileList = fs.readdirSync('./');
    expect(fileList).toContain(finalFilename);
  });

  test('expect csv filename to be correct', async () => {
    await configureFile('', buffer, 'EVL_GVT_20220621.csv');
    const fileList = fs.readdirSync('./');
    expect(fileList).toContain(zipCsvFilename);
  });

  test('expect txt filename to be correct', async () => {
    await configureFile('', buffer, 'EVL_GVT_20220621.csv');
    const fileList = fs.readdirSync('./');
    expect(fileList).toContain(txtFilename);
  });

  test('expect csv to include the header and footer', async () => {
    await configureFile('', buffer, 'EVL_GVT_20220621.csv');
    const zipCsvFile = fs.readFileSync(zipCsvFilename);
    const csvFile = zlib.gunzipSync(zipCsvFile);
    const csvData = csvFile.toString();
    expect(csvData).toContain('HEADER LINE: EVL GVT TRANSFER FILE');
    expect(csvData).toContain('TRAILER LINE: 2 RECORDS.');
  });

  test('expect hash to match', async () => {
    await configureFile('', buffer, 'EVL_GVT_20220621.csv');
    const csvFile = fs.readFileSync(zipCsvFilename);
    const textFile = fs.readFileSync(txtFilename);
    const hash = md5(csvFile);
    expect(textFile.toString()).toBe(hash);
  });
});

describe('test the file config failure condition', () => {
  test('no data provided throws an error', async () => {
    await expect(configureFile('', Buffer.from(''), 'EVL_GVT_20220621.csv')).rejects.toThrow(
      'No data provided',
    );
  });
});
