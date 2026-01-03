import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';
import { getUserFromRequest } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const clients = await db.getAllUsers({ role: 'client' });
    return NextResponse.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { username, password, client_id, start_date } = await request.json();

    if (!username || !password || !client_id) {
      return NextResponse.json(
        { error: 'Username, password, and client_id are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await db.getUser({ username });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Check if client_id already exists
    const existingClient = await db.getUser({ client_id });
    if (existingClient) {
      return NextResponse.json(
        { error: 'Client ID already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newClient = await db.createUser({
      username,
      password: hashedPassword,
      role: 'client',
      client_id,
      start_date
    });

    return NextResponse.json({
      message: 'Client created successfully',
      client: {
        id: newClient.id,
        username: newClient.username,
        client_id: newClient.client_id,
        start_date: newClient.start_date
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}