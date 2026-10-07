import { NextResponse } from 'next/server';
import { admin } from '../../../lib/firebaseAdmin';
import { verifyUser } from '../../../lib/verifyUser';

const db = admin.firestore();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: Retrieve user's AI memories
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await verifyUser(req, searchParams.get('userId'), corsHeaders);
    if (auth.response) return auth.response;

    const memoriesRef = db.collection('users').doc(auth.uid).collection('ai_memory');
    const snapshot = await memoriesRef.orderBy('updatedAt', 'desc').limit(20).get();
    
    const memories = [];
    snapshot.forEach(doc => {
      memories.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({ memories }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Memory GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories.', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Save a new memory or update existing
export async function POST(req) {
  try {
    const body = await req.json();
    const { userId, category, content, confidence = 0.8 } = body;

    const auth = await verifyUser(req, userId, corsHeaders);
    if (auth.response) return auth.response;
    
    if (!category || !content) {
      return NextResponse.json(
        { error: 'category and content are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const memoriesRef = db.collection('users').doc(auth.uid).collection('ai_memory');
    
    // Check if similar memory exists in same category
    const existing = await memoriesRef
      .where('category', '==', category)
      .limit(5)
      .get();
    
    let docId;
    const memoryData = {
      category,
      content,
      confidence,
      updatedAt: new Date().toISOString(),
    };

    if (!existing.empty) {
      // Update the most relevant existing memory in this category
      const existingDoc = existing.docs[0];
      docId = existingDoc.id;
      // Append to existing content if different
      const existingContent = existingDoc.data().content;
      if (existingContent !== content) {
        memoryData.content = `${existingContent}; ${content}`;
      }
      await memoriesRef.doc(docId).update(memoryData);
    } else {
      // Create new memory
      memoryData.createdAt = new Date().toISOString();
      const newDoc = await memoriesRef.add(memoryData);
      docId = newDoc.id;
    }

    return NextResponse.json(
      { success: true, memoryId: docId },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Memory POST Error:', error);
    return NextResponse.json(
      { error: 'Failed to save memory.', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// DELETE: Remove a specific memory
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');

    const auth = await verifyUser(req, searchParams.get('userId'), corsHeaders);
    if (auth.response) return auth.response;
    
    if (!memoryId) {
      return NextResponse.json(
        { error: 'memoryId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    await db.collection('users').doc(auth.uid).collection('ai_memory').doc(memoryId).delete();

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('Memory DELETE Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory.', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
