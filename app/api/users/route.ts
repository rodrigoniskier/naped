import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';

export async function GET() {
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql`SELECT id, name, role, institution, email, created_at FROM naped_users ORDER BY name`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar usuários.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
    const sql = db();
    const rows = await sql`
      INSERT INTO naped_users (name, role, institution, email)
      VALUES (${body.name.trim()}, ${body.role || null}, ${body.institution || null}, ${body.email || null})
      RETURNING id, name, role, institution, email, created_at
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao cadastrar usuário.' }, { status: 500 });
  }
}
