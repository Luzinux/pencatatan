import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.budget.delete({ where: { id } })
    return NextResponse.json({ message: 'Budget deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
