/**
 * Manufacturer and Model Extraction Utility
 * Extracts manufacturer and model information from gauge names
 */

/**
 * Extract manufacturer and model from gauge name
 * @param {string} name - The gauge name
 * @param {string} equipmentType - The equipment type (hand_tool, large_equipment, etc.)
 * @returns {Object} - { manufacturer, model_number }
 */
function extractManufacturerAndModel(name, equipmentType) {
  if (!name || typeof name !== 'string') {
    return { manufacturer: null, model_number: null };
  }

  let manufacturer = null;
  let model_number = null;
  
  // Enhanced manufacturer patterns (order matters - more specific first)
  const manufacturerPatterns = [
    'Brown & Sharpe', 'Taylor Hobson', 'ZEISS', 'Mitutoyo', 'Starrett', 
    'Federal', 'Fowler', 'Mahr', 'Tesa', 'Interapid', 'SPI', 'Hexagon', 
    'Renishaw', 'Wilson', 'Haas', 'DMG', 'Okuma', 'Mazak', 'Sandvik', 
    'Kennametal', 'Seco', 'Iscar', 'Sumitomo', 'Kyocera', 'Tungaloy', 
    'Korloy'
  ];
  
  // Find manufacturer in the name
  for (const mfg of manufacturerPatterns) {
    const regex = new RegExp(`\\b${mfg.replace(/&/g, '\\&').replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(name)) {
      manufacturer = mfg;
      break;
    }
  }
  
  if (manufacturer) {
    // Extract model number based on equipment type and patterns
    const mfgIndex = name.toLowerCase().indexOf(manufacturer.toLowerCase());
    const afterMfg = name.substring(mfgIndex + manufacturer.length).trim();
    
    if (equipmentType === 'large_equipment') {
      // For large equipment, look for specific model patterns
      let modelMatch = afterMfg.match(/^([A-Z0-9\-\.\/\s]+?)(?:\s+(?:CMM|Optical|Surface|Roundness|Hardness|Tester|Machine))/i);
      if (!modelMatch) {
        // Try pattern like "Global CMM 7/9/6"
        modelMatch = afterMfg.match(/^(Global\s+CMM\s+\d+\/\d+\/\d+)/i);
      }
      if (!modelMatch) {
        // Try pattern like "Contura G2 RDS CMM"
        modelMatch = afterMfg.match(/^([A-Z][A-Za-z0-9\s]+(?:G2|Navigator|Prismo|Contura|VH\d+|Talyrond\s+\d+))/i);
      }
      if (!modelMatch) {
        // Try simple alphanumeric model before common words
        modelMatch = afterMfg.match(/^([A-Z0-9\-\.\/]+)/i);
      }
      if (modelMatch) {
        model_number = modelMatch[1].trim();
      }
    } else if (equipmentType === 'hand_tool') {
      // For hand tools, model is often the size/range
      let modelMatch = afterMfg.match(/^(\d+["']?(?:\s*[-x×]\s*\d+["']?)?)/i);  // 6", 0-1", 24"×24"
      if (!modelMatch) {
        // Try alphanumeric model
        modelMatch = afterMfg.match(/^([A-Z0-9\-\.\/]+)/i);
      }
      if (modelMatch) {
        model_number = modelMatch[1].replace(/["']/g, '"').trim();
      }
    } else if (equipmentType === 'thread_gauge') {
      // For thread gauges, model might be the thread specification
      const modelMatch = afterMfg.match(/^([A-Z0-9\-\.\/\s×]+?)(?:\s+(?:Thread|Plug|Ring|Gauge|GO|NO.?GO))/i);
      if (modelMatch) {
        model_number = modelMatch[1].trim();
      }
    } else {
      // Generic extraction for other types
      const modelMatch = afterMfg.match(/^([A-Z0-9\-\.\/\s]+?)(?:\s+(?:Thread|Gauge|Block|Standard|Digital|Dial|Grade))/i);
      if (modelMatch) {
        model_number = modelMatch[1].trim();
      }
    }
  }
  
  // Clean up model number
  if (model_number) {
    model_number = model_number.replace(/\s+/g, ' ').trim();
    // Don't use common generic terms as model numbers
    const genericTerms = ['Digital', 'Dial', 'Standard', 'Grade', 'Set', 'Machine', 'Tester', 'Gauge', 'Block'];
    if (genericTerms.some(term => model_number === term)) {
      model_number = null;
    }
    // Don't use single characters or very short generic strings
    if (model_number && model_number.length <= 1) {
      model_number = null;
    }
  }
  
  return { manufacturer, model_number };
}

/**
 * Add manufacturer and model data to gauge objects
 * @param {Array} gauges - Array of gauge objects
 * @returns {Array} - Gauges with manufacturer and model_number fields added
 */
function addManufacturerData(gauges) {
  if (!Array.isArray(gauges)) {
    return gauges;
  }

  return gauges.map(gauge => {
    // Only extract from name if database columns are empty
    // Now that we have real manufacturer and model_number columns, use those first
    if (gauge.manufacturer || gauge.model_number) {
      // Database has values, don't overwrite them
      return gauge;
    }

    // Database fields are empty, extract from name as fallback
    const extracted = extractManufacturerAndModel(gauge.name, gauge.equipment_type);
    return {
      ...gauge,
      manufacturer: extracted.manufacturer || gauge.manufacturer,
      model_number: extracted.model_number || gauge.model_number
    };
  });
}

/**
 * Add manufacturer and model data to a single gauge object
 * @param {Object} gauge - Single gauge object
 * @returns {Object} - Gauge with manufacturer and model_number fields added
 */
function addManufacturerDataSingle(gauge) {
  if (!gauge || typeof gauge !== 'object') {
    return gauge;
  }

  // Only extract from name if database columns are empty
  // Now that we have real manufacturer and model_number columns, use those first
  if (gauge.manufacturer || gauge.model_number) {
    // Database has values, don't overwrite them
    return gauge;
  }

  // Database fields are empty, extract from name as fallback
  const extracted = extractManufacturerAndModel(gauge.name, gauge.equipment_type);
  return {
    ...gauge,
    manufacturer: extracted.manufacturer || gauge.manufacturer,
    model_number: extracted.model_number || gauge.model_number
  };
}

module.exports = {
  extractManufacturerAndModel,
  addManufacturerData,
  addManufacturerDataSingle
};