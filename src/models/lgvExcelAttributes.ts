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
  IVA1C = '1C',
  MSVA = 'MSVA',
  LG = 'LG',
  _1LG = '1LG',
  _1P = '1P',
}
