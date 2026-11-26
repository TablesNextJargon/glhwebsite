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

  pastGigs.sort((a, b) => {
    try {
      const [dayA, monthA, yearA] = a.date.split('.');
      const [dayB, monthB, yearB] = b.date.split('.');
      const dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, parseInt(dayA));
      const dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, parseInt(dayB));
      return dateB - dateA;
    } catch {
      return 0;
    }
  });

  return {
    upcoming: upcomingGigs,
    past: pastGigs
  };
}
