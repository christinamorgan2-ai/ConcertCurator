export const generateConcertIcs = (concert, venue, lineup) => {
  const dateStr = concert.date.replace(/-/g, ''); // YYYYMMDD
  
  let dtStart, dtEnd;
  
  if (concert.start_time) {
    const timeParts = concert.start_time.split(':');
    const hh = timeParts[0].padStart(2, '0');
    const mm = timeParts[1].padStart(2, '0');
    const timeStr = `${hh}${mm}00`;
    dtStart = `DTSTART:${dateStr}T${timeStr}`;
    
    const endDate = new Date(`${concert.date}T${hh}:${mm}:00`);
    endDate.setHours(endDate.getHours() + 3);
    
    const endYYYY = endDate.getFullYear();
    const endMM = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDD = String(endDate.getDate()).padStart(2, '0');
    const endHH = String(endDate.getHours()).padStart(2, '0');
    const endMin = String(endDate.getMinutes()).padStart(2, '0');
    const endSec = '00';
    
    const endDateStr = `${endYYYY}${endMM}${endDD}`;
    const endTimeStr = `${endHH}${endMin}${endSec}`;
    dtEnd = `DTEND:${endDateStr}T${endTimeStr}`;
  } else {
    // All day event
    dtStart = `DTSTART;VALUE=DATE:${dateStr}`;
    
    // For all day events, DTEND is the next day (exclusive)
    const nextDay = new Date(`${concert.date}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const endYYYY = nextDay.getFullYear();
    const endMM = String(nextDay.getMonth() + 1).padStart(2, '0');
    const endDD = String(nextDay.getDate()).padStart(2, '0');
    dtEnd = `DTEND;VALUE=DATE:${endYYYY}${endMM}${endDD}`;
  }

  const summary = concert.name;
  let location = [];
  if (venue) {
    if (venue.name) location.push(venue.name);
    if (venue.city) location.push(venue.city);
    if (venue.region) location.push(venue.region);
    if (venue.country) location.push(venue.country);
  }
  const locationStr = location.join(', ');
  
  let description = [];
  if (lineup && lineup.length > 0) {
    description.push(`Lineup: ${lineup.join(', ')}`);
  }
  if (concert.notes) {
    description.push(`Notes: ${concert.notes}`);
  }
  const descriptionStr = description.join('\\n\\n').replace(/\n/g, '\\n');

  const now = new Date();
  const dtStamp = `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
  const uid = `UID:${concert.id}@concertcurator.com`;

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ConcertCurator//EN
BEGIN:VEVENT
${uid}
${dtStamp}
${dtStart}
${dtEnd}
SUMMARY:${summary}
LOCATION:${locationStr}
DESCRIPTION:${descriptionStr}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${concert.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_concert.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const getCalendarData = (concert, venue, lineup) => {
  const dateStr = concert.date.replace(/-/g, ''); // YYYYMMDD
  
  let googleDtStart, googleDtEnd;
  let outlookDtStart, outlookDtEnd;
  let isAllDay = false;

  if (concert.start_time) {
    const timeParts = concert.start_time.split(':');
    const hh = timeParts[0].padStart(2, '0');
    const mm = timeParts[1].padStart(2, '0');
    
    const timeStr = `${hh}${mm}00`;
    googleDtStart = `${dateStr}T${timeStr}`;
    
    const endDate = new Date(`${concert.date}T${hh}:${mm}:00`);
    endDate.setHours(endDate.getHours() + 3);
    const endYYYY = endDate.getFullYear();
    const endMM = String(endDate.getMonth() + 1).padStart(2, '0');
    const endDD = String(endDate.getDate()).padStart(2, '0');
    const endHH = String(endDate.getHours()).padStart(2, '0');
    const endMin = String(endDate.getMinutes()).padStart(2, '0');
    
    googleDtEnd = `${endYYYY}${endMM}${endDD}T${endHH}${endMin}00`;
    
    outlookDtStart = `${concert.date}T${concert.start_time}:00`;
    outlookDtEnd = `${endYYYY}-${endMM}-${endDD}T${endHH}:${endMin}:00`;
  } else {
    isAllDay = true;
    googleDtStart = dateStr;
    
    const nextDay = new Date(`${concert.date}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const endYYYY = nextDay.getFullYear();
    const endMM = String(nextDay.getMonth() + 1).padStart(2, '0');
    const endDD = String(nextDay.getDate()).padStart(2, '0');
    
    googleDtEnd = `${endYYYY}${endMM}${endDD}`;
    outlookDtStart = `${concert.date}T00:00:00`;
    outlookDtEnd = `${endYYYY}-${endMM}-${endDD}T00:00:00`;
  }

  const summary = concert.name;
  let location = [];
  if (venue) {
    if (venue.name) location.push(venue.name);
    if (venue.city) location.push(venue.city);
    if (venue.region) location.push(venue.region);
    if (venue.country) location.push(venue.country);
  }
  const locationStr = location.join(', ');
  
  let description = [];
  if (lineup && lineup.length > 0) {
    description.push(`Lineup: ${lineup.join(', ')}`);
  }
  if (concert.notes) {
    description.push(`Notes: ${concert.notes}`);
  }
  const descriptionStr = description.join('\n\n');

  return { summary, locationStr, descriptionStr, googleDtStart, googleDtEnd, outlookDtStart, outlookDtEnd, isAllDay };
};

export const generateGoogleCalendarUrl = (concert, venue, lineup) => {
  const data = getCalendarData(concert, venue, lineup);
  
  let urlStr = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.summary)}&dates=${data.googleDtStart}/${data.googleDtEnd}`;
  if (data.descriptionStr) urlStr += `&details=${encodeURIComponent(data.descriptionStr)}`;
  if (data.locationStr) urlStr += `&location=${encodeURIComponent(data.locationStr)}`;
  
  window.open(urlStr, '_blank');
};

export const generateOutlookCalendarUrl = (concert, venue, lineup) => {
  const data = getCalendarData(concert, venue, lineup);
  const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  url.searchParams.append('path', '/calendar/action/compose');
  url.searchParams.append('rru', 'addevent');
  url.searchParams.append('subject', data.summary);
  url.searchParams.append('startdt', data.outlookDtStart);
  url.searchParams.append('enddt', data.outlookDtEnd);
  if (data.isAllDay) url.searchParams.append('allday', 'true');
  if (data.descriptionStr) url.searchParams.append('body', data.descriptionStr);
  if (data.locationStr) url.searchParams.append('location', data.locationStr);
  
  window.open(url.toString(), '_blank');
};
