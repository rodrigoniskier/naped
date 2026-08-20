import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';

export async function GET(request: Request) {
  try {
    await ensureSchema();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const sql = db();

    if (userId && from && to) {
      const rows = await sql`
        SELECT * FROM naped_activities
        WHERE user_id = ${Number(userId)}
          AND activity_date BETWEEN ${from}::date AND ${to}::date
        ORDER BY activity_date DESC, created_at DESC
      `;
      return NextResponse.json(rows);
    }
    if (userId) {
      const rows = await sql`
        SELECT * FROM naped_activities
        WHERE user_id = ${Number(userId)}
        ORDER BY activity_date DESC, created_at DESC
      `;
      return NextResponse.json(rows);
    }
    const rows = await sql`SELECT * FROM naped_activities ORDER BY activity_date DESC, created_at DESC`;
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao carregar atividades.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const b = await request.json();
    if (!b.user_id || !b.category || !b.activity_date) {
      return NextResponse.json({ error: 'Usuário, data e categoria são obrigatórios.' }, { status: 400 });
    }
    const sql = db();
    const rows = await sql`
      INSERT INTO naped_activities (
        user_id, activity_date, category, subcategory, modality, requester_type,
        course_period, component_area, demand_source, description, intervention,
        product, duration_minutes, referral, followup, status, result
      ) VALUES (
        ${Number(b.user_id)}, ${b.activity_date}::date, ${b.category}, ${b.subcategory || null},
        ${b.modality || null}, ${b.requester_type || null}, ${b.course_period || null},
        ${b.component_area || null}, ${b.demand_source || null}, ${b.description || null},
        ${b.intervention || null}, ${b.product || null}, ${b.duration_minutes ? Number(b.duration_minutes) : null},
        ${b.referral || null}, ${Boolean(b.followup)}, ${b.status || 'Concluído'}, ${b.result || null}
      ) RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao registrar atividade.' }, { status: 500 });
  }
}
