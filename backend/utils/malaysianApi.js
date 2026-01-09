/**
 * Malaysian Air Pollutant Index (API) Calculator
 * Based on Official Department of Environment (DOE) Malaysia formulas
 * 
 * Reference: https://www.doe.gov.my/wp-content/uploads/2021/09/API_Calculation.pdf
 * 
 * Key Points:
 * - Malaysian API uses different averaging periods for each pollutant
 * - PM10: 24-hour average (µg/m³)
 * - PM2.5: 24-hour average (µg/m³) 
 * - O3: 8-hour average (ppm) and 1-hour average (ppm)
 * - CO: 8-hour average (ppm)
 * - NO2: 1-hour average (ppm)
 * - SO2: 1-hour average (ppm)
 * 
 * The final API is the MAXIMUM of all sub-indices
 */

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

  // 2. PM2.5 (24-hr avg) - Input: µg/m³ (Official Malaysian formula)
  if (hasValue(readings.pm2_5)) {
    subIndices.push({
      pollutant: 'PM2.5',
      value: calculatePM25Index(readings.pm2_5)
    });
  }

  // 3. Ozone (8-hr or 1-hr avg) - Input: ppm
  // Note: Malaysian API uses 8-hour for normal range, 1-hour for extreme values
  if (hasValue(readings.O3_ppm)) {
    subIndices.push({
      pollutant: 'O3',
      value: calculateOzoneIndex(readings.O3_ppm)
    });
  }

  // 4. Carbon Monoxide (8-hr avg) - Input: ppm
  if (hasValue(readings.CO_ppm)) {
    subIndices.push({
      pollutant: 'CO',
      value: calculateCOIndex(readings.CO_ppm)
    });
  }

  // 5. Nitrogen Dioxide (1-hr avg) - Input: ppm
  if (hasValue(readings.NO2_ppm)) {
    subIndices.push({
      pollutant: 'NO2',
      value: calculateNO2Index(readings.NO2_ppm)
    });
  }

  // 6. Sulfur Dioxide (1-hr avg) - Input: ppm
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
    predominant: maxIndex.pollutant,
    allSubIndices: subIndices // Optional: include all sub-indices for debugging
  };
}

// --- SUB-INDEX FORMULAS (OFFICIAL MALAYSIAN API) ---

/**
 * PM10 Calculation (µg/m³)
 * Official Malaysian DOE Formula
 */
function calculatePM10Index(conc) {
  if (conc <= 50) {
    return conc;
  } else if (conc <= 350) {
    return 50 + ((conc - 50) * 0.5);
  } else if (conc <= 420) {
    return 200 + ((conc - 350) * 1.4286);
  } else if (conc <= 500) {
    return 300 + ((conc - 420) * 1.25);
  } else {
    return 400 + (conc - 500);
  }
}

/**
 * PM2.5 Calculation (µg/m³)
 * Official Malaysian DOE Formula (Modified from USEPA)
 * Reference: DOE API_Calculation.pdf page 10
 */
function calculatePM25Index(conc) {
  if (conc <= 12.0) {
    return 4.1667 * conc;
  } else if (conc <= 75.5) {
    return 0.7741 * (conc - 12.1) + 51;
  } else if (conc <= 150.4) {
    return 1.3218 * (conc - 75.5) + 101;
  } else if (conc <= 250.4) {
    return 0.9909 * (conc - 150.5) + 201;
  } else if (conc <= 350.4) {
    return 0.9909 * (conc - 250.5) + 301;
  } else if (conc <= 500.4) {
    return 0.6604 * (conc - 350.5) + 401;
  } else {
    // For values above 500.4, continue with the last slope
    return 0.6604 * (conc - 350.5) + 401;
  }
}

/**
 * Ozone Calculation (ppm)
 * Malaysian API uses different formulas for different ranges
 * 
 * Note: For real-time monitoring:
 * - Use 8-hour average for normal conditions
 * - Use 1-hour average for high pollution events
 */
function calculateOzoneIndex(conc) {
  // Convert ppm to breakpoints
  // Malaysian API for O3 (8-hour average basis)
  
  if (conc <= 0.1) {
    // 0-0.1 ppm → 0-100 API
    return conc * 1000;
  } else if (conc <= 0.2) {
    // 0.1-0.2 ppm → 100-200 API
    return 100 + ((conc - 0.1) * 1000);
  } else if (conc <= 0.4) {
    // 0.2-0.4 ppm → 200-300 API
    return 200 + ((conc - 0.2) * 500);
  } else {
    // Above 0.4 ppm → 300+ API
    return 300 + ((conc - 0.4) * 1000);
  }
}

/**
 * Carbon Monoxide Calculation (ppm)
 * 8-hour average basis
 */
function calculateCOIndex(conc) {
  if (conc <= 9.0) {
    // 0-9 ppm → 0-100 API
    return conc * 11.111111;
  } else if (conc <= 15.0) {
    // 9-15 ppm → 100-200 API
    return 100 + ((conc - 9.0) * 16.66667);
  } else if (conc <= 30.0) {
    // 15-30 ppm → 200-300 API
    return 200 + ((conc - 15.0) * 6.66667);
  } else {
    // Above 30 ppm → 300+ API
    return 300 + ((conc - 30.0) * 10);
  }
}

/**
 * Nitrogen Dioxide Calculation (ppm)
 * 1-hour average basis
 */
function calculateNO2Index(conc) {
  if (conc <= 0.17) {
    // 0-0.17 ppm → 0-100 API
    return conc * 588.23529;
  } else if (conc <= 0.6) {
    // 0.17-0.6 ppm → 100-200 API
    return 100 + ((conc - 0.17) * 232.56);
  } else if (conc <= 1.2) {
    // 0.6-1.2 ppm → 200-300 API
    return 200 + ((conc - 0.6) * 166.667);
  } else {
    // Above 1.2 ppm → 300+ API
    return 300 + ((conc - 1.2) * 250);
  }
}

/**
 * Sulfur Dioxide Calculation (ppm)
 * 1-hour average basis
 */
function calculateSO2Index(conc) {
  if (conc <= 0.04) {
    // 0-0.04 ppm → 0-100 API
    return conc * 2500;
  } else if (conc <= 0.3) {
    // 0.04-0.3 ppm → 100-200 API
    return 100 + ((conc - 0.04) * 384.61);
  } else if (conc <= 0.6) {
    // 0.3-0.6 ppm → 200-300 API
    return 200 + ((conc - 0.3) * 333.333);
  } else {
    // Above 0.6 ppm → 300+ API
    return 300 + ((conc - 0.6) * 500);
  }
}

/**
 * Determine Status Category based on API value
 * Official Malaysian API Health Categories
 */
function getApiStatus(api) {
  if (api <= 50) return 'Good';
  if (api <= 100) return 'Moderate';
  if (api <= 200) return 'Unhealthy';
  if (api <= 300) return 'Very Unhealthy';
  if (api > 500) return 'Emergency';
  return 'Hazardous';
}

/**
 * Helper: Safe Value Check
 */
function hasValue(val) {
  return val !== null && val !== undefined && !isNaN(val) && val >= 0;
}

/**
 * Get health advice based on API status
 */
function getHealthAdvice(api) {
  const status = getApiStatus(api);
  
  const advice = {
    'Good': 'Air quality is good. No restrictions for outdoor activities.',
    'Moderate': 'Air quality is acceptable. No restrictions for outdoor activities.',
    'Unhealthy': 'Unhealthy for sensitive groups. Limit prolonged outdoor activities for elderly, pregnant women, children and those with heart/lung conditions.',
    'Very Unhealthy': 'Unhealthy for everyone. Reduce physical activities. High risk groups should stay indoors.',
    'Hazardous': 'Health alert: everyone may experience serious health effects. Avoid all outdoor activities.',
    'Emergency': 'Health emergency: Follow National Security Council instructions. Stay indoors.'
  };
  
  return {
    status,
    advice: advice[status] || 'No data available',
    apiValue: Math.round(api)
  };
}

/**
 * Convert ppb to ppm (for gases)
 */
function ppbToPpm(ppb) {
  return ppb / 1000;
}

/**
 * Convert ppm to ppb (for gases)
 */
function ppmToPpb(ppm) {
  return ppm * 1000;
}

module.exports = {
  calculateMalaysianAPI,
  calculatePM10Index,
  calculatePM25Index,
  calculateOzoneIndex,
  calculateCOIndex,
  calculateNO2Index,
  calculateSO2Index,
  getApiStatus,
  getHealthAdvice,
  ppbToPpm,
  ppmToPpb
};