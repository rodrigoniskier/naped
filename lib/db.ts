import { neon } from '@neondatabase/serverless';

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não configurada.');
  return neon(url);
}

export async function ensureSchema() {
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS naped_users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT,
      institution TEXT,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS naped_activities (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES naped_users(id) ON DELETE CASCADE,
      activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
      category TEXT NOT NULL,
      subcategory TEXT,
      modality TEXT,
      requester_type TEXT,
      course_period TEXT,
      component_area TEXT,
      demand_source TEXT,
      description TEXT,
      intervention TEXT,
      product TEXT,
      duration_minutes INTEGER,
      referral TEXT,
      followup BOOLEAN NOT NULL DEFAULT FALSE,
      status TEXT NOT NULL DEFAULT 'Concluído',
      result TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_naped_activities_user_date ON naped_activities(user_id, activity_date DESC)`;
}
