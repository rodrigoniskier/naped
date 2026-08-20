'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type User = { id: number; name: string; role?: string; institution?: string; email?: string };
type Activity = { id: number; activity_date: string; category: string; subcategory?: string; modality?: string; description?: string; duration_minutes?: number; status?: string };

const categories: Record<string, string[]> = {
  'Planejamento pedagógico': ['Plano de ensino', 'Plano de aula', 'Objetivos de aprendizagem', 'Cronograma', 'Competências'],
  'Metodologias': ['Metodologias ativas', 'TBL/PBL', 'Sala de aula invertida', 'Simulação', 'Aprendizagem baseada em projetos'],
  'Avaliação': ['Elaboração de questões', 'Revisão de questões', 'Blueprint', 'Rubricas', 'OSCE/Avaliação prática', 'Avaliação formativa', 'Avaliação programática', 'Análise de resultados', 'Remediação'],
  'Feedback e mentoria': ['Feedback estruturado', 'Mentoria', 'Acompanhamento longitudinal', 'Plano de melhoria'],
  'Desenvolvimento docente': ['Oficina', 'Curso', 'Capacitação', 'Comunidade de prática', 'Formação de novos docentes'],
  'Currículo/PPC': ['Integração curricular', 'Revisão de componente', 'Alinhamento PPC–DCN', 'Reforma curricular'],
  'Preceptoria/IESC': ['Formação de preceptores', 'Supervisão clínica', 'Internato', 'Integração ensino-serviço-comunidade'],
  'Tecnologia/Inovação': ['IA na educação', 'AVA', 'Simulação', 'Recursos digitais', 'Material educacional'],
  'Gestão/Qualidade': ['Indicadores', 'Escuta docente', 'Diagnóstico de necessidades', 'NDE/Coordenação', 'Avaliação do programa NAPED']
};

const modalities = ['Atendimento individual', 'Atendimento em grupo', 'Oficina', 'Curso/capacitação', 'Reunião técnica', 'Consultoria pedagógica', 'Produção/revisão de material', 'Observação docente', 'Reunião institucional', 'Projeto longitudinal'];

const LOGO_UNIPE = 'https://raw.githubusercontent.com/rodrigoniskier/naped/main/logo.png';
const LOGO_NAPED = 'https://raw.githubusercontent.com/rodrigoniskier/naped/main/naped.jpg';

function today() { return new Date().toISOString().slice(0, 10); }

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [selected, setSelected] = useState<User | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [view, setView] = useState<'home'|'new'|'history'|'report'>('home');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState(Object.keys(categories)[0]);
  const [profileOpen, setProfileOpen] = useState(false);

  async function loadUsers() {
    setLoading(true);
    try {
      const r = await fetch('/api/users', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao carregar usuários.');
      setUsers(data);
      const last = localStorage.getItem('naped:lastUser');
      const remembered = data.find((u: User) => String(u.id) === last);
      if (remembered) setSelected(remembered);
      if (!data.length) setProfileOpen(true);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Erro inesperado.'); }
    finally { setLoading(false); }
  }

  async function loadActivities(userId: number) {
    try {
      const r = await fetch(`/api/activities?userId=${userId}`, { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Erro ao carregar atividades.');
      setActivities(data);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Erro inesperado.'); }
  }

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (selected) loadActivities(selected.id); }, [selected]);

  function chooseUser(u: User) {
    setSelected(u); localStorage.setItem('naped:lastUser', String(u.id)); setView('home'); setMessage('');
  }

  async function createUser(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(Object.fromEntries(fd)) });
    const data = await r.json();
    if (!r.ok) return setMessage(data.error || 'Não foi possível cadastrar.');
    setUsers(prev => [...prev, data]); chooseUser(data); setProfileOpen(false); setMessage('Perfil cadastrado.');
  }

  async function createActivity(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!selected) return;
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd) as any;
    body.user_id = selected.id; body.followup = fd.get('followup') === 'on'; body.category = category;
    const r = await fetch('/api/activities', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) return setMessage(data.error || 'Erro ao registrar atividade.');
    setMessage('Atividade registrada com sucesso.'); await loadActivities(selected.id); setView('home');
  }

  const stats = useMemo(() => {
    const minutes = activities.reduce((s,a) => s + Number(a.duration_minutes || 0), 0);
    const uniqueCats = new Set(activities.map(a => a.category)).size;
    return { total: activities.length, hours: (minutes/60).toFixed(1), categories: uniqueCats };
  }, [activities]);

  if (loading) return <main className="center"><div className="loader"/><p>Preparando o NAPED…</p></main>;

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')} aria-label="Início">
          <span className="brand-logos">
            <img src={LOGO_UNIPE} alt="UNIPÊ" className="brand-logo unipe-logo" />
            <span className="brand-divider" aria-hidden="true" />
            <img src={LOGO_NAPED} alt="NAPED" className="brand-logo naped-logo" />
          </span>
          <span className="brand-copy"><strong>NAPED</strong><small>Educação Médica</small></span>
        </button>
        <button className="user-chip" onClick={() => setProfileOpen(true)}>{selected ? selected.name : 'Escolher usuário'} <span>⌄</span></button>
      </header>

      {message && <div className="notice" onClick={() => setMessage('')}>{message}</div>}

      {!selected ? (
        <section className="welcome card">
          <p className="eyebrow">REGISTRO INSTITUCIONAL</p><h1>Atividades do NAPED, organizadas com clareza.</h1>
          <p>Escolha um usuário cadastrado ou crie o primeiro perfil para começar.</p>
          <button className="primary" onClick={() => setProfileOpen(true)}>Selecionar usuário</button>
        </section>
      ) : view === 'home' ? (
        <>
          <section className="hero">
            <div><p className="eyebrow">PAINEL DO USUÁRIO</p><h1>Olá, {selected.name.split(' ')[0]}.</h1><p>Registre a atividade em poucos passos e mantenha o histórico pronto para relatório.</p></div>
            <button className="primary big" onClick={() => setView('new')}>＋ Registrar atividade</button>
          </section>
          <section className="stats-grid">
            <article className="stat"><span>Atividades</span><strong>{stats.total}</strong></article>
            <article className="stat"><span>Horas registradas</span><strong>{stats.hours}</strong></article>
            <article className="stat"><span>Áreas alcançadas</span><strong>{stats.categories}</strong></article>
          </section>
          <section className="action-grid">
            <button className="action-card" onClick={() => setView('new')}><span>＋</span><b>Novo registro</b><small>Adicionar atividade do NAPED</small></button>
            <button className="action-card" onClick={() => setView('history')}><span>≡</span><b>Histórico</b><small>Consultar registros anteriores</small></button>
            <button className="action-card" onClick={() => setView('report')}><span>↗</span><b>Relatórios</b><small>Gerar PDF ou DOCX</small></button>
          </section>
          <section className="card recent"><div className="section-title"><h2>Registros recentes</h2><button onClick={() => setView('history')}>Ver todos</button></div>
            {!activities.length ? <p className="muted">Ainda não há atividades registradas.</p> : activities.slice(0,5).map(a => <div className="activity-row" key={a.id}><span className="date-badge">{String(a.activity_date).slice(8,10)}<small>{String(a.activity_date).slice(5,7)}</small></span><div><b>{a.category}</b><small>{a.subcategory || a.modality || 'Atividade NAPED'}</small></div><span className="status">{a.status || 'Concluído'}</span></div>)}
          </section>
        </>
      ) : view === 'new' ? (
        <section className="form-wrap">
          <button className="back" onClick={() => setView('home')}>← Voltar</button><div className="form-head"><p className="eyebrow">NOVO REGISTRO</p><h1>Atividade do NAPED</h1><p>Os campos essenciais vêm primeiro. Os complementares qualificam o relatório institucional.</p></div>
          <form className="card form-card" onSubmit={createActivity}>
            <div className="two"><label>Data<input name="activity_date" type="date" defaultValue={today()} required /></label><label>Modalidade<select name="modality" defaultValue="Atendimento individual">{modalities.map(m => <option key={m}>{m}</option>)}</select></label></div>
            <label>Categoria<select value={category} onChange={e => setCategory(e.target.value)}>{Object.keys(categories).map(c => <option key={c}>{c}</option>)}</select></label>
            <label>Subcategoria<select name="subcategory">{categories[category].map(s => <option key={s}>{s}</option>)}</select></label>
            <div className="two"><label>Perfil do solicitante<select name="requester_type"><option>Docente</option><option>Preceptor</option><option>Coordenação</option><option>NDE</option><option>Grupo docente</option><option>Outro</option></select></label><label>Duração (min)<input name="duration_minutes" type="number" min="0" step="5" placeholder="45" /></label></div>
            <div className="two"><label>Curso / período<input name="course_period" placeholder="Medicina — P6" /></label><label>Componente / área<input name="component_area" placeholder="Ex.: MAPD II" /></label></div>
            <label>Origem da demanda<select name="demand_source"><option>Espontânea</option><option>Coordenação</option><option>NDE</option><option>Indicador institucional</option><option>Avaliação discente</option><option>Iniciativa do NAPED</option></select></label>
            <label>Demanda / contexto<textarea name="description" rows={3} placeholder="Descreva brevemente a necessidade identificada." /></label>
            <label>Intervenção realizada<textarea name="intervention" rows={3} placeholder="O que foi feito pelo NAPED?" /></label>
            <div className="two"><label>Produto gerado<input name="product" placeholder="Rubrica, prova revisada, plano…" /></label><label>Encaminhamento<input name="referral" placeholder="Nenhum / Coordenação / NDE…" /></label></div>
            <label>Resultado / observação<textarea name="result" rows={2} placeholder="Resultado imediato ou evidência de conclusão." /></label>
            <div className="two"><label>Status<select name="status"><option>Concluído</option><option>Em acompanhamento</option></select></label><label className="check"><input name="followup" type="checkbox"/> Necessita acompanhamento</label></div>
            <button className="primary submit">Salvar atividade</button>
          </form>
        </section>
      ) : view === 'history' ? (
        <section className="form-wrap"><button className="back" onClick={() => setView('home')}>← Voltar</button><div className="form-head"><p className="eyebrow">HISTÓRICO</p><h1>Atividades registradas</h1></div><div className="card history-list">
          {!activities.length ? <p className="muted">Nenhum registro encontrado.</p> : activities.map(a => <div className="history-item" key={a.id}><div><b>{a.category}</b><p>{a.subcategory || a.modality || 'Atividade NAPED'}</p><small>{String(a.activity_date).slice(0,10)} · {a.duration_minutes ? `${a.duration_minutes} min` : 'duração não informada'}</small></div><span className="status">{a.status || 'Concluído'}</span></div>)}
        </div></section>
      ) : (
        <section className="form-wrap"><button className="back" onClick={() => setView('home')}>← Voltar</button><div className="form-head"><p className="eyebrow">RELATÓRIOS</p><h1>Gerar relatório institucional</h1><p>Escolha o período e exporte em formato editável ou pronto para distribuição.</p></div><div className="card report-card">
          <div className="two"><label>Data inicial<input id="from" type="date" /></label><label>Data final<input id="to" type="date" /></label></div>
          <div className="report-buttons"><button className="primary" onClick={() => { const f=(document.getElementById('from') as HTMLInputElement).value; const t=(document.getElementById('to') as HTMLInputElement).value; window.open(`/api/report?userId=${selected.id}&format=pdf${f&&t?`&from=${f}&to=${t}`:''}`,'_blank'); }}>Gerar PDF</button><button className="secondary" onClick={() => { const f=(document.getElementById('from') as HTMLInputElement).value; const t=(document.getElementById('to') as HTMLInputElement).value; window.open(`/api/report?userId=${selected.id}&format=docx${f&&t?`&from=${f}&to=${t}`:''}`,'_blank'); }}>Gerar DOCX</button></div>
          <p className="muted">O relatório inclui identificação do responsável, período, total de atividades, carga horária, distribuição por categoria e relação dos registros.</p>
        </div></section>
      )}

      {profileOpen && <div className="modal-backdrop" onMouseDown={() => users.length && setProfileOpen(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="section-title"><div><p className="eyebrow">USUÁRIOS</p><h2>Quem está registrando?</h2></div>{users.length > 0 && <button onClick={() => setProfileOpen(false)}>×</button>}</div>
        {users.map(u => <button className={`user-option ${selected?.id===u.id?'active':''}`} key={u.id} onClick={() => {chooseUser(u);setProfileOpen(false)}}><span>{u.name.charAt(0).toUpperCase()}</span><div><b>{u.name}</b><small>{u.role || 'NAPED'}{u.institution ? ` · ${u.institution}` : ''}</small></div></button>)}
        <details open={!users.length}><summary>＋ Cadastrar novo usuário</summary><form className="mini-form" onSubmit={createUser}><label>Nome completo<input name="name" required /></label><label>Função<input name="role" placeholder="Ex.: Professor / NAPED" /></label><label>Instituição<input name="institution" placeholder="Ex.: UNIPÊ" /></label><label>E-mail <small>(opcional)</small><input name="email" type="email" /></label><button className="primary">Salvar perfil</button></form></details>
      </div></div>}
      <footer className="app-footer">
        <div className="footer-logos" aria-label="Identidade institucional">
          <img src={LOGO_UNIPE} alt="UNIPÊ" />
          <span aria-hidden="true" />
          <img src={LOGO_NAPED} alt="NAPED" />
        </div>
        <p><strong>Criado por Prof. Rodrigo Niskier | 2026</strong></p>
        <p className="footer-reference">Baseado em: ASSOCIAÇÃO BRASILEIRA DE EDUCAÇÃO MÉDICA (ABEM). <em>Caderno de Orientações para implementação das Diretrizes Curriculares Nacionais do Curso de Graduação em Medicina 2025</em>. Brasília, DF: Associação Brasileira de Educação Médica, 2026. ISBN 978-65-86406-22-1.</p>
      </footer>
    </main>
  );
}