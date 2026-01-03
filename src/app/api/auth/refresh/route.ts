import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const newToken = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      client_id: user.client_id
    });

    return NextResponse.json({ token: newToken });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}