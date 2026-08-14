const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf-8');

const isLogFailedFunc = `
const isLogFailed = (log: any, presets: any[], availableFields: string[]) => {
  const pName = getLogProductName(log);
  const sName = getLogStructure(log);
  const pStd = log.productStd || log["Product_Std"] || log["ProductStd"] || pName;
  const sStd = log.structureStd || log["Structure_Std"] || log["StructureStd"] || sName;
  const mId = log.machineId || log["MachineID"] || log["Máy"] || log["machine_id"];

  const currentPreset = presets.find(p => p.productName === pStd && p.structure === sStd && (!p.machineId || p.machineId === mId)) 
    || presets.find(p => p.productName === pStd && (!p.machineId || p.machineId === mId))
    || presets.find(p => p.productName === pStd)
    || presets.find(p => p.productName === pName);

  return availableFields.some(f => {
    const actVal = getLogValue(log, f, 'Act');
    const stdVal = getLogValue(log, f, 'Std');
    if (actVal === null || stdVal === null) return false;
    return checkAlert(actVal, stdVal, currentPreset?.tolerances?.[f], getDefaultTolerance(f));
  });
};
`;

code = code.replace("const parseLogDate = (dateStr: any): Date | null => {", isLogFailedFunc + "\nconst parseLogDate = (dateStr: any): Date | null => {");

code = code.replace(/allFields\.some\(f => checkAlert\(getLogValue\(l, f, 'Act'\), getLogValue\(l, f, 'Std'\), presets\.find\(p => p\.productName === getLogProductName\(l\)\)\?\.tolerances\?\.\[f\], getDefaultTolerance\(f\)\)\)/g, "isLogFailed(l, presets, allFields)");

code = code.replace(/allFields\.some\(f => checkAlert\(getLogValue\(log, f, 'Act'\), getLogValue\(log, f, 'Std'\), presets\.find\(p => p\.productName === getLogProductName\(log\)\)\?\.tolerances\?\.\[f\], getDefaultTolerance\(f\)\)\)/g, "isLogFailed(log, presets, allFields)");

fs.writeFileSync('components/Dashboard.tsx', code);
