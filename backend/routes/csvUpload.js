// routes/csvUpload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const SensorReading = require('../model/SensorReading');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// POST /api/csv-upload/preview
// Preview CSV data before uploading
router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    stream
      .pipe(csv())
      .on('data', (data) => {
        if (results.length < 10) { // Only preview first 10 rows
          results.push(data);
        }
      })
      .on('end', () => {
        res.json({
          success: true,
          preview: results,
          totalRows: results.length,
          columns: results.length > 0 ? Object.keys(results[0]) : []
        });
      })
      .on('error', (error) => {
        res.status(500).json({ error: 'Failed to parse CSV', message: error.message });
      });

  } catch (error) {
    console.error('CSV preview error:', error);
    res.status(500).json({ error: 'Failed to preview CSV', message: error.message });
  }
});

// POST /api/csv-upload/upload
// Upload and insert CSV data into database
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { deviceId, deviceName, location } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    const results = [];
    const errors = [];
    const stream = Readable.from(req.file.buffer.toString());

    // Parse CSV
    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${results.length} rows from CSV`);

    // Transform and insert data
    let inserted = 0;
    let duplicates = 0;
    let failed = 0;

    for (const [index, row] of results.entries()) {
      try {
        // Map CSV columns to database schema
        const document = {
          metadata: {
            device_id: deviceId,
            topic: `csv_upload/${deviceId}`,
            timestamp_server: new Date(),
            timestamp_device: row.Timestamp,
            location: location || 'Unknown'
          },
          
          // Environmental data (BME280)
          temperature_c: parseFloat(row.Temperature_C),
          pressure_hpa: parseFloat(row.Pressure_hPa),
          humidity_pct: parseFloat(row.Humidity_Pct),
          
          // Particulate matter (PMS5003)
          pm1_0: parseInt(row.PM1_0),
          pm2_5: parseInt(row.PM2_5),
          pm10: parseInt(row.PM10),
          particles_0_3um: parseInt(row.Particles_0_3um),
          particles_2_5um: parseInt(row.Particles_2_5um),
          
          // Alphasense gas sensors
          alphasense_voltages: {
            SN4_AE_V: parseFloat(row.SN4_AE_V),
            SN4_WE_V: parseFloat(row.SN4_WE_V),
            SN3_AE_V: parseFloat(row.SN3_AE_V),
            SN3_WE_V: parseFloat(row.SN3_WE_V),
            SN2_AE_V: parseFloat(row.SN2_AE_V),
            SN2_WE_V: parseFloat(row.SN2_WE_V),
            SN1_AE_V: parseFloat(row.SN1_AE_V),
            SN1_WE_V: parseFloat(row.SN1_WE_V),
            Pt1000_Pos_V: parseFloat(row.Pt1000_Pos_V),
            Pt1000_Neg_V: parseFloat(row.Pt1000_Neg_V)
          }
        };

        // Try to insert (will fail if duplicate due to unique index)
        await SensorReading.create(document);
        inserted++;

      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error
          duplicates++;
        } else {
          failed++;
          errors.push({
            row: index + 1,
            timestamp: row.Timestamp,
            error: error.message
          });
        }
      }
    }

    res.json({
      success: true,
      message: 'CSV data processed',
      stats: {
        total: results.length,
        inserted,
        duplicates,
        failed
      },
      errors: errors.slice(0, 10), // Return first 10 errors only
      deviceId,
      deviceName
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload CSV', 
      message: error.message 
    });
  }
});

// POST /api/csv-upload/validate
// Validate CSV structure before upload
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const requiredColumns = [
      'Timestamp',
      'Temperature_C',
      'Pressure_hPa',
      'Humidity_Pct',
      'PM1_0',
      'PM2_5',
      'PM10',
      'Particles_0_3um',
      'Particles_2_5um',
      'SN4_AE_V',
      'SN4_WE_V',
      'SN3_AE_V',
      'SN3_WE_V',
      'SN2_AE_V',
      'SN2_WE_V',
      'SN1_AE_V',
      'SN1_WE_V',
      'Pt1000_Pos_V',
      'Pt1000_Neg_V'
    ];

    const results = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => {
          if (results.length < 5) {
            results.push(data);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty or invalid'
      });
    }

    const actualColumns = Object.keys(results[0]);
    const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !requiredColumns.includes(col));

    const isValid = missingColumns.length === 0;

    res.json({
      success: true,
      valid: isValid,
      requiredColumns,
      actualColumns,
      missingColumns,
      extraColumns,
      sampleData: results
    });

  } catch (error) {
    console.error('CSV validation error:', error);
    res.status(500).json({ error: 'Failed to validate CSV', message: error.message });
  }
});

module.exports = router;