import { NextResponse } from 'next/server';
import { admin } from '../../../lib/firebaseAdmin';

const db = admin.firestore();

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const diariesRef = db.collection('users').doc(userId).collection('diaries');
    const snapshot = await diariesRef.orderBy('createdAt', 'desc').get();

    const diaries = [];
    snapshot.forEach(doc => {
      diaries.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ diaries });
  } catch (error) {
    console.error('Error fetching diaries:', error);
    return NextResponse.json({ error: 'Failed to fetch diaries' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, title, content, location, date, imageBase64 } = body;

    if (!userId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const diaryRef = db.collection('users').doc(userId).collection('diaries').doc();
    
    await diaryRef.set({
      title,
      content,
      location: location || '',
      date: date || new Date().toISOString().split('T')[0],
      imageBase64: imageBase64 || null, // Warning: Storing base64 directly in firestore can exceed 1MB limit for large images. Using for prototype.
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, diaryId: diaryRef.id });
  } catch (error) {
    console.error('Error saving diary:', error);
    return NextResponse.json({ error: 'Failed to save diary' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const diaryId = searchParams.get('diaryId');

    if (!userId || !diaryId) {
      return NextResponse.json({ error: 'Missing userId or diaryId' }, { status: 400 });
    }

    await db.collection('users').doc(userId).collection('diaries').doc(diaryId).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting diary:', error);
    return NextResponse.json({ error: 'Failed to delete diary' }, { status: 500 });
  }
}
