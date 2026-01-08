// utils/gasConversion.js - Alphasense Gas Sensor Conversion
// Based on your Python preprocessing script calibration

/**
 * Alphasense Sensor Mapping:
 * SN1 = NO2 (Nitrogen Dioxide)
 * SN2 = O3 (Ozone)
 * SN3 = CO (Carbon Monoxide)
 * SN4 = SO2 (Sulfur Dioxide)
 */

// AFE Gain (V/nA)
const AFE_GAIN_V_PER_NA = 0.047;

// Sensitivity (nA/ppm)
const SENSITIVITY_NA_PER_PPM = {
  SO2: 410.0,
  NO2: -112.5,
  CO: 315.0,
  O3: -425.0
};

// Zero Current (nA)
const ZERO_CURRENT_NA = {
  SO2: 930.0,
  NO2: 9.0,
  CO: 1418.0,
  O3: -19.0
};

// Sensor mapping
const SN_TO_GAS = {
  SN1: 'NO2',
  SN2: 'O3',
  SN3: 'CO',
  SN4: 'SO2'
};

/**
 * Calculate gas concentration from Alphasense voltages
 * @param {number} v_we - Working Electrode voltage
 * @param {number} v_ae - Auxiliary Electrode voltage
 * @param {string} gasName - Gas name (NO2, O3, CO, SO2)
 * @returns {object} { ppm, ppb }
 */
function calculateGasConcentration(v_we, v_ae, gasName) {
  if (v_we === null || v_ae === null || v_we === undefined || v_ae === undefined) {
    return { ppm: null, ppb: null };
  }

  // 1. Compute Current (nA)
  // Formula: I_nA = (V_WE - V_AE) / Gain - Zero_Offset
  const dV = v_we - v_ae;
  const I_nA = (dV / AFE_GAIN_V_PER_NA) - (ZERO_CURRENT_NA[gasName] || 0.0);

  // 2. Convert to PPM
  const sens = SENSITIVITY_NA_PER_PPM[gasName] || 1.0;
  if (sens === 0) return { ppm: null, ppb: null };
  
  let ppm = I_nA / sens;

  // 3. Clean (Clamp negative values to 0)
  ppm = Math.max(0.0, ppm);
  const ppb = ppm * 1000.0;

  return {
    ppm: Math.round(ppm * 1000) / 1000, // 3 decimal places
    ppb: Math.round(ppb * 100) / 100    // 2 decimal places
  };
}

/**
 * Process all gas sensors from alphasense_voltages object
 * @param {object} alphasense_voltages - Voltage readings object
 * @returns {object} { NO2_ppm, NO2_ppb, O3_ppm, O3_ppb, CO_ppm, CO_ppb, SO2_ppm, SO2_ppb }
 */
function processAllGases(alphasense_voltages) {
  if (!alphasense_voltages) {
    return {
      NO2_ppm: null, NO2_ppb: null,
      O3_ppm: null, O3_ppb: null,
      CO_ppm: null, CO_ppb: null,
      SO2_ppm: null, SO2_ppb: null
    };
  }

  const result = {};

  // Process each sensor
  for (const [snChannel, gasName] of Object.entries(SN_TO_GAS)) {
    const v_we = alphasense_voltages[`${snChannel}_WE_V`];
    const v_ae = alphasense_voltages[`${snChannel}_AE_V`];

    const { ppm, ppb } = calculateGasConcentration(v_we, v_ae, gasName);

    result[`${gasName}_ppm`] = ppm;
    result[`${gasName}_ppb`] = ppb;
  }

  return result;
}

module.exports = {
  calculateGasConcentration,
  processAllGases,
  SN_TO_GAS,
  SENSITIVITY_NA_PER_PPM,
  ZERO_CURRENT_NA,
  AFE_GAIN_V_PER_NA
};