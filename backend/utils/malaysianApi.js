/**
 * Calculate the Malaysian API (Composite Index)
 * @param {object} readings - Object containing pollutant concentrations
 * @returns {object} { value, status, predominant }
 */
function calculateMalaysianAPI(readings) {
  const subIndices = [];

  // 1. PM10 (24-hr avg) - Input: µg/m³
  if (hasValue(readings.pm10)) {
    subIndices.push({
      pollutant: 'PM10',
      value: calculatePM10Index(readings.pm10)
    });
  }

  // 2. Ozone (1-hr avg) - Input: ppm
  if (hasValue(readings.O3_ppm)) {
    subIndices.push({
      pollutant: 'O3',
      value: calculateOzoneIndex(readings.O3_ppm)
    });
  }

  // 3. Carbon Monoxide (8-hr avg) - Input: ppm
  if (hasValue(readings.CO_ppm)) {
    subIndices.push({
      pollutant: 'CO',
      value: calculateCOIndex(readings.CO_ppm)
    });
  }

  // 4. Nitrogen Dioxide (1-hr avg) - Input: ppm
  if (hasValue(readings.NO2_ppm)) {
    subIndices.push({
      pollutant: 'NO2',
      value: calculateNO2Index(readings.NO2_ppm)
    });
  }

  // 5. Sulfur Dioxide (24-hr avg) - Input: ppm
  if (hasValue(readings.SO2_ppm)) {
    subIndices.push({
      pollutant: 'SO2',
      value: calculateSO2Index(readings.SO2_ppm)
    });
  }

  // If no data, return default
  if (subIndices.length === 0) {
    return { value: 0, status: 'No Data', predominant: null };
  }

  // The Official API is the MAX of all sub-indices
  subIndices.sort((a, b) => b.value - a.value);
  const maxIndex = subIndices[0];

  return {
    value: Math.round(maxIndex.value),
    status: getApiStatus(maxIndex.value),
    predominant: maxIndex.pollutant
  };
}

// --- SUB-INDEX FORMULAS ---

// PM10 Calculation (µg/m³)
function calculatePM10Index(conc) {
  if (conc < 50) return conc;
  if (conc < 350) return 50 + ((conc - 50) * 0.5);
  if (conc < 420) return 200 + ((conc - 350) * 1.4286);
  if (conc < 500) return 300 + ((conc - 420) * 1.25);
  return 400 + (conc - 500);
}

// Ozone Calculation (ppm)
function calculateOzoneIndex(conc) {
  if (conc < 0.2) return conc * 1000;
  if (conc < 0.4) return 200 + ((conc - 0.2) * 500);
  return 300 + ((conc - 0.4) * 1000);
}

// Carbon Monoxide Calculation (ppm)
function calculateCOIndex(conc) {
  if (conc < 9) return conc * 11.111111;
  if (conc < 15) return 100 + ((conc - 9) * 16.66667);
  if (conc < 30) return 200 + ((conc - 15) * 6.66667);
  return 300 + ((conc - 30) * 10);
}

// Nitrogen Dioxide Calculation (ppm)
function calculateNO2Index(conc) {
  if (conc < 0.17) return conc * 588.23529;
  if (conc < 0.6) return 100 + ((conc - 0.17) * 232.56);
  if (conc < 1.2) return 200 + ((conc - 0.6) * 166.667);
  return 300 + ((conc - 1.2) * 250);
}

// Sulfur Dioxide Calculation (ppm)
function calculateSO2Index(conc) {
  if (conc < 0.04) return conc * 2500;
  if (conc < 0.3) return 100 + ((conc - 0.04) * 384.61);
  if (conc < 0.6) return 200 + ((conc - 0.3) * 333.333);
  return 300 + ((conc - 0.6) * 500);
}

// Helper: Determine Status Category
function getApiStatus(api) {
  if (api <= 50) return 'Good';
  if (api <= 100) return 'Moderate';
  if (api <= 200) return 'Unhealthy';
  if (api <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

// Helper: Safe Check
function hasValue(val) {
  return val !== null && val !== undefined && !isNaN(val);
}

module.exports = { calculateMalaysianAPI };