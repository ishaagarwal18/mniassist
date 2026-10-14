export enum MaintenanceChannel {
  WhatsApp = 0,
  IvrPhone = 1,
}

export const maintenanceChannelOptions = [
  { value: MaintenanceChannel.WhatsApp, label: 'WhatsApp (Interactive Guided Chat)' },
  { value: MaintenanceChannel.IvrPhone, label: 'IVR (Interactive Voice Phone Menu)' },
];

export enum MaintenanceSeverity {
  Low = 0,
  Medium = 1,
  High = 2,
  CriticalEmergency = 3,
}

export const maintenanceSeverityOptions = [
  { value: MaintenanceSeverity.Low, label: 'Low (Non-urgent warning)' },
  { value: MaintenanceSeverity.Medium, label: 'Medium (Intermittent trip)' },
  { value: MaintenanceSeverity.High, label: 'High (Line stoppage)' },
  { value: MaintenanceSeverity.CriticalEmergency, label: 'Critical / Emergency (Plant shutdown)' },
];

export enum MaintenanceSessionStatus {
  Initiated = 0,
  Diagnosing = 1,
  RemediationProvided = 2,
  ResolvedRemotely = 3,
  EscalatedToFieldTicket = 4,
  Cancelled = 5,
}

export enum EquipmentCategory {
  PlcAndController = 0,
  VfdAndDrive = 1,
  InstrumentationAndSensor = 2,
  ServoAndMotion = 3,
  HmiAndScada = 4,
  MechanicalAndHydraulic = 5,
}

export const equipmentCategoryOptions = [
  {
    value: EquipmentCategory.PlcAndController,
    label: 'PLC & Automation Controller (Siemens S7, Rockwell, Omron)',
  },
  {
    value: EquipmentCategory.VfdAndDrive,
    label: 'VFD & AC Drives (ABB, Schneider, Danfoss, Siemens)',
  },
  {
    value: EquipmentCategory.InstrumentationAndSensor,
    label: 'Process Instrumentation & Sensors (E+H, Yokogawa)',
  },
  { value: EquipmentCategory.ServoAndMotion, label: 'Servo & Motion Control Systems' },
  { value: EquipmentCategory.HmiAndScada, label: 'HMI & SCADA Terminals' },
  { value: EquipmentCategory.MechanicalAndHydraulic, label: 'Valves, Actuators & Hydraulics' },
];

export enum DiagnosticTurnType {
  UserPrompt = 0,
  AiDiagnosis = 1,
  TelemetryReading = 2,
  RemediationGuidance = 3,
  IvrMenuChoice = 4,
  EscalationAlert = 5,
}
