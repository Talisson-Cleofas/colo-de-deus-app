import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../auth/AuthContext';
import { api, apiErrorMessage } from '../services/api';

type Cycle = { id: string; title: string; year: number; status: string; notified: boolean; responses?: number };
type Target = { id: string; name: string; kind: string; submitted: boolean };
type Mine = { questions: string[]; cycles: (Cycle & { targets: Target[] })[] };
type Results = { cycle: Cycle; questions: string[]; answers: { id: string; respondent: string; respondentId: string; profile: string; target: string; kind: string; scores: number[]; strengths: string; improvements: string; reflection: string; submittedAt: string }[] };
const privacy = 'Esta avaliação é identificada. Somente líderes de missão e desenvolvedor podem consultar suas respostas e sua identificação.';
const statusLabels: Record<string, string> = { DRAFT: 'Rascunho', OPEN: 'Aberta', CLOSED: 'Encerrada' };

function AnswerForm({ cycle, target, questions, onSubmitted }: { cycle: Cycle; target: Target; questions: string[]; onSubmitted: () => void }) {
  const [scores, setScores] = useState<string[]>(['', '', '', '']);
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await api.post(`/evaluations/${cycle.id}/answers`, { targetId: target.id, scores: scores.map(Number), strengths, improvements, reflection });
      onSubmitted();
    } catch (e) { setError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  return <Card><CardContent><Stack spacing={2}>
    <Typography variant="h6">{target.name}</Typography>
    {target.submitted ? <Alert severity="success">Avaliação enviada.</Alert> : <>
      <Typography variant="body2">{target.kind === 'SELF' ? 'Avalie sua atuação durante o ano.' : 'Avalie a atuação desta liderança durante o ano.'} Notas: 1 — precisa melhorar; 5 — excelente.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {questions.map((question, index) => <TextField key={question} select required label={question} value={scores[index]} onChange={e => setScores(old => old.map((score, i) => i === index ? e.target.value : score))} disabled={busy}>
          {[1, 2, 3, 4, 5].map(score => <MenuItem key={score} value={String(score)}>{score}</MenuItem>)}
        </TextField>)}
      </Box>
      <TextField label="Pontos fortes (opcional)" multiline minRows={2} value={strengths} onChange={e => setStrengths(e.target.value)} inputProps={{ maxLength: 2000 }} disabled={busy} />
      <TextField label="Sugestões de melhoria (opcional)" multiline minRows={2} value={improvements} onChange={e => setImprovements(e.target.value)} inputProps={{ maxLength: 2000 }} disabled={busy} />
      {target.kind === 'SELF' && <TextField required label="Como foi seu ano de liderança?" multiline minRows={3} value={reflection} onChange={e => setReflection(e.target.value)} inputProps={{ maxLength: 3000 }} disabled={busy} />}
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="caption">Confira antes de enviar: a resposta não poderá ser alterada.</Typography>
      <Button variant="contained" onClick={submit} disabled={busy || scores.some(s => !s) || (target.kind === 'SELF' && !reflection.trim())}>{busy ? 'Enviando…' : 'Enviar avaliação'}</Button>
    </>}
  </Stack></CardContent></Card>;
}

export function EvaluationsPage() {
  const [data, setData] = useState<Mine | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    api.get<Mine>('/evaluations/mine').then(r => { if (active) setData(r.data); }).catch(e => { if (active) setError(apiErrorMessage(e)); });
    return () => { active = false; };
  }, [reload]);
  return <Stack spacing={2}>
    <Typography variant="h4">Responder avaliações</Typography>
    <Alert severity="info">{privacy}</Alert>
    {error && <Alert severity="error" action={<Button onClick={() => setReload(n => n + 1)}>Tentar novamente</Button>}>{error}</Alert>}
    {!data && !error && <CircularProgress aria-label="Carregando avaliações" />}
    {data && !data.cycles.length && <Typography>Nenhuma avaliação liberada no momento.</Typography>}
    {data?.cycles.map(cycle => <Stack key={cycle.id} spacing={2}>
      <Typography variant="h5">{cycle.title} — {cycle.year}</Typography>
      {!cycle.targets.length && <Alert severity="info">Não há lideranças elegíveis vinculadas ao seu cadastro. Procure a liderança da missão.</Alert>}
      {cycle.targets.map(target => <AnswerForm key={`${cycle.id}:${target.id}`} cycle={cycle} target={target} questions={data.questions} onSubmitted={() => {
        setData(old => old ? { ...old, cycles: old.cycles.map(c => c.id === cycle.id ? { ...c, targets: c.targets.map(t => t.id === target.id ? { ...t, submitted: true } : t) } : c) } : old);
      }} />)}
    </Stack>)}
  </Stack>;
}

export function EvaluationAdminPanel() {
  const { user } = useAuth();
  const allowed = ['DEVELOPER', 'MISSION_LEADER', 'ADMIN'].includes(user?.profile || '');
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [title, setTitle] = useState('Avaliação anual de liderança');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { const r = await api.get<Cycle[]>('/evaluations'); setCycles(r.data); }, []);
  useEffect(() => {
    if (!allowed) { setResults(null); setCycles([]); return; }
    let active = true;
    api.get<Cycle[]>('/evaluations').then(r => { if (active) setCycles(r.data); }).catch(e => { if (active) setError(apiErrorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [allowed]);
  const action = async (work: () => Promise<unknown>) => {
    setBusy(true); setError('');
    try { await work(); await load(); } catch (e) { setError(apiErrorMessage(e)); await load().catch(() => undefined); } finally { setBusy(false); }
  };
  if (!allowed) return <Alert severity="error">Acesso restrito a líderes de missão e desenvolvedor.</Alert>;
  return <Stack spacing={2}>
    <Typography variant="h5">Avaliações de liderança</Typography>
    <Alert severity="info">{privacy} Criar um rascunho não envia notificações. Ao liberar, todos os membros, incluindo líderes, recebem o pedido no app.</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Título" value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 120 }} fullWidth />
      <TextField label="Ano avaliado" type="number" value={year} onChange={e => setYear(e.target.value)} inputProps={{ min: 2020, max: 2100 }} />
      <Button disabled={busy || title.trim().length < 3 || !Number.isInteger(Number(year)) || Number(year) < 2020 || Number(year) > 2100} onClick={() => action(() => api.post('/evaluations', { title: title.trim(), year: Number(year) }))}>Criar rascunho</Button>
    </Stack>
    {loading && <CircularProgress aria-label="Carregando ciclos" />}
    {!loading && !cycles.length && <Typography>Nenhuma avaliação criada.</Typography>}
    {cycles.map(cycle => <Card key={cycle.id}><CardContent><Stack spacing={1}>
      <Typography variant="h6">{cycle.title} — {cycle.year}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap"><Chip label={statusLabels[cycle.status] || cycle.status} /><Chip label={`${cycle.responses || 0} respostas`} /></Stack>
      {cycle.status === 'OPEN' && !cycle.notified && <Alert severity="warning">A avaliação está aberta, mas o envio da notificação não foi confirmado. Tente novamente abaixo.</Alert>}
      <Stack direction="row" gap={1} flexWrap="wrap">
        {(cycle.status === 'DRAFT' || (cycle.status === 'OPEN' && !cycle.notified)) && <Button disabled={busy} onClick={() => {
          if (window.confirm('Liberar esta avaliação e enviar o pedido para todos os membros, incluindo líderes?')) void action(() => api.post(`/evaluations/${cycle.id}/open`));
        }}>{cycle.status === 'DRAFT' ? 'Liberar e notificar todos' : 'Tentar notificação novamente'}</Button>}
        {cycle.status === 'OPEN' && <Button disabled={busy} onClick={() => {
          if (window.confirm('Encerrar a avaliação? Novas respostas não serão permitidas.')) void action(() => api.post(`/evaluations/${cycle.id}/close`));
        }}>Encerrar</Button>}
        <Button disabled={busy} onClick={() => { setResults(null); void action(async () => { const r = await api.get<Results>(`/evaluations/${cycle.id}/results`); setResults(r.data); }); }}>Ver respostas identificadas</Button>
      </Stack>
    </Stack></CardContent></Card>)}
    {results && <Stack spacing={2}>
      <Typography variant="h5">Respostas — {results.cycle.title}</Typography>
      {!results.answers.length && <Typography>Nenhuma resposta enviada.</Typography>}
      {results.answers.map(answer => <Card key={answer.id}><CardContent><Stack spacing={1}>
        <Typography fontWeight={700}>Respondente: {answer.respondent}</Typography>
        <Typography variant="caption">Identificação: {answer.respondentId} · {new Date(answer.submittedAt).toLocaleString('pt-BR')}</Typography>
        <Typography>Avaliação: {answer.target}</Typography>
        {results.questions.map((question, i) => <Typography key={question}>{question}: {answer.scores[i]}/5</Typography>)}
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Pontos fortes: {answer.strengths || 'Não informado'}</Typography>
        <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Melhorias: {answer.improvements || 'Não informado'}</Typography>
        {answer.reflection && <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>Reflexão anual: {answer.reflection}</Typography>}
      </Stack></CardContent></Card>)}
    </Stack>}
  </Stack>;
}
