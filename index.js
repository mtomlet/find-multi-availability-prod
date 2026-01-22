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

// PRODUCTION All stylists at Phoenix Encanto (37 stylists - updated Jan 2026)
const ALL_STYLISTS = [
  // Original 18 stylists
  { id: '159793cd-bf26-4574-afcd-ac08017f2cf8', name: 'Josh', nickname: 'Josh' },
  { id: '2383ab00-8d63-4dac-9945-ac29014110eb', name: 'Jacob', nickname: 'Jacob' },
  { id: '2044a8ce-be0d-4244-8c01-ac47010a2b18', name: 'Francis', nickname: 'Francis' },
  { id: '45362667-7c72-4c54-9b56-ac5b00f44d1b', name: 'Tiffany', nickname: 'Tiffany' },
  { id: '1b0119a5-abe8-444b-b56f-ac5b011095dc', name: 'Ashley', nickname: 'Ashley' },
  { id: '71fa4533-7c1b-4195-89ed-ac5b0142182d', name: 'Libby', nickname: 'Libby' },
  { id: 'fe734b90-c392-48b5-ba4d-ac5b015d71ab', name: 'Lily', nickname: 'Lily' },
  { id: '4f185d55-4c46-4fea-bb3c-ac5b0171e6ce', name: 'Frank', nickname: 'Frank' },
  { id: '665c58c6-d8f3-4c0c-bfaf-ac5d0004b488', name: 'Britt', nickname: 'Britt' },
  { id: 'ee0adc0b-79de-4de9-8fd3-ac5d013c23eb', name: 'Angie', nickname: 'Angie' },
  { id: '8e916437-8d28-432b-b177-ac5e00dff9b9', name: 'Keren', nickname: 'Keren' },
  { id: '9b36f80e-0857-4fc6-ad42-ac5e00e6e8d7', name: 'Mari', nickname: 'Mari' },
  { id: 'f8567bde-87b8-4c3a-831e-ac61015f751b', name: 'Saskie', nickname: 'Saskie' },
  { id: 'a7ef7d83-28d7-4bf5-a934-ac6f011cd3c4', name: 'Melanie', nickname: 'Melanie' },
  { id: 'cbdbf3d3-0531-464f-996b-ac870143b967', name: 'Sarah', nickname: 'Sarah' },
  { id: '5dc967f1-8606-4696-9871-ad4f0110cb33', name: 'Kristina', nickname: 'Kristina' },
  { id: '452b3db2-0e3d-42bb-824f-ad5700082962', name: 'Kristen', nickname: 'Kristen' },
  { id: '1875e266-ba30-48a5-ab3b-ad670141b4d0', name: 'Danielle', nickname: 'Danielle' },
  // 19 NEW stylists added Jan 2026
  { id: '8b243661-a884-4b9d-8223-ad95012b64dd', name: 'Ellie', nickname: 'Ellie' },
  { id: '0ab425dd-7614-4b3e-90bf-adcd00f6e969', name: 'Bella', nickname: 'Bella' },
  { id: '9c873dfb-b582-4132-a5fe-ae54006282f3', name: 'Holly', nickname: 'Holly' },
  { id: '04fa6efa-0a7a-4875-abb3-ae6e010d925c', name: 'Jackie', nickname: 'Jackie' },
  { id: 'f800b8c0-5ecc-48c3-81a6-aeec010f012a', name: 'Mano', nickname: 'Mano' },
  { id: '01705d4b-597c-48b2-9391-af7e012ff596', name: 'Jackiev', nickname: 'Jackiev' },
  { id: 'f1c51a77-6b6f-4ca1-8780-afd9011cf4e9', name: 'Bianca', nickname: 'Bianca' },
  { id: '389c987f-c7b6-43ac-9cb1-afe3013911ef', name: 'Maricruz', nickname: 'Maricruz' },
  { id: 'a566f6d7-62fa-417b-9032-afe70120760e', name: 'Dawnele', nickname: 'Dawnele' },
  { id: 'e3fe57d4-5745-4f9c-bc93-afe8013d1e40', name: 'Harmony', nickname: 'Harmony' },
  { id: '2a543a56-c40f-492c-a2b8-b07b01099ed2', name: 'MJ', nickname: 'MJ' },
  { id: '49185114-423f-4c8a-a52e-b0c00129a9e8', name: 'Hannah', nickname: 'Hannah' },
  { id: 'a1773d20-8d64-43e1-8cb5-b1560127614b', name: 'Jocelyn', nickname: 'Jocelyn' },
  { id: '56f120d3-a76f-43bc-902e-b19f004114a6', name: 'Ulises', nickname: 'Ulises' },
  { id: '466345e1-6b4c-4028-98e3-b1c6011a6d36', name: 'Anahi', nickname: 'Anahi' },
  { id: '60aadea7-4962-47ef-97f9-b237011c85e1', name: 'Juan', nickname: 'Juan' },
  { id: '3971a6d5-5746-4f30-bdc4-b265013f8707', name: 'Lauren', nickname: 'Lauren' },
  { id: '6c52327c-3aa4-427e-b83a-b26c01410025', name: 'Eunice', nickname: 'Eunice' },
  { id: '097168c0-322c-40b2-a1d7-b28b011bae31', name: 'Nadia', nickname: 'Nadia' }
];

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
  return ALL_STYLISTS.find(s => s.id === id);
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

async function scanStylistAvailability(token, stylist, serviceId, startDate, endDate, locationId) {
  const scanRequest = {
    LocationId: parseInt(locationId),
    TenantId: parseInt(CONFIG.TENANT_ID),
    ScanDateType: 1,
    StartDate: startDate,
    EndDate: endDate,
    ScanTimeType: 1,
    StartTime: '00:00',
    EndTime: '23:59',
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
    console.error(`PRODUCTION: Error scanning ${stylist.name}:`, error.message);
    return [];
  }
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

  console.log(`PRODUCTION: Finding concurrent availability for ${guestCount} guests`);
  console.log(`Services: ${serviceIds.join(', ')}`);
  console.log(`Date range: ${startDate} to ${endDate}`);

  try {
    const token = await getMeevoToken();

    // Scan all stylists for all requested services
    const allOpenings = {};  // Key: startTime, Value: array of {stylist, service, slot}

    for (const serviceId of serviceIds) {
      const scanPromises = ALL_STYLISTS.map(stylist =>
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

  console.log(`PRODUCTION: Finding group availability for ${services.length} different services`);
  console.log(`Services: ${services.join(', ')}`);
  console.log(`Date range: ${startDate} to ${endDate}`);

  try {
    const token = await getMeevoToken();

    // Search availability for EACH service separately
    const availabilityByService = {};

    for (let i = 0; i < serviceIds.length; i++) {
      const serviceId = serviceIds[i];
      const serviceName = serviceNames[i];

      const scanPromises = ALL_STYLISTS.map(stylist =>
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

      availabilityByService[serviceName] = openings.slice(0, 20).map(o => ({
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
    version: '1.3.0',
    features: [
      'concurrent multi-stylist availability',
      'multi-service group availability',
      'back-to-back slot finder',
      'time preference filter',
      'formatted date fields (day_of_week, formatted_date, formatted_time, formatted_full)'
    ],
    stylists_count: ALL_STYLISTS.length
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PRODUCTION Find Multi-Availability listening on port ${PORT}`);
  console.log(`Supports finding concurrent slots for multiple guests at Phoenix Encanto`);
});
