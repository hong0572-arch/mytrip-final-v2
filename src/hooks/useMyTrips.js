'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// 로그인 사용자와 그 사용자가 속한 여행 목록(실시간). 예전 홈과 같은 쿼리를 쓴다.
export default function useMyTrips() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    let unsubscribeTrips = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
      setAuthReady(true);
      if (unsubscribeTrips) {
        unsubscribeTrips();
        unsubscribeTrips = null;
      }
      if (!currentUser) {
        setTrips([]);
        return;
      }
      const tripsQuery = query(
        collection(db, 'trips'),
        where('memberIds', 'array-contains', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      unsubscribeTrips = onSnapshot(
        tripsQuery,
        (snapshot) => setTrips(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
        (error) => console.error('Failed to load trips:', error)
      );
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, []);

  return { user, authReady, trips };
}
