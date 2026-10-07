'use client';
import { useEffect, useState } from 'react';

// Google Maps JS(places 포함)를 한 번만 불러온다.
const SCRIPT_ID = 'tm-google-maps';
let loading = null;

function loadGoogleMaps() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) || document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    const done = () => (window.google?.maps ? resolve(window.google) : reject(new Error('Google Maps failed to load')));
    if (existing) {
      if (window.google?.maps) return done();
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = done;
    script.onerror = () => { loading = null; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(script);
  });
  return loading;
}

export default function useGoogleMaps() {
  const [state, setState] = useState({ ready: false, error: null });
  useEffect(() => {
    let alive = true;
    loadGoogleMaps()
      .then(() => alive && setState({ ready: true, error: null }))
      .catch((error) => alive && setState({ ready: false, error }));
    return () => { alive = false; };
  }, []);
  return state;
}
