const fs = require('fs');
let code = fs.readFileSync('components/Dashboard.tsx', 'utf-8');

const newIsLogFailed = `const isLogFailed = (log: any, presets: any[], availableFields: string[]) => {
  const pName = getLogProductName(log);
  const sName = getLogStructure(log);
  const pStd = log.productStd || log["Product_Std"] || log["ProductStd"] || pName;
  const sStd = log.structureStd || log["Structure_Std"] || log["StructureStd"] || sName;
  const mId = log.machineId || log["MachineID"] || log["Máy"] || log["machine_id"];

  const currentPreset = presets.find(p => p.productName === pStd && p.structure === sStd && (!p.machineId || p.machineId === mId)) 
    || presets.find(p => p.productName === pStd && (!p.machineId || p.machineId === mId))
    || presets.find(p => p.productName === pStd)
    || presets.find(p => p.productName === pName);

  const logDataKeys = availableFields.filter(f => {
    const val = getLogValue(log, f, 'Act');
    return val !== null;
  });

  return logDataKeys.some(f => {
    const actVal = getLogValue(log, f, 'Act');
    const stdVal = getLogValue(log, f, 'Std');
    if (actVal === null || stdVal === null) return false;
    return checkAlert(actVal, stdVal, currentPreset?.tolerances?.[f], getDefaultTolerance(f));
  });
};`;

code = code.replace(/const isLogFailed = \(log: any, presets: any\[\], availableFields: string\[\]\) => \{[\s\S]*?\};\n\nconst parseLogDate/, newIsLogFailed + "\n\nconst parseLogDate");
fs.writeFileSync('components/Dashboard.tsx', code);
