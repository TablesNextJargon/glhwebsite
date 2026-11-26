import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

import Logo from '../components/Logo';
import Navigation from '../components/Navigation';
import SEO from '../components/SEO';

import type { FormEvent } from 'react';

interface TurnstileAPI {
  render(container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: string;
    callback(token: string): void;
    'expired-callback'(): void;
    'error-callback'(): void;
  }): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window { turnstile?: TurnstileAPI }
}

const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function Contact() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const submitting = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [verificationError, setVerificationError] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('sent') === '1') {
      setStatus({ success: true, message: 'Thank you! Your message has been sent.' });
      window.history.replaceState(null, '', '/contact');
    }
  }, []);

  useEffect(() => {
    if (!scriptReady || !sitekey || !container.current || !window.turnstile) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey,
      action: 'contact',
      theme: 'auto',
      callback: value => { setToken(value); setVerificationError(false); },
      'expired-callback': () => setToken(''),
      'error-callback': () => { setToken(''); setVerificationError(true); },
    });
    return () => {
      if (widget.current !== null) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [scriptReady]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !token) return;
    const form = event.currentTarget;
    submitting.current = true;
    setIsSubmitting(true);
    setStatus(null);
    try {
      const body = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === 'string') body.append(key, value);
      });
      // Turnstile also supplies this named input for the native HTML submission path.
      body.set('cf-turnstile-response', token);
      const response = await fetch(form.action, {
        method: 'POST', headers: { Accept: 'application/json' }, body,
        signal: AbortSignal.timeout(30000),
      });
      const data = await response.json();
      if (response.ok && data.success === true) {
        form.reset();
        setStatus({ success: true, message: 'Thank you! Your message has been sent.' });
      } else {
        setStatus({ success: false, message: typeof data.error === 'string'
          ? data.error : 'Your message could not be sent. Please try again.' });
      }
    } catch {
      setStatus({ success: false, message:
        'We could not confirm delivery. Please check your connection before trying again.' });
    } finally {
      // Every submission attempt needs a fresh token, including email-delivery failures.
      setToken('');
      if (widget.current !== null) window.turnstile?.reset(widget.current);
      submitting.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SEO title="Contact | George Hadow"
        description="Contact George Hadow for bookings, collaborations, press, and other enquiries." />
      {sitekey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setScriptReady(true)} onError={() => setVerificationError(true)} />}
      <div className="contact-page">
        <Logo />
        <Navigation />
        <main className="contact-content">
          <h1>Get in touch</h1>
          <p className="form-help" id="contact-help">All fields are required.</p>
          <form action="/api/contact" method="post" onSubmit={handleSubmit}
            aria-describedby="contact-help" aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting}>
              <legend className="sr-only">Your enquiry</legend>
              <div className="contact-row">
                <label htmlFor="contact-name">Name
                  <input id="contact-name" name="name" autoComplete="name" required maxLength={100} />
                </label>
                <label htmlFor="contact-email">Email
                  <input id="contact-email" name="email" type="email" autoComplete="email"
                    required maxLength={254} />
                </label>
              </div>
              <label htmlFor="contact-enquiry">Enquiry type
                <select id="contact-enquiry" name="enquiry" defaultValue="" required>
                  <option value="" disabled>Select an enquiry type</option>
                  <option>Booking</option><option>Collaboration</option>
                  <option>Press</option><option>Other</option>
                </select>
              </label>
              <label htmlFor="contact-subject">Subject
                <input id="contact-subject" name="subject" required maxLength={200} />
              </label>
              <label htmlFor="contact-message">Message
                <textarea id="contact-message" name="message" required maxLength={2000}
                  rows={7} aria-describedby="message-help" />
              </label>
              <small id="message-help">Maximum 2,000 characters.</small>
              <div className="contact-honeypot" aria-hidden="true">
                <label htmlFor="contact-website">Leave this field empty
                  <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </fieldset>
            <div ref={container} />
            {!sitekey && <p role="status">The contact form is temporarily unavailable. Please try again later.</p>}
            {sitekey && !scriptReady && !verificationError && <p role="status">Loading security check…</p>}
            {verificationError && <p role="alert">The security check could not load.
              {' '}<button type="button" onClick={() => window.location.reload()}>Reload the form</button> to try again.</p>}
            <noscript><p>Please enable JavaScript to complete the security check and send your message.</p></noscript>
            <button type="submit" disabled={isSubmitting || !token || !sitekey}>
              {isSubmitting ? 'Sending…' : 'Send message'}
            </button>
            {status && <p className={status.success ? 'contact-status success' : 'contact-status error'}
              role={status.success ? 'status' : 'alert'}>{status.message}</p>}
          </form>
        </main>
      </div>
      <style jsx>{`
        .contact-page { min-height: 100vh; background: var(--bg-color); color: var(--text-color); }
        .contact-content { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: sans-serif; }
        h1 { color: var(--heading-color); font-size: 1.8rem; }
        p { line-height: 1.6; }
        .form-help, small { color: var(--secondary-text); }
        form { display: grid; gap: 1.25rem; margin-top: 2rem; }
        fieldset { border: 0; padding: 0; margin: 0; min-width: 0; display: grid; gap: 1.25rem; }
        .contact-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
        label { display: grid; gap: .5rem; color: var(--heading-color); font-weight: 600; }
        input, select, textarea { box-sizing: border-box; width: 100%; min-width: 0; padding: .75rem;
          border: 1px solid var(--border-color); border-radius: 4px; font: inherit;
          background: var(--bg-color); color: var(--text-color); }
        textarea { resize: vertical; }
        input:focus-visible, select:focus-visible, textarea:focus-visible, button:focus-visible {
          outline: 2px solid var(--text-color); outline-offset: 3px; }
        button { justify-self: start; padding: .75rem 1.5rem; border: 1px solid var(--button-bg);
          border-radius: 4px; background: var(--button-bg); color: var(--button-text);
          font: inherit; font-weight: 600; cursor: pointer; }
        button:disabled { opacity: .6; cursor: not-allowed; }
        .contact-status { padding: 1rem; border: 1px solid currentColor; border-radius: 4px; margin: 0; }
        .success { color: var(--text-color); }
        .error { color: var(--text-color); }
        .sr-only, .contact-honeypot { position: absolute; width: 1px; height: 1px;
          padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
        @media (max-width: 540px) {
          .contact-row { grid-template-columns: 1fr; }
          .contact-content { padding: 1.25rem; }
        }
      `}</style>
    </>
  );
}
