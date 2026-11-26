import { useEffect, useState } from 'react';

import { getAllConcerts } from '../lib/concerts';
import { categorizeGigs } from '../lib/concert-dates';
import SEO from '../components/SEO';
import Logo from '../components/Logo';
import Navigation from '../components/Navigation';

export const revalidate = 86400; // 24 hours

export async function generateMetadata() {
  return {
    title: 'Concerts & Performances | George Hadow',
    description: 'Upcoming and past live performances by George Hadow. Concert dates, venues, and booking information for avant-garde music shows.'
  };
}

export default function ConcertsPage({ upcoming: initialUpcoming, past: initialPast }) {
  const [{ upcoming, past }, setConcerts] = useState({
    upcoming: initialUpcoming,
    past: initialPast
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/gigs', { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Concert refresh failed');
        return response.json();
      })
      .then(gigs => setConcerts(categorizeGigs(gigs)))
      .catch(error => {
        if (error.name !== 'AbortError') console.error(error);
      });
    return () => controller.abort();
  }, []);
  return (
    <>
      <SEO
        title="Concerts & Performances | George Hadow"
        description="Upcoming and past live performances by George Hadow. Concert dates, venues, and booking information for avant-garde music shows."
      />
      <div style={{
        backgroundColor: 'var(--bg-color)',
        color: 'var(--text-color)',
        minHeight: '100vh'
      }}>
        <Logo />
        <Navigation />

        <div style={{
          padding: '2rem',
          fontFamily: 'sans-serif',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>

          {upcoming.length === 0 && past.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666666',
              fontSize: '1rem'
            }}>
              No concerts found.
            </div>
          )}

          {upcoming.length > 0 && (
            <div style={{ marginBottom: '3rem' }}>
              <h2 style={{
                color: 'var(--text-color)',
                marginBottom: '2rem',
                fontSize: '1.2rem',
                textAlign: 'center'
              }}>Upcoming</h2>

              <ul style={{ listStyle: 'none', padding: 0 }}>
                {upcoming.map((gig, idx) => (
                  <li key={gig.id || idx} className="upcoming-gig">
                    <div className="gig-details">
                      <span className="gig-band"><strong>{gig.band}</strong></span>
                      <span className="gig-date">{gig.date}</span>
                      <span className="gig-venue">{gig.venue}</span>
                      <span className="gig-city">{gig.city}</span>
                    </div>
                    {gig.link && (
                      <a href={gig.link} className="gig-link" target="_blank" rel="noopener noreferrer">
                        TICKETS
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 style={{
                color: 'var(--text-color)',
                marginBottom: '2rem',
                fontSize: '1.2rem',
                textAlign: 'center'
              }}>Past</h2>

              <ul style={{ listStyle: 'none', padding: 0 }}>
                {past.map((gig, idx) => (
                  <li key={gig.id || `past-${idx}`} style={{
                    padding: '0.25rem 0',
                    color: 'var(--secondary-text)',
                    fontSize: '0.95rem'
                  }}>
                    {gig.date} | {gig.band} @ {gig.venue}, {gig.city}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export async function getStaticProps() {
  try {
    const allConcerts = await getAllConcerts();
    const { upcoming, past } = categorizeGigs(allConcerts);

    return {
      props: {
        upcoming,
        past
      }
    };
  } catch (error) {
    console.error('Error fetching concerts:', error);
    return {
      props: {
        upcoming: [],
        past: []
      }
    };
  }
}
