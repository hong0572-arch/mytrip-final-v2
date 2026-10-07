import { NextResponse } from 'next/server';
import { admin } from '../../../../lib/firebaseAdmin';
import { verifyUser } from '../../../../lib/verifyUser';

const db = admin.firestore();

// The Capacitor app calls this route cross-origin with an Authorization header,
// which triggers a CORS preflight.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await verifyUser(req, searchParams.get('userId'), corsHeaders);
    if (auth.response) return auth.response;

    const sessionsRef = db.collection('users').doc(auth.uid).collection('chat_sessions');
    const snapshot = await sessionsRef.orderBy('updatedAt', 'desc').get();

    const sessions = [];
    snapshot.forEach(doc => {
      sessions.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ sessions }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, sessionId, title, messages } = body;

    const auth = await verifyUser(req, userId, corsHeaders);
    if (auth.response) return auth.response;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400, headers: corsHeaders });
    }

    const sessionRef = db.collection('users').doc(auth.uid).collection('chat_sessions').doc(sessionId);
    
    await sessionRef.set({
      title: title || '새로운 대화',
      messages: messages || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ success: true, sessionId }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error saving chat session:', error);
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    const auth = await verifyUser(req, searchParams.get('userId'), corsHeaders);
    if (auth.response) return auth.response;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400, headers: corsHeaders });
    }

    await db.collection('users').doc(auth.uid).collection('chat_sessions').doc(sessionId).delete();

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500, headers: corsHeaders });
  }
}
