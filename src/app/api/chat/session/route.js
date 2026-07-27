import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const sessionsRef = db.collection('users').doc(userId).collection('chat_sessions');
    const snapshot = await sessionsRef.orderBy('updatedAt', 'desc').get();

    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, sessionId, title, messages } = body;

    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'Missing userId or sessionId' }, { status: 400 });
    }

    const sessionRef = db.collection('users').doc(userId).collection('chat_sessions').doc(sessionId);
    
    await sessionRef.set({
      title: title || '새로운 대화',
      messages: messages || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true, sessionId });
  } catch (error) {
    console.error('Error saving chat session:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'Missing userId or sessionId' }, { status: 400 });
    }

    await db.collection('users').doc(userId).collection('chat_sessions').doc(sessionId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
