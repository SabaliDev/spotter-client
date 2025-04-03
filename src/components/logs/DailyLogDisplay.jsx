// src/components/logs/DailyLogDisplay.jsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithAuth } from '@/lib/apiService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { parseISO, format, getHours, getMinutes, differenceInMinutes, startOfDay, endOfDay, isWithinInterval, formatDuration, intervalToDuration } from 'date-fns'; // Added more date-fns helpers

// Define duty status types (match HOS rules, map API event_type to these)
const DUTY_STATUS = {
    OFF_DUTY: 'off_duty',
    SLEEPER_BERTH: 'sleeper_berth', // Add if your API uses it
    DRIVING: 'driving',
    ON_DUTY_NOT_DRIVING: 'on_duty_not_driving', // Add if your API uses it
};

// Map API event_type to our standard DUTY_STATUS keys
const mapApiStatus = (apiEventType) => {
    // Add mappings based on your actual API `event_type` values
    switch (apiEventType?.toLowerCase()) {
        case 'off_duty':
            return DUTY_STATUS.OFF_DUTY;
        case 'sleeper': // Example mapping
             return DUTY_STATUS.SLEEPER_BERTH;
        case 'driving':
            return DUTY_STATUS.DRIVING;
        case 'on_duty': // Example mapping for on_duty_not_driving
             return DUTY_STATUS.ON_DUTY_NOT_DRIVING;
        default:
            console.warn(`Unmapped API event_type: ${apiEventType}`);
            // Decide on a default or return null/undefined
            // Returning OFF_DUTY might be safer than null for drawing.
            return DUTY_STATUS.OFF_DUTY;
    }
};


// --- Constants for Drawing ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 120;
const GRID_START_X = 50; // Increased padding for longer labels
const GRID_WIDTH = CANVAS_WIDTH - GRID_START_X - 10;
const HOURS_IN_DAY = 24;
const PIXELS_PER_HOUR = GRID_WIDTH / HOURS_IN_DAY;
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

const STATUS_Y_POS = {
    [DUTY_STATUS.OFF_DUTY]: 20,
    [DUTY_STATUS.SLEEPER_BERTH]: 50,
    [DUTY_STATUS.DRIVING]: 80,
    [DUTY_STATUS.ON_DUTY_NOT_DRIVING]: 110,
};
const LINE_HEIGHT = 30;

// Colors
const GRID_LINE_COLOR = '#E5E7EB';
const TIME_MARKER_COLOR = '#9CA3AF';
const STATUS_LINE_COLOR = '#084152';
const TEXT_COLOR = '#374151';
// --- End Constants ---

// --- Helper function to format duration (e.g., 1h 30m) ---
const formatMinutesDuration = (totalMinutes) => {
     if (isNaN(totalMinutes) || totalMinutes <= 0) return '0h 0m';
     const duration = intervalToDuration({ start: 0, end: totalMinutes * 60 * 1000 });
     return formatDuration(duration, { format: ['hours', 'minutes'] })
            .replace(' hours', 'h')
            .replace(' hour', 'h')
            .replace(' minutes', 'm')
            .replace(' minute', 'm');
};


export default function DailyLogDisplay({ tripId, date: dateProp }) {
    const { getAccessToken, refreshAccessToken, logout } = useAuth();
    const [processedLogEntries, setProcessedLogEntries] = useState([]); // Entries processed for the specific date
    const [originalLogData, setOriginalLogData] = useState(null); // Store raw API response
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tripDetails, setTripDetails] = useState({});
    const [remarks, setRemarks] = useState([]);
    const [totals, setTotals] = useState({}); // Totals calculated for the specific date
    const canvasRef = useRef(null);

    // --- Get minutes from midnight for a given time ON THE SPECIFIC DATE ---
    const getMinutesFromMidnightOnDate = useCallback((timestamp, displayDate) => {
        try {
            const dt = parseISO(timestamp);
            const dayStart = startOfDay(displayDate);

            // Check if the timestamp is on the display date
            if (!isWithinInterval(dt, { start: dayStart, end: endOfDay(displayDate) })) {
                 // If the timestamp is before the start of the display date, it starts at minute 0
                 if (dt < dayStart) return 0;
                 // If the timestamp is after the end of the display date, treat it as the end of the day (or handle as error)
                 // For simplicity here, let's clamp it to the end. Careful with multi-day views.
                 // A better approach might filter entries entirely outside the date range beforehand.
                  return HOURS_IN_DAY * 60;
            }
            // Return minutes past midnight of the display date
            return differenceInMinutes(dt, dayStart);
        } catch (e) {
            console.error("Error parsing date:", timestamp, e);
            return 0;
        }
    }, []);

    // --- Process Raw API Data for the specific date ---
     const processApiDataForDate = useCallback((apiData, displayDate) => {
        if (!apiData || !Array.isArray(apiData)) return { entries: [], remarks: [], totals: {}, details: {} };

        const dayStart = startOfDay(displayDate);
        const dayEnd = endOfDay(displayDate);
        const processedEntries = [];
        const remarksList = [];
        const statusTotals = { // Initialize totals
             [DUTY_STATUS.OFF_DUTY]: 0,
             [DUTY_STATUS.SLEEPER_BERTH]: 0,
             [DUTY_STATUS.DRIVING]: 0,
             [DUTY_STATUS.ON_DUTY_NOT_DRIVING]: 0,
         };

        let commonTripDetails = {}; // Extract details if consistent

        // Need to determine the status at the very beginning of the displayDate (00:00)
        let statusAtMidnight = DUTY_STATUS.OFF_DUTY; // Default assumption
         const entryEndingBeforeMidnight = apiData
            .filter(log => parseISO(log.end_time) <= dayStart)
            .sort((a, b) => differenceInMinutes(parseISO(b.end_time), parseISO(a.end_time)))[0]; // Get the latest entry ending before or at midnight

         if (entryEndingBeforeMidnight) {
            statusAtMidnight = mapApiStatus(entryEndingBeforeMidnight.event_type);
         } else {
             // If no entry ends before midnight, find the first entry starting before or at midnight
             const entryStartingBeforeMidnight = apiData
                .filter(log => parseISO(log.start_time) <= dayStart)
                .sort((a, b) => differenceInMinutes(parseISO(a.start_time), parseISO(b.start_time)))[0];
             if (entryStartingBeforeMidnight) {
                 // The status *before* this entry started might be needed, which is complex.
                 // Or, assume the status of this entry continues from the previous day.
                 statusAtMidnight = mapApiStatus(entryStartingBeforeMidnight.event_type);
             }
             // If still no status, keep the default OFF_DUTY
         }

         // Add a synthetic entry for 00:00 if the first real entry doesn't start exactly at midnight
         const firstRealEntry = apiData.sort((a, b) => differenceInMinutes(parseISO(a.start_time), parseISO(b.start_time)))[0];
         const firstRealEntryStart = firstRealEntry ? parseISO(firstRealEntry.start_time) : null;

         if (!firstRealEntry || firstRealEntryStart > dayStart) {
            processedEntries.push({
                 timestamp: dayStart.toISOString(), // Start of the day
                 status: statusAtMidnight,
                 isSyntheticStart: true // Flag for debugging/handling
            });
         }


        apiData.forEach(log => {
            try {
                const startTime = parseISO(log.start_time);
                const endTime = parseISO(log.end_time);
                const status = mapApiStatus(log.event_type);

                if (!commonTripDetails.tripId && log.trip) {
                    commonTripDetails.tripId = log.trip;
                    // Potentially fetch full trip details here if needed
                }

                // Check if the log interval overlaps with the display date
                const intervalOverlaps = startTime < dayEnd && endTime > dayStart;

                if (intervalOverlaps) {
                    // Determine the effective start and end times *within* the display date
                    const effectiveStartTime = startTime < dayStart ? dayStart : startTime;
                    const effectiveEndTime = endTime > dayEnd ? dayEnd : endTime;

                    // Calculate duration within the display date
                    const durationOnDate = differenceInMinutes(effectiveEndTime, effectiveStartTime);

                     if (durationOnDate > 0 && status) {
                         statusTotals[status] = (statusTotals[status] || 0) + durationOnDate;
                     }

                    // Add the start of the status change *if* it happens on the display date
                    if (isWithinInterval(startTime, { start: dayStart, end: dayEnd })) {
                         processedEntries.push({
                             timestamp: log.start_time,
                             status: status,
                         });
                    }

                    // Add remarks if the event happens on this date
                     if (log.location && log.location !== "En Route" && isWithinInterval(startTime, { start: dayStart, end: dayEnd })) {
                        remarksList.push({
                            timestamp: log.start_time,
                            location: log.location,
                            comment: status // Use status as comment for now
                        });
                    }
                }

            } catch (e) {
                console.error("Error processing log entry:", log, e);
            }
        });

        // Sort processed entries by time again
        processedEntries.sort((a, b) => differenceInMinutes(parseISO(a.timestamp), parseISO(b.timestamp)));

        // Remove potential duplicate entries at the same timestamp (prefer non-synthetic)
         const uniqueEntries = processedEntries.reduce((acc, current) => {
            const existingIndex = acc.findIndex(entry => entry.timestamp === current.timestamp);
            if (existingIndex > -1) {
                // If current is not synthetic or existing is synthetic, replace
                 if (!current.isSyntheticStart || acc[existingIndex].isSyntheticStart) {
                     acc[existingIndex] = current;
                 }
            } else {
                 acc.push(current);
            }
             return acc;
        }, []);


         // Format totals
         const formattedTotals = {
             off_duty_total: formatMinutesDuration(statusTotals[DUTY_STATUS.OFF_DUTY]),
             sleeper_berth_total: formatMinutesDuration(statusTotals[DUTY_STATUS.SLEEPER_BERTH]),
             driving_total: formatMinutesDuration(statusTotals[DUTY_STATUS.DRIVING]),
             on_duty_not_driving_total: formatMinutesDuration(statusTotals[DUTY_STATUS.ON_DUTY_NOT_DRIVING]),
         };

         // Sort remarks
         remarksList.sort((a, b) => differenceInMinutes(parseISO(a.timestamp), parseISO(b.timestamp)));


        return { entries: uniqueEntries, remarks: remarksList, totals: formattedTotals, details: commonTripDetails };

    }, [getMinutesFromMidnightOnDate]); // Add dependency


    // --- Drawing Function: Grid Background ---
    const drawGrid = useCallback((ctx) => {
        // ... (keep existing drawGrid logic from Step 2) ...
         ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas
         ctx.strokeStyle = GRID_LINE_COLOR;
         ctx.lineWidth = 0.5;

         // Draw vertical lines for hours and labels
         ctx.fillStyle = TEXT_COLOR;
         ctx.font = '10px sans-serif';
         ctx.textAlign = 'center';
         for (let hour = 0; hour <= HOURS_IN_DAY; hour++) {
             const x = GRID_START_X + hour * PIXELS_PER_HOUR;
             ctx.beginPath();
             ctx.moveTo(x, 5); // Start below top edge
             ctx.lineTo(x, CANVAS_HEIGHT - 15); // End above bottom edge
             ctx.stroke();

             // Draw hour labels
             if (hour % 1 === 0) {
                 let label = hour;
                 if (hour === 0 || hour === 24) label = 'M';
                 if (hour === 12) label = 'N';
                 ctx.fillText(label.toString(), x, CANVAS_HEIGHT - 5); // Labels at the bottom
             }

             // Draw 15-minute markers
             for (let min = 15; min < 60; min += 15) {
                 const minuteX = x + min * PIXELS_PER_MINUTE;
                  if(hour < HOURS_IN_DAY){
                     ctx.beginPath();
                     ctx.moveTo(minuteX, 5); // Small tick marks at the top
                     ctx.lineTo(minuteX, 10);
                     ctx.strokeStyle = TIME_MARKER_COLOR;
                     ctx.lineWidth = 0.5;
                     ctx.stroke();
                  }
             }
              ctx.strokeStyle = GRID_LINE_COLOR;
              ctx.lineWidth = 0.5;
         }

         // Draw Status Labels
          ctx.textAlign = 'left'; // Align labels to the left
          ctx.fillStyle = TEXT_COLOR;
          ctx.font = 'bold 9px sans-serif'; // Slightly smaller bold font
          const labelX = 5; // X position for labels
          Object.entries(STATUS_Y_POS).forEach(([statusKey, y]) => {
              let label = '';
               switch(statusKey){
                   case DUTY_STATUS.OFF_DUTY: label = 'OFF'; break;
                   case DUTY_STATUS.SLEEPER_BERTH: label = 'SB'; break;
                   case DUTY_STATUS.DRIVING: label = 'DRIV'; break;
                   case DUTY_STATUS.ON_DUTY_NOT_DRIVING: label = 'ON'; break;
                   default: label = '??';
               }
              ctx.fillText(label, labelX, y + 3); // Adjust position
          });
    }, []);

    // --- Drawing Function: Status Lines ---
    const drawStatusLines = useCallback((ctx, entries, displayDate) => { // Added displayDate
        if (!entries || entries.length === 0) {
            console.log("No processed entries to draw.");
            return;
        };

        ctx.strokeStyle = STATUS_LINE_COLOR;
        ctx.lineWidth = 2;

        console.log("Drawing entries:", entries);

        for (let i = 0; i < entries.length; i++) {
            const currentEntry = entries[i];
            const nextEntry = entries[i + 1];

            // Use helper that calculates minutes relative to the start of the displayDate
            const startMinutes = getMinutesFromMidnightOnDate(currentEntry.timestamp, displayDate);
            const endMinutes = nextEntry ? getMinutesFromMidnightOnDate(nextEntry.timestamp, displayDate) : HOURS_IN_DAY * 60; // Extend last segment to end of day

            // Clamp minutes to the 0 - 1440 range for the day
            const clampedStartMinutes = Math.max(0, Math.min(startMinutes, HOURS_IN_DAY * 60));
            const clampedEndMinutes = Math.max(0, Math.min(endMinutes, HOURS_IN_DAY * 60));


             // Ensure we only draw if there's duration within the day
            if (clampedEndMinutes <= clampedStartMinutes) {
                 console.log(`Skipping entry ${i} due to zero/negative duration on date: ${currentEntry.timestamp}`);
                continue;
            }


            const startX = GRID_START_X + clampedStartMinutes * PIXELS_PER_MINUTE;
            const endX = GRID_START_X + clampedEndMinutes * PIXELS_PER_MINUTE;
            const statusY = STATUS_Y_POS[currentEntry.status];

            if (statusY === undefined) {
                console.warn(`Unknown status in processed entry: ${currentEntry.status}`);
                continue;
            }

            // Draw the horizontal line
             if (endX > startX) { // Only draw if there is width
                ctx.beginPath();
                ctx.moveTo(startX, statusY);
                ctx.lineTo(endX, statusY);
                ctx.stroke();
                 console.log(`Drew H-Line: Status=${currentEntry.status}, Y=${statusY}, X1=${startX.toFixed(1)}, X2=${endX.toFixed(1)}`);
             } else {
                  console.log(`Skipped H-Line draw (endX <= startX): Status=${currentEntry.status}, X1=${startX.toFixed(1)}, X2=${endX.toFixed(1)}`);
             }


            // Draw the vertical line connecting to the next status
            if (nextEntry) {
                const nextStatusY = STATUS_Y_POS[nextEntry.status];
                 // Ensure next status is valid and the vertical line has height
                 if (nextStatusY !== undefined && nextStatusY !== statusY) {
                    ctx.beginPath();
                    ctx.moveTo(endX, statusY); // Start from the end of the horizontal line
                    ctx.lineTo(endX, nextStatusY); // Connect vertically to the next line's Y
                    ctx.stroke();
                     console.log(`Drew V-Line: Y1=${statusY}, Y2=${nextStatusY}, X=${endX.toFixed(1)}`);
                 } else if (nextStatusY === undefined) {
                      console.warn(`Unknown next status encountered: ${nextEntry.status}`);
                 }
            }
        }
    }, [getMinutesFromMidnightOnDate]); // Add dependency


    // --- Fetching Effect ---
    useEffect(() => {
        const fetchLogData = async () => {
            if (!tripId || !dateProp) {
                setError("Trip ID and Date are required.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const displayDate = startOfDay(parseISO(dateProp)); // Ensure we work with the start of the day
                const formattedDate = format(displayDate, 'yyyy-MM-dd');

                const endpoint = `/api/tracking/trip/${tripId}/logs/${formattedDate}/`;
                console.log(`Workspaceing log data from: ${endpoint}`);
                // Make sure fetchWithAuth returns the direct array if that's what the API sends
                const data = await fetchWithAuth(
                    endpoint,
                    getAccessToken,
                    refreshAccessToken,
                    logout
                );
                console.log("Fetched RAW log data:", data);

                 // **CRITICAL FIX:** Assume 'data' is the array directly based on user's console log
                 if (Array.isArray(data)) {
                    setOriginalLogData(data); // Store the raw data
                     // Process the raw data for the specific date
                     const { entries, remarks: extractedRemarks, totals: calculatedTotals, details: extractedDetails } = processApiDataForDate(data, displayDate);
                    setProcessedLogEntries(entries);
                    setRemarks(extractedRemarks);
                    setTotals(calculatedTotals);
                     setTripDetails(extractedDetails); // Set any common details found
                      console.log("Processed entries for drawing:", entries);
                      console.log("Extracted Remarks:", extractedRemarks);
                      console.log("Calculated Totals:", calculatedTotals);
                 } else {
                     // Handle unexpected response format
                      console.error("API did not return an array:", data);
                      setError("Unexpected data format received from API.");
                      setOriginalLogData(null);
                      setProcessedLogEntries([]);
                      setRemarks([]);
                      setTotals({});
                      setTripDetails({});
                 }

            } catch (err) {
                console.error("Failed to fetch or process log data:", err);
                setError(err.message || "Could not load log data.");
                setOriginalLogData(null);
                setProcessedLogEntries([]);
                setRemarks([]);
                setTotals({});
                setTripDetails({});
            } finally {
                setLoading(false);
            }
        };

        fetchLogData();
    }, [tripId, dateProp, getAccessToken, refreshAccessToken, logout, processApiDataForDate]); // Add processApiDataForDate


    // --- Drawing Effect ---
    useEffect(() => {
        const canvas = canvasRef.current;
        // Draw only if NOT loading, NO error, and processedLogEntries is available and canvas exists
        if (!loading && !error && processedLogEntries && canvas) {
            const displayDate = startOfDay(parseISO(dateProp)); // Get the date being displayed
            const ctx = canvas.getContext('2d');
            if (ctx) {
                console.log("Canvas context obtained. Drawing grid and status lines.");
                drawGrid(ctx);
                drawStatusLines(ctx, processedLogEntries, displayDate); // Pass processed entries and the date
            } else {
                 console.error("Failed to get canvas context.");
            }
        } else {
            console.log("Drawing prerequisites not met:", { loading, error, processedLogEntries, canvasExists: !!canvas });
        }
    // Ensure redraw happens if processed entries change or canvas becomes available, or date changes
    }, [loading, error, processedLogEntries, dateProp, drawGrid, drawStatusLines]);


    // --- Render Logic ---
    if (loading) {
         // ... loading indicator ...
          return (
             <Card>
                 <CardContent className="flex justify-center items-center h-64">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <span className="ml-2">Loading Log Data...</span>
                 </CardContent>
             </Card>
        );
    }

    if (error) {
         // ... error display ...
         return (
             <Card>
                 <CardHeader>
                     <CardTitle>Error Loading Log</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <Alert variant="destructive">
                         <AlertDescription>{error}</AlertDescription>
                     </Alert>
                 </CardContent>
             </Card>
        );
    }

     // Check if original data was fetched but resulted in empty processed logs for the date
     if (!originalLogData || processedLogEntries.length === 0) {
           return (
              <Card>
                  <CardHeader>
                       <CardTitle>Daily Log - {format(parseISO(dateProp), 'PPP')}</CardTitle>
                       {/* Add other details */}
                  </CardHeader>
                   <CardContent className="flex justify-center items-center h-64">
                       <p>No log entries recorded for this date.</p>
                   </CardContent>
               </Card>
           );
      }


    // --- Final Render ---
    return (
        <Card>
            <CardHeader>
                 <CardTitle>Daily Log - {format(parseISO(dateProp), 'PPP')}</CardTitle>
                 <div className="text-sm text-muted-foreground">
                      {/* Populate details if available */}
                      Trip ID: {tripId} | Driver: {tripDetails.driver_name || 'N/A'}
                  </div>
            </CardHeader>
            <CardContent>
                 {/* Canvas for the log grid */}
                 <div className="border rounded overflow-x-auto bg-white shadow-inner p-1">
                     <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT}></canvas>
                 </div>

                 {/* Remarks section */}
                 <div className="mt-4">
                     <h3 className="font-semibold mb-1 text-sm">Remarks:</h3>
                     <div className="border p-2 min-h-[80px] bg-gray-50 rounded text-xs space-y-1 max-h-32 overflow-y-auto">
                          {remarks.length > 0 ? (
                              remarks.map((remark, index) => (
                                  <p key={index}>
                                      <span className="font-medium">{format(parseISO(remark.timestamp), 'HH:mm')}:</span> {remark.location} {remark.comment ? `- ${remark.comment}` : ''}
                                  </p>
                              ))
                          ) : (
                              <p className="text-gray-400 italic">No remarks for this date.</p>
                          )}
                     </div>
                 </div>

                 {/* Totals section */}
                  <div className="mt-4">
                       <h3 className="font-semibold mb-1 text-sm">Totals for {format(parseISO(dateProp), 'MMM d')}:</h3>
                       <div className="border p-2 grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 rounded text-xs">
                           <div>Off Duty: <span className="font-medium">{totals.off_duty_total || '0h 0m'}</span></div>
                           <div>Sleeper Berth: <span className="font-medium">{totals.sleeper_berth_total || '0h 0m'}</span></div>
                           <div>Driving: <span className="font-medium">{totals.driving_total || '0h 0m'}</span></div>
                           <div>On Duty (ND): <span className="font-medium">{totals.on_duty_not_driving_total || '0h 0m'}</span></div>
                       </div>
                   </div>
            </CardContent>
        </Card>
    );
}