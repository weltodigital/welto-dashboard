import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/database';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    console.log('Login attempt started');
    console.log('Supabase URL:', process.env.SUPABASE_URL);
    console.log('Supabase Service Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    console.log('Attempting to get user:', username);
    const user = await db.getUser({ username });
    console.log('User found:', !!user);

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      client_id: user.client_id
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        client_id: user.client_id
      }
    });
  } catch (error) {
    console.error('Login error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    });
    return NextResponse.json(
      { error: 'Database error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}