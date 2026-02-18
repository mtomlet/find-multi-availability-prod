/**
 * Find Multi-Availability - PRODUCTION (Phoenix Encanto)
 *
 * Finds time slots where multiple stylists are available simultaneously
 * for group bookings (e.g., parent + child wanting haircuts at the same time)
 *
 * PRODUCTION CREDENTIALS - DO NOT USE FOR TESTING
 * Location: Keep It Cut - Phoenix Encanto (201664)
 *
 * Version: 1.0.0 - Initial release (2026-01-20)
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// PRODUCTION Meevo API Configuration
const CONFIG = {
  AUTH_URL: 'https://marketplace.meevo.com/oauth2/token',
  API_URL: 'https://na1pub.meevo.com/publicapi/v1',
  API_URL_V2: 'https://na1pub.meevo.com/publicapi/v2',
  CLIENT_ID: 'f6a5046d-208e-4829-9941-034ebdd2aa65',
  CLIENT_SECRET: '2f8feb2e-51f5-40a3-83af-3d4a6a454abe',
  TENANT_ID: '200507',
  LOCATION_ID: '201664'  // Phoenix Encanto
};

// ============================================
// DYNAMIC ACTIVE EMPLOYEE CACHE (1-hour TTL)
// ============================================
let cachedActiveEmployees = null;
let employeeCacheExpiry = null;
const EMPLOYEE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getActiveEmployees(authToken) {
  // Return cached if still valid
  if (cachedActiveEmployees && employeeCacheExpiry && Date.now() < employeeCacheExpiry) {
    console.log(`[Employees] Using cached list (${cachedActiveEmployees.length} active)`);
    return cachedActiveEmployees;
  }

  console.log('[Employees] Fetching active employees from Meevo...');
  try {
    const response = await axios.get(
      `${CONFIG.API_URL}/employees?tenantid=${CONFIG.TENANT_ID}&locationid=${CONFIG.LOCATION_ID}&ItemsPerPage=100`,
      { headers: { 'Authorization': `Bearer ${authToken}`, 'Accept': 'application/json' }, timeout: 5000 }
    );

    const employees = response.data?.data || [];

    // Filter: ObjectState 2026 = Active, exclude test accounts
    cachedActiveEmployees = employees
      .filter(emp => emp.objectState === 2026)
      .filter(emp => !['home', 'training', 'test'].includes((emp.firstName || '').toLowerCase()))
      .map(emp => ({
        id: emp.id,
        name: emp.nickName || emp.firstName,
        nickname: emp.nickName || emp.firstName
      }));

    employeeCacheExpiry = Date.now() + EMPLOYEE_CACHE_TTL;
    console.log(`[Employees] Cached ${cachedActiveEmployees.length} active employees`);
    return cachedActiveEmployees;
  } catch (err) {
    console.error('[Employees] Fetch failed:', err.message);
    // Return cached even if expired, or empty array
    return cachedActiveEmployees || [];
  }
}

// PRODUCTION Service IDs (Phoenix Encanto)
const SERVICE_MAP = {
  'haircut_standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'haircut standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'standard': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'haircut': 'f9160450-0b51-4ddc-bcc7-ac150103d5c0',
  'haircut_skin_fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'skin_fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'skin fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'fade': '14000cb7-a5bb-4a26-9f23-b0f3016cc009',
  'long_locks': '721e907d-fdae-41a5-bec4-ac150104229b',
  'long locks': '721e907d-fdae-41a5-bec4-ac150104229b',
  'wash': '67c644bc-237f-4794-8b48-ac150106d5ae',
  'shampoo': '67c644bc-237f-4794-8b48-ac150106d5ae',
  'grooming': '65ee2a0d-e995-4d8d-a286-ac150106994b',
  'beard': '65ee2a0d-e995-4d8d-a286-ac150106994b',
  'beard_trim': '65ee2a0d-e995-4d8d-a286-ac150106994b'
};

function resolveServiceId(input) {
  if (!input) return null;
  if (input.includes('-') && input.length > 30) return input;
  return SERVICE_MAP[input.toLowerCase().trim()] || null;
}

function getStylistById(id) {
  // Uses cached employees (must call getActiveEmployees first in route)
  return (cachedActiveEmployees || []).find(s => s.id === id);
}

// ============================================
// DATE FORMATTING HELPERS
// Pre-formatted strings so LLM doesn't do date math
// ============================================

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function formatDateParts(dateString) {
  const date = new Date(dateString + (dateString.includes('T') ? '' : 'T12:00:00'));
  const dayOfWeek = DAYS_OF_WEEK[date.getUTCDay()];
  const month = MONTHS[date.getUTCMonth()];
  const dayNum = date.getUTCDate();
  const dayWithSuffix = `${dayNum}${getOrdinalSuffix(dayNum)}`;
  return {
    day_of_week: dayOfWeek,
    formatted_date: `${month} ${dayWithSuffix}`,
    formatted_full_date: `${dayOfWeek}, ${month} ${dayWithSuffix}`
  };
}

function formatTime(timeString) {
  const timePart = timeString.split('T')[1];
  if (!timePart) return 'Time unavailable';
  const [hourStr, minStr] = timePart.split(':');
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

function formatSlotFull(timeString) {
  const dateParts = formatDateParts(timeString);
  const formattedTime = formatTime(timeString);
  return `${dateParts.formatted_full_date} at ${formattedTime}`;
}

let cachedToken = null;
let tokenExpiry = null;

async function getMeevoToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - (5 * 60 * 1000)) {
    return cachedToken;
  }

  console.log('PRODUCTION: Getting fresh token...');
  const response = await axios.post(CONFIG.AUTH_URL, {
    client_id: CONFIG.CLIENT_ID,
    client_secret: CONFIG.CLIENT_SECRET
  });

  cachedToken = response.data.access_token;
  tokenExpiry = Date.now() + (response.data.expires_in * 1000);
  return cachedToken;
}

// Meevo V2 API has 8-slot limit per request
// Use 2hr windows with 1hr overlap (15 windows) to capture ALL slots including edge cases
const TIME_WINDOWS = [
  { start: '06:00', end: '08:00' },
  { start: '07:00', end: '09:00' },
  { start: '08:00', end: '10:00' },
  { start: '09:00', end: '11:00' },
  { start: '10:00', end: '12:00' },
  { start: '11:00', end: '13:00' },
  { start: '12:00', end: '14:00' },
  { start: '13:00', end: '15:00' },
  { start: '14:00', end: '16:00' },
  { start: '15:00', end: '17:00' },
  { start: '16:00', end: '18:00' },
  { start: '17:00', end: '19:00' },
  { start: '18:00', end: '20:00' },
  { start: '19:00', end: '21:00' },
  { start: '20:00', end: '22:00' }
];

async function scanStylistAvailability(token, stylist, serviceId, startDate, endDate, locationId) {
  // Scan all time windows in parallel
  const windowScans = TIME_WINDOWS.map(async (window) => {
    const scanRequest = {
      LocationId: parseInt(locationId),
      TenantId: parseInt(CONFIG.TENANT_ID),
      ScanDateType: 1,
      StartDate: startDate,
      EndDate: endDate,
      ScanTimeType: 1,
      StartTime: window.start,
      EndTime: window.end,
      ScanServices: [{ ServiceId: serviceId, EmployeeIds: [stylist.id] }]
    };

    try {
      const response = await axios.post(
        `${CONFIG.API_URL_V2}/scan/openings?TenantId=${CONFIG.TENANT_ID}&LocationId=${locationId}`,
        scanRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rawData = response.data?.data || [];
      return rawData.flatMap(item =>
        (item.serviceOpenings || []).map(slot => {
          const dateParts = formatDateParts(slot.startTime);
          const formattedTime = formatTime(slot.startTime);
          return {
            startTime: slot.startTime,
            endTime: slot.endTime,
            date: slot.date,
            employee_id: stylist.id,
            employee_name: stylist.name,
            employee_nickname: stylist.nickname,
            serviceId: slot.serviceId,
            serviceName: slot.serviceName,
            price: slot.employeePrice,
            day_of_week: dateParts.day_of_week,
            formatted_date: dateParts.formatted_date,
            formatted_time: formattedTime,
            formatted_full: `${dateParts.formatted_full_date} at ${formattedTime}`
          };
        })
      );
    } catch (error) {
      console.error(`PRODUCTION: Error scanning ${stylist.name} (${window.start}-${window.end}):`, error.message);
      return [];
    }
  });

  const windowResults = await Promise.all(windowScans);

  // Combine and deduplicate by startTime
  const seenTimes = new Set();
  return windowResults.flat().filter(slot => {
    if (seenTimes.has(slot.startTime)) return false;
    seenTimes.add(slot.startTime);
    return true;
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
}

/**
 * POST /find-multi-availability
 *
 * Body:
 * {
 *   "services": ["haircut_standard", "haircut_skin_fade"],  // One service per guest (or just one for single person)
 *   "date_start": "2026-01-20",
 *   "date_end": "2026-01-22",
 *   "time_preference": "morning" | "afternoon" | "any",  // Optional
 *   "preferred_stylist": "stylist-id"  // Optional - if one guest has a preference
 * }
 *
 * Returns concurrent slots where N different stylists are available at the same time
 * Also works for single guest (1 service)
 */
app.post('/find-multi-availability', async (req, res) => {
  const {
    services,
    date_start,
    date_end,
    specific_date,
    time_preference,
    preferred_stylist,
    location_id
  } = req.body;

  const locationId = location_id || CONFIG.LOCATION_ID;

  if (!services || !Array.isArray(services) || services.length < 1) {
    return res.json({
      success: false,
      error: 'services array required with at least 1 service'
    });
  }

  const guestCount = services.length;
  const serviceIds = services.map(s => resolveServiceId(s));

  if (serviceIds.some(id => !id)) {
    return res.json({
      success: false,
      error: 'Invalid service name(s) provided'
    });
  }

  let startDate, endDate;
  if (specific_date) {
    startDate = specific_date;
    endDate = specific_date;
  } else if (date_start && date_end) {
    startDate = date_start;
    endDate = date_end;
  } else {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);
    startDate = today.toISOString().split('T')[0];
    endDate = threeDaysLater.toISOString().split('T')[0];
  }

  try {
    const token = await getMeevoToken();

    // Get active employees dynamically (cached for 1 hour)
    const activeStylists = await getActiveEmployees(token);

    console.log(`PRODUCTION: Finding concurrent availability for ${guestCount} guests`);
    console.log(`Services: ${serviceIds.join(', ')}`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log(`Active stylists: ${activeStylists.length}`);

    // Scan all stylists for all requested services
    const allOpenings = {};  // Key: startTime, Value: array of {stylist, service, slot}

    for (const serviceId of serviceIds) {
      const scanPromises = activeStylists.map(stylist =>
        scanStylistAvailability(token, stylist, serviceId, startDate, endDate, locationId)
      );
      const results = await Promise.all(scanPromises);
      const openings = results.flat();

      for (const slot of openings) {
        const timeKey = slot.startTime;
        if (!allOpenings[timeKey]) {
          allOpenings[timeKey] = [];
        }
        allOpenings[timeKey].push({
          stylist_id: slot.employee_id,
          stylist_name: slot.employee_name,
          stylist_nickname: slot.employee_nickname,
          service_id: slot.serviceId,
          service_name: slot.serviceName,
          end_time: slot.endTime,
          price: slot.price
        });
      }
    }

    // Find time slots with enough DIFFERENT stylists available
    const concurrentSlots = [];

    for (const [startTime, slots] of Object.entries(allOpenings)) {
      // Group slots by stylist to see who's available
      const stylistsAtTime = {};
      for (const slot of slots) {
        if (!stylistsAtTime[slot.stylist_id]) {
          stylistsAtTime[slot.stylist_id] = [];
        }
        stylistsAtTime[slot.stylist_id].push(slot);
      }

      const availableStylistIds = Object.keys(stylistsAtTime);

      // We need at least N different stylists for N guests
      if (availableStylistIds.length >= guestCount) {
        // Check if we can assign each service to a different stylist
        const assignments = [];
        const usedStylists = new Set();

        // If there's a preferred stylist, try to assign them first
        if (preferred_stylist && availableStylistIds.includes(preferred_stylist)) {
          const preferredSlots = stylistsAtTime[preferred_stylist];
          if (preferredSlots.length > 0) {
            assignments.push({
              guest_number: 1,
              stylist_id: preferred_stylist,
              stylist_name: preferredSlots[0].stylist_name,
              stylist_nickname: preferredSlots[0].stylist_nickname,
              service_id: preferredSlots[0].service_id,
              service_name: preferredSlots[0].service_name,
              end_time: preferredSlots[0].end_time,
              price: preferredSlots[0].price
            });
            usedStylists.add(preferred_stylist);
          }
        }

        // Assign remaining services to different stylists
        for (let i = assignments.length; i < guestCount && i < serviceIds.length; i++) {
          const targetServiceId = serviceIds[i];

          // Find a stylist who can do this service and isn't already assigned
          for (const stylistId of availableStylistIds) {
            if (usedStylists.has(stylistId)) continue;

            const stylistSlots = stylistsAtTime[stylistId];
            const matchingSlot = stylistSlots.find(s => s.service_id === targetServiceId);

            if (matchingSlot) {
              assignments.push({
                guest_number: i + 1,
                stylist_id: stylistId,
                stylist_name: matchingSlot.stylist_name,
                stylist_nickname: matchingSlot.stylist_nickname,
                service_id: matchingSlot.service_id,
                service_name: matchingSlot.service_name,
                end_time: matchingSlot.end_time,
                price: matchingSlot.price
              });
              usedStylists.add(stylistId);
              break;
            }
          }
        }

        // Only add if we found enough assignments
        if (assignments.length >= guestCount) {
          // Apply time preference filter
          const hour = parseInt(startTime.split('T')[1].split(':')[0]);
          if (time_preference === 'morning' && hour >= 12) continue;
          if (time_preference === 'afternoon' && hour < 12) continue;

          const slotDateParts = formatDateParts(startTime);
          const slotFormattedTime = formatTime(startTime);
          concurrentSlots.push({
            start_time: startTime,
            day_of_week: slotDateParts.day_of_week,
            formatted_date: slotDateParts.formatted_date,
            formatted_time: slotFormattedTime,
            formatted_full: `${slotDateParts.formatted_full_date} at ${slotFormattedTime}`,
            assignments: assignments,
            total_price: assignments.reduce((sum, a) => sum + (a.price || 0), 0)
          });
        }
      }
    }

    // Sort by start time
    concurrentSlots.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

    if (concurrentSlots.length === 0) {
      return res.json({
        success: true,
        found: false,
        message: `No concurrent availability found for ${guestCount} guests in the date range`,
        guest_count: guestCount,
        date_range: { start: startDate, end: endDate }
      });
    }

    const earliest = concurrentSlots[0];

    console.log(`PRODUCTION: Found ${concurrentSlots.length} concurrent slots for ${guestCount} guests`);
    console.log(`Earliest: ${earliest.start_time}`);

    return res.json({
      success: true,
      found: true,
      guest_count: guestCount,
      earliest_slot: earliest,
      total_concurrent_slots: concurrentSlots.length,
      all_slots: concurrentSlots.slice(0, 10),  // Return top 10 options
      date_range: { start: startDate, end: endDate },
      message: `Found ${concurrentSlots.length} time slots where ${guestCount} guests can get haircuts at the same time. Earliest: ${earliest.formatted_full}`
    });

  } catch (error) {
    console.error('PRODUCTION Error:', error);
    return res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /find-group-availability
 *
 * For group bookings with DIFFERENT services - returns availability per service
 * so the agent can find compatible back-to-back times.
 * Also works for single guest (1 service).
 *
 * Body:
 * {
 *   "services": ["skin_fade", "long_locks"],  // One service per guest (or just one for single person)
 *   "specific_date": "2026-01-21",            // Or use date_start/date_end
 *   "time_preference": "morning" | "afternoon" | "any"
 * }
 *
 * Returns availability for EACH service separately, plus suggested back-to-back pairs
 */
app.post('/find-group-availability', async (req, res) => {
  const {
    services,
    date_start,
    date_end,
    specific_date,
    time_preference,
    location_id
  } = req.body;

  const locationId = location_id || CONFIG.LOCATION_ID;

  if (!services || !Array.isArray(services) || services.length < 1) {
    return res.json({
      success: false,
      error: 'services array required with at least 1 service'
    });
  }

  const serviceIds = services.map(s => resolveServiceId(s));
  const serviceNames = services.map(s => s.toLowerCase().replace(/_/g, ' '));

  if (serviceIds.some(id => !id)) {
    return res.json({
      success: false,
      error: 'Invalid service name(s) provided'
    });
  }

  let startDate, endDate;
  if (specific_date) {
    startDate = specific_date;
    endDate = specific_date;
  } else if (date_start && date_end) {
    startDate = date_start;
    endDate = date_end;
  } else {
    const today = new Date();
    const threeDaysLater = new Date();
    threeDaysLater.setDate(today.getDate() + 3);
    startDate = today.toISOString().split('T')[0];
    endDate = threeDaysLater.toISOString().split('T')[0];
  }

  try {
    const token = await getMeevoToken();

    // Get active employees dynamically (cached for 1 hour)
    const activeStylists = await getActiveEmployees(token);

    console.log(`PRODUCTION: Finding group availability for ${services.length} different services`);
    console.log(`Services: ${services.join(', ')}`);
    console.log(`Date range: ${startDate} to ${endDate}`);
    console.log(`Active stylists: ${activeStylists.length}`);

    // Search availability for EACH service separately
    const availabilityByService = {};

    for (let i = 0; i < serviceIds.length; i++) {
      const serviceId = serviceIds[i];
      const serviceName = serviceNames[i];

      const scanPromises = activeStylists.map(stylist =>
        scanStylistAvailability(token, stylist, serviceId, startDate, endDate, locationId)
      );
      const results = await Promise.all(scanPromises);
      let openings = results.flat();

      // Apply time preference filter
      if (time_preference === 'morning') {
        openings = openings.filter(o => {
          const hour = parseInt(o.startTime.split('T')[1].split(':')[0]);
          return hour < 12;
        });
      } else if (time_preference === 'afternoon') {
        openings = openings.filter(o => {
          const hour = parseInt(o.startTime.split('T')[1].split(':')[0]);
          return hour >= 12;
        });
      }

      // Sort by time
      openings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

      availabilityByService[serviceName] = openings.slice(0, 100).map(o => ({
        time: o.startTime,
        end_time: o.endTime,
        stylist_id: o.employee_id,
        stylist_name: o.employee_nickname || o.employee_name,
        price: o.price,
        day_of_week: o.day_of_week,
        formatted_date: o.formatted_date,
        formatted_time: o.formatted_time,
        formatted_full: o.formatted_full
      }));
    }

    // Find back-to-back pairs where service A ends and service B can start
    const backToBackOptions = [];
    const service1Slots = availabilityByService[serviceNames[0]] || [];
    const service2Slots = availabilityByService[serviceNames[1]] || [];

    for (const slot1 of service1Slots.slice(0, 10)) {
      // Find service 2 slots that start at or after slot1 ends
      const slot1End = new Date(slot1.end_time);

      for (const slot2 of service2Slots) {
        const slot2Start = new Date(slot2.time);
        const timeDiff = (slot2Start - slot1End) / (1000 * 60); // minutes difference

        // Back-to-back: slot2 starts within 30 mins of slot1 ending
        if (timeDiff >= 0 && timeDiff <= 30) {
          backToBackOptions.push({
            guest1: {
              service: serviceNames[0],
              time: slot1.time,
              end_time: slot1.end_time,
              stylist_id: slot1.stylist_id,
              stylist_name: slot1.stylist_name
            },
            guest2: {
              service: serviceNames[1],
              time: slot2.time,
              end_time: slot2.end_time,
              stylist_id: slot2.stylist_id,
              stylist_name: slot2.stylist_name
            },
            gap_minutes: Math.round(timeDiff)
          });
        }
      }
    }

    // Sort back-to-back options by first slot time
    backToBackOptions.sort((a, b) => new Date(a.guest1.time) - new Date(b.guest1.time));

    // Check for same-time options (different stylists, same start time)
    const sameTimeOptions = [];
    for (const slot1 of service1Slots.slice(0, 10)) {
      for (const slot2 of service2Slots) {
        if (slot1.time === slot2.time && slot1.stylist_id !== slot2.stylist_id) {
          sameTimeOptions.push({
            time: slot1.time,
            guest1: {
              service: serviceNames[0],
              stylist_id: slot1.stylist_id,
              stylist_name: slot1.stylist_name
            },
            guest2: {
              service: serviceNames[1],
              stylist_id: slot2.stylist_id,
              stylist_name: slot2.stylist_name
            }
          });
        }
      }
    }

    const hasSameTime = sameTimeOptions.length > 0;
    const hasBackToBack = backToBackOptions.length > 0;

    console.log(`PRODUCTION: Found ${sameTimeOptions.length} same-time options, ${backToBackOptions.length} back-to-back options`);

    return res.json({
      success: true,
      services_searched: serviceNames,
      date_range: { start: startDate, end: endDate },

      // Same-time options (if any)
      same_time_available: hasSameTime,
      same_time_options: sameTimeOptions.slice(0, 5),

      // Back-to-back options
      back_to_back_available: hasBackToBack,
      back_to_back_options: backToBackOptions.slice(0, 5),

      // Raw availability per service (for agent reference)
      availability_by_service: availabilityByService,

      message: hasSameTime
        ? `Found ${sameTimeOptions.length} same-time slots and ${backToBackOptions.length} back-to-back options`
        : hasBackToBack
          ? `No same-time slots available. Found ${backToBackOptions.length} back-to-back options`
          : 'No compatible slots found for these services'
    });

  } catch (error) {
    console.error('PRODUCTION Error:', error);
    return res.json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'PRODUCTION',
    location: 'Phoenix Encanto',
    service: 'Find Multi-Availability',
    version: '2.1.0',
    features: [
      'DYNAMIC active employee fetching (1-hour cache)',
      'concurrent multi-stylist availability',
      'multi-service group availability',
      'back-to-back slot finder',
      'time preference filter',
      'formatted date fields (day_of_week, formatted_date, formatted_time, formatted_full)',
      'full slot retrieval (6 parallel 3-hour scans to bypass 8-slot API limit)'
    ],
    stylists: 'dynamic (fetched from Meevo API)'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PRODUCTION Find Multi-Availability listening on port ${PORT}`);
  console.log('Active stylists fetched dynamically from Meevo API (1-hour cache)');
});
