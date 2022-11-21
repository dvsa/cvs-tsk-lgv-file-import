export interface LightVehicleRecord {
  primaryVrm?: string;
  systemNumber: string;
  vin: string;
  trailerId?: string;
  techRecord: LightVehicleTechRecord[];
}

export interface LightVehicleTechRecord {
  vehicleType: string;
  noOfAxles: number;
  reasonForCreation: string;
  createdAt: string;
  createdByName: string;
  createdById: string;
  lastUpdatedAt: string;
  lastUpdatedByName: string;
  lastUpdatedById: string;
  updateType?: string;
  statusCode: string;
  vehicleSubclass: string[];
  vehicleClass?: {
    code: string;
    description: string;
  };
}
