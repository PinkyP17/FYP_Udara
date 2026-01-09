'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, Calendar, Download, Loader2 } from 'lucide-react';

const PdfReportDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPollutants, setSelectedPollutants] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [reportStartDate, setReportStartDate] = useState('2025-06-10');
  const [reportEndDate, setReportEndDate] = useState('2025-06-10');
  const [dataAggregation, setDataAggregation] = useState('raw');
  const [isGenerating, setIsGenerating] = useState(false);

  // Pollutant options
  const pollutantOptions = [
    { id: 'pm25', label: 'PM2.5', unit: 'μg/m³' },
    { id: 'pm10', label: 'PM10', unit: 'μg/m³' },
    { id: 'no2', label: 'NO2', unit: 'μg/m³' },
    { id: 'co2', label: 'CO2', unit: 'ppm' },
    { id: 'aqi', label: 'AQI', unit: '' },
  ];

  // Device options
  const deviceOptions = [
    {
      id: 'device1',
      label: 'Device 1 - FSKTM',
      location: 'Faculty of Computer Science & IT',
    },
    {
      id: 'device2',
      label: 'Device 2 - FSSS',
      location: 'Faculty of Sports & Exercise Science',
    },
    {
      id: 'device3',
      label: 'Device 3 - FAB',
      location: 'Faculty of Built Environment',
    },
    { id: 'device4', label: 'Device 4 - Library', location: 'Main Library' },
  ];

  // Generate mock data based on user selections
  const generateMockData = (startDate, endDate, pollutants, devices, aggregation) => {
    const data = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    let currentDate = new Date(start);
    let recordCount = 0;
    const maxRecords = aggregation === 'raw' ? 30 : 100; // Reduced further

    while (currentDate <= end && recordCount < maxRecords) {
      devices.forEach((deviceId) => {
        if (recordCount >= maxRecords) return;

        const device = deviceOptions.find((d) => d.id === deviceId);
        const dataPoint = {
          date: currentDate.toISOString().split('T')[0],
          time:
            aggregation === 'raw'
              ? `${Math.floor(Math.random() * 24)
                  .toString()
                  .padStart(2, '0')}:${Math.floor(Math.random() * 60)
                  .toString()
                  .padStart(2, '0')}`
              : null,
          device: device?.label || deviceId,
          location: device?.location || 'Unknown Location',
        };

        pollutants.forEach((pollutantId) => {
          let value;

          switch (pollutantId) {
            case 'pm25':
              value = (Math.random() * 50 + 10).toFixed(1);
              break;
            case 'pm10':
              value = (Math.random() * 80 + 20).toFixed(1);
              break;
            case 'no2':
              value = (Math.random() * 40 + 5).toFixed(1);
              break;
            case 'co2':
              value = (Math.random() * 500 + 400).toFixed(0);
              break;
            case 'aqi':
              value = Math.floor(Math.random() * 150 + 50);
              break;
            default:
              value = (Math.random() * 100).toFixed(1);
          }

          dataPoint[pollutantId] = value;
        });

        data.push(dataPoint);
        recordCount++;
      });

      if (aggregation === 'daily') {
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (aggregation === 'hourly') {
        currentDate.setHours(currentDate.getHours() + 1);
      } else {
        currentDate.setMinutes(currentDate.getMinutes() + Math.floor(Math.random() * 30) + 15);
      }
    }

    return data;
  };

  // Calculate summary statistics
  const calculateSummaryStats = (data, pollutants) => {
    const stats = {};

    pollutants.forEach((pollutantId) => {
      const values = data.map((d) => parseFloat(d[pollutantId])).filter((v) => !isNaN(v));
      if (values.length > 0) {
        stats[pollutantId] = {
          average: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
          min: Math.min(...values).toFixed(2),
          max: Math.max(...values).toFixed(2),
          count: values.length,
        };
      }
    });

    return stats;
  };

  // Create a simple table manually (without autoTable to avoid conflicts)
  const drawTable = (doc, headers, data, startY) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const tableWidth = pageWidth - margin * 2;
    const colWidth = tableWidth / headers.length;

    let yPosition = startY;
    const rowHeight = 8;

    // Draw headers
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(79, 70, 229);
    doc.setTextColor(255, 255, 255);

    // Header background
    doc.rect(margin, yPosition - 6, tableWidth, rowHeight, 'F');

    // Header text
    headers.forEach((header, index) => {
      const xPosition = margin + index * colWidth + 2;
      doc.text(header.substring(0, 12), xPosition, yPosition); // Truncate long headers
    });

    yPosition += rowHeight;

    // Draw data rows
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    data.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition - 6, tableWidth, rowHeight, 'F');
      }

      row.forEach((cell, colIndex) => {
        const xPosition = margin + colIndex * colWidth + 2;
        const cellText = String(cell || '').substring(0, 15); // Truncate long text
        doc.text(cellText, xPosition, yPosition);
      });

      yPosition += rowHeight;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        yPosition = 20;
      }
    });

    return yPosition + 10;
  };

  // Generate PDF without autoTable
  const generatePDFReport = async (reportData, summaryStats) => {
    try {
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Air Quality Data Report', pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 15;

      // Subtitle
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('University Malaya Air Quality Monitoring System', pageWidth / 2, yPosition, {
        align: 'center',
      });
      yPosition += 20;

      // Report Details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Report Details', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const reportDetails = [
        `Generation Date: ${new Date().toLocaleDateString()}`,
        `Data Period: ${reportStartDate} to ${reportEndDate}`,
        `Aggregation: ${dataAggregation.charAt(0).toUpperCase() + dataAggregation.slice(1)}`,
        `Selected Pollutants: ${selectedPollutants
          .map((p) => pollutantOptions.find((opt) => opt.id === p)?.label)
          .join(', ')}`,
        `Selected Devices: ${selectedDevices
          .map((d) => deviceOptions.find((opt) => opt.id === d)?.label)
          .join(', ')}`,
        `Total Data Points: ${reportData.length}`,
      ];

      reportDetails.forEach((detail) => {
        doc.text(detail, 20, yPosition);
        yPosition += 6;
      });

      yPosition += 15;

      // Summary Statistics
      if (Object.keys(summaryStats).length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary Statistics', 20, yPosition);
        yPosition += 10;

        const summaryHeaders = ['Pollutant', 'Average', 'Min', 'Max', 'Count', 'Unit'];
        const summaryTableData = [];

        Object.entries(summaryStats).forEach(([pollutantId, stats]) => {
          const pollutant = pollutantOptions.find((p) => p.id === pollutantId);
          summaryTableData.push([
            pollutant?.label || pollutantId,
            stats.average,
            stats.min,
            stats.max,
            stats.count,
            pollutant?.unit || '',
          ]);
        });

        yPosition = drawTable(doc, summaryHeaders, summaryTableData, yPosition);
      }

      // Data Table
      if (reportData.length > 0) {
        // Check if we need a new page
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`Detailed Data (First 20 Records)`, 20, yPosition);
        yPosition += 10;

        // Prepare table headers
        const headers = ['Date'];
        if (dataAggregation === 'raw') headers.push('Time');
        headers.push('Device');
        selectedPollutants.forEach((pollutantId) => {
          const pollutant = pollutantOptions.find((p) => p.id === pollutantId);
          headers.push(pollutant?.label || pollutantId);
        });

        // Prepare table data (limit to first 20 rows)
        const tableData = reportData.slice(0, 20).map((row) => {
          const rowData = [row.date];
          if (dataAggregation === 'raw' && row.time) rowData.push(row.time);
          rowData.push(row.device.substring(0, 15)); // Truncate device name
          selectedPollutants.forEach((pollutantId) => {
            rowData.push(row[pollutantId] || 'N/A');
          });
          return rowData;
        });

        yPosition = drawTable(doc, headers, tableData, yPosition);

        // Add note if data was truncated
        if (reportData.length > 20) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.text(
            `Note: Showing first 20 of ${reportData.length} total data points`,
            20,
            yPosition
          );
        }
      }

      // Footer on all pages
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${totalPages} | Generated by Udara Air Quality Monitoring System`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      return doc;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  };

  // Handle pollutant selection
  const handlePollutantChange = (pollutantId, checked) => {
    if (checked) {
      setSelectedPollutants([...selectedPollutants, pollutantId]);
    } else {
      setSelectedPollutants(selectedPollutants.filter((id) => id !== pollutantId));
    }
  };

  // Handle device selection
  const handleDeviceChange = (deviceId, checked) => {
    if (checked) {
      setSelectedDevices([...selectedDevices, deviceId]);
    } else {
      setSelectedDevices(selectedDevices.filter((id) => id !== deviceId));
    }
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    setIsGenerating(true);

    try {
      console.log('Generating report with:', {
        pollutants: selectedPollutants,
        devices: selectedDevices,
        startDate: reportStartDate,
        endDate: reportEndDate,
        aggregation: dataAggregation,
      });

      // Validate inputs
      if (selectedPollutants.length === 0) {
        throw new Error('Please select at least one pollutant');
      }

      if (selectedDevices.length === 0) {
        throw new Error('Please select at least one device');
      }

      // Validate date range
      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);

      if (start > end) {
        throw new Error('Start date must be before end date');
      }

      // Generate mock data based on user selections
      const reportData = generateMockData(
        reportStartDate,
        reportEndDate,
        selectedPollutants,
        selectedDevices,
        dataAggregation
      );

      if (reportData.length === 0) {
        throw new Error('No data found for the selected criteria');
      }

      // Calculate summary statistics
      const summaryStats = calculateSummaryStats(reportData, selectedPollutants);

      // Generate PDF
      const doc = await generatePDFReport(reportData, summaryStats);

      // Create filename
      const filename = `air_quality_report_${reportStartDate}_to_${reportEndDate}.pdf`;

      // Download the PDF
      doc.save(filename);

      // Close dialog
      setIsOpen(false);

      console.log('Report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Download PDF Report
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Generate Report</DialogTitle>
          <DialogDescription className="text-gray-600">
            Historical Data &gt; Generate Report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Pollutants */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Pollutants</Label>
            <div className="grid grid-cols-2 gap-3">
              {pollutantOptions.map((pollutant) => (
                <div key={pollutant.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={pollutant.id}
                    checked={selectedPollutants.includes(pollutant.id)}
                    onCheckedChange={(checked) => handlePollutantChange(pollutant.id, checked)}
                  />
                  <Label htmlFor={pollutant.id} className="text-sm font-normal cursor-pointer">
                    {pollutant.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Select IoT Devices */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select IoT Devices</Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select devices..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  {deviceOptions.map((device) => (
                    <div key={device.id} className="flex items-center space-x-2 py-2">
                      <Checkbox
                        id={device.id}
                        checked={selectedDevices.includes(device.id)}
                        onCheckedChange={(checked) => handleDeviceChange(device.id, checked)}
                      />
                      <Label
                        htmlFor={device.id}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {device.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </SelectContent>
            </Select>

            {/* Show selected devices */}
            {selectedDevices.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Selected:{' '}
                {selectedDevices
                  .map((id) => deviceOptions.find((d) => d.id === id)?.label)
                  .join(', ')}
              </div>
            )}
          </div>

          {/* Date Range */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Date Range</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="report-start-date" className="text-sm text-gray-600">
                  Start Date
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="report-start-date"
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full"
                  />
                  <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <Label htmlFor="report-end-date" className="text-sm text-gray-600">
                  End Date
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="report-end-date"
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full"
                  />
                  <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Data Aggregation */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Data Aggregation</Label>
            <RadioGroup
              value={dataAggregation}
              onValueChange={setDataAggregation}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="raw" id="raw" />
                <Label htmlFor="raw" className="text-sm font-normal cursor-pointer">
                  Raw Data (individual readings)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="hourly" />
                <Label htmlFor="hourly" className="text-sm font-normal cursor-pointer">
                  Hourly Average
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="text-sm font-normal cursor-pointer">
                  Daily Average
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 md:flex-none"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            className="bg-gray-900 hover:bg-gray-800 text-white flex-1 md:flex-none"
            disabled={
              selectedPollutants.length === 0 || selectedDevices.length === 0 || isGenerating
            }
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfReportDialog;
