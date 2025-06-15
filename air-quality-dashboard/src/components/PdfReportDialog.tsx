"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Calendar } from "lucide-react";

const PdfReportDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPollutants, setSelectedPollutants] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [reportStartDate, setReportStartDate] = useState("2025-06-10");
  const [reportEndDate, setReportEndDate] = useState("2025-06-10");
  const [dataAggregation, setDataAggregation] = useState("raw");

  // Pollutant options
  const pollutantOptions = [
    { id: "pm25", label: "PM2.5" },
    { id: "pm10", label: "PM10" },
    { id: "no2", label: "NO2" },
    { id: "co2", label: "CO2" },
    { id: "aqi", label: "AQI" },
  ];

  // Device options
  const deviceOptions = [
    { id: "device1", label: "Device 1 - Location 1" },
    { id: "device2", label: "Device 2 - Location 2" },
    { id: "device3", label: "Device 3 - Location 3" },
    { id: "device4", label: "Device 4 - Location 4" },
  ];

  // Handle pollutant selection
  const handlePollutantChange = (pollutantId, checked) => {
    if (checked) {
      setSelectedPollutants([...selectedPollutants, pollutantId]);
    } else {
      setSelectedPollutants(
        selectedPollutants.filter((id) => id !== pollutantId)
      );
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
  const handleGenerateReport = () => {
    console.log("Generating report with:", {
      pollutants: selectedPollutants,
      devices: selectedDevices,
      startDate: reportStartDate,
      endDate: reportEndDate,
      aggregation: dataAggregation,
    });

    // Here you would implement the actual PDF generation logic
    alert(
      "Report generation initiated! (This is a demo - implement PDF generation here)"
    );
    setIsOpen(false);
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
          <DialogTitle className="text-2xl font-bold">
            Generate Report
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Historical Data &gt; Generate Report
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Pollutants */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select Pollutants
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {pollutantOptions.map((pollutant) => (
                <div key={pollutant.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={pollutant.id}
                    checked={selectedPollutants.includes(pollutant.id)}
                    onCheckedChange={(checked) =>
                      handlePollutantChange(pollutant.id, checked)
                    }
                  />
                  <Label
                    htmlFor={pollutant.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {pollutant.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Select IoT Devices */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Select IoT Devices
            </Label>
            <Select>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select devices..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  {deviceOptions.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center space-x-2 py-2"
                    >
                      <Checkbox
                        id={device.id}
                        checked={selectedDevices.includes(device.id)}
                        onCheckedChange={(checked) =>
                          handleDeviceChange(device.id, checked)
                        }
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
          </div>

          {/* Date Range */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Date Range
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="report-start-date"
                  className="text-sm text-gray-600"
                >
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
                <Label
                  htmlFor="report-end-date"
                  className="text-sm text-gray-600"
                >
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
            <Label className="text-base font-semibold mb-3 block">
              Data Aggregation
            </Label>
            <RadioGroup
              value={dataAggregation}
              onValueChange={setDataAggregation}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="raw" id="raw" />
                <Label
                  htmlFor="raw"
                  className="text-sm font-normal cursor-pointer"
                >
                  Raw Data
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hourly" id="hourly" />
                <Label
                  htmlFor="hourly"
                  className="text-sm font-normal cursor-pointer"
                >
                  Hourly Average
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="daily" />
                <Label
                  htmlFor="daily"
                  className="text-sm font-normal cursor-pointer"
                >
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
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            className="bg-gray-900 hover:bg-gray-800 text-white flex-1 md:flex-none"
            disabled={
              selectedPollutants.length === 0 || selectedDevices.length === 0
            }
          >
            Generate Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PdfReportDialog;
