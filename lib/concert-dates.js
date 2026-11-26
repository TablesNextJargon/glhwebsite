function dateValue(gig) {
  try {
    const [day, month, year] = gig.date.split('.');
    const time = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
    return Number.isNaN(time) ? 0 : time;
  } catch {
    return 0;
  }
}

function gigKey(gig) {
  return [gig.date, gig.venue, gig.city, gig.band]
    .map(value => String(value ?? '').trim().toLowerCase())
    .join('|');
}

export function mergeGigs(primary, secondary) {
  const seen = new Set();
  const merged = [];

  for (const gig of [...primary, ...secondary]) {
    const key = gigKey(gig);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(gig);
  }

  return merged;
}

export function categorizeGigs(gigs) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingGigs = [];
  const pastGigs = [];

  gigs.forEach(gig => {
    try {
      const [day, month, year] = gig.date.split('.');
      const concertDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (concertDate >= today) {
        upcomingGigs.push(gig);
      } else {
        pastGigs.push(gig);
      }
    } catch {
      upcomingGigs.push(gig);
    }
  });

  upcomingGigs.sort((a, b) => dateValue(a) - dateValue(b));
  pastGigs.sort((a, b) => dateValue(b) - dateValue(a));

  return {
    upcoming: upcomingGigs,
    past: pastGigs
  };
}
