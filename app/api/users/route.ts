import { NextResponse } from 'next/server'
import { APP_USERS } from '@/lib/users'

export function GET() {
  return NextResponse.json(APP_USERS)
}
