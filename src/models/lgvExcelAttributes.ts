export type LgvExcelAttributes = {
  application: string;
  vin: string;
  vrm: string;
  trl: string;
  class: string;
  cycle: string;
  cc: number;
  rowNumber: number;
  filename: string;
};

export enum Application {
  _1C = '1C',
  IVA1C = 'IVA1C',
  MSVA = 'MSVA',
  MSVA1 = 'MSVA1',
  PSMVA1 = 'PSMVA1',
  PSMVA = 'PSMVA',
  LG = 'LG',
  _1LG = '1LG',
  _1P = '1P',
  IVA1LG = 'IVA1LG',
  Emissions = 'EMISSIONS/LEC',
  DOT = 'DOT',
  _1T = '1T',
}
