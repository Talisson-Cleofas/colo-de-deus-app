import {
  Alert,
  Autocomplete,
  Box,
  Button,
  DialogActions,
  DialogContent,
  FormHelperText,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { MissionaryAgenda, MissionaryAgendaOptions, MissionaryAgendaType } from '../../types';

export type AgendaMissionariaFormValue = {
  title: string;
  description: string;
  type: MissionaryAgendaType;
  status: 'RASCUNHO';
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  responsibleId: string;
  ministryId: string;
  participantLimit: number;
  meetingPoint: string;
  transport: string;
  notes: string;
  accompanyingIds: string[];
  intercessorIds: string[];
};

const initialValue: AgendaMissionariaFormValue = {
  title: '',
  description: '',
  type: 'MISSAO',
  status: 'RASCUNHO',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  address: '',
  neighborhood: '',
  city: '',
  state: 'DF',
  zipCode: '',
  responsibleId: '',
  ministryId: '',
  participantLimit: 0,
  meetingPoint: '',
  transport: '',
  notes: '',
  accompanyingIds: [],
  intercessorIds: [],
};

const typeOptions: Array<{ value: MissionaryAgendaType; label: string }> = [
  { value: 'MISSAO', label: 'Missão' },
  { value: 'EVANGELIZACAO', label: 'Evangelização' },
  { value: 'VISITA', label: 'Visita' },
  { value: 'FORMACAO', label: 'Formação' },
  { value: 'RETIRO', label: 'Retiro' },
  { value: 'OUTRO', label: 'Outro' },
];
function fromAgenda(item: MissionaryAgenda | null): AgendaMissionariaFormValue {
  if (!item) return initialValue;
  return {
    title: item.title,
    description: item.description,
    type: item.type,
    status: 'RASCUNHO',
    startDate: item.startDate,
    endDate: item.endDate,
    startTime: item.startTime,
    endTime: item.endTime,
    location: item.location,
    address: item.address,
    neighborhood: item.neighborhood,
    city: item.city,
    state: item.state,
    zipCode: item.zipCode,
    responsibleId: item.responsibleId,
    ministryId: item.ministryId,
    participantLimit: item.participantLimit,
    meetingPoint: item.meetingPoint,
    transport: item.transport,
    notes: item.notes,
    accompanyingIds: item.accompanyingIds,
    intercessorIds: item.intercessorIds,
  };
}

export function AgendaMissionariaForm({
  agenda,
  options,
  saving,
  serverError,
  onCancel,
  onSubmit,
}: {
  agenda: MissionaryAgenda | null;
  options: MissionaryAgendaOptions;
  saving: boolean;
  serverError: string;
  onCancel: () => void;
  onSubmit: (value: AgendaMissionariaFormValue) => Promise<void>;
}) {
  const [value, setValue] = useState<AgendaMissionariaFormValue>(() => fromAgenda(agenda));
  const [submitted, setSubmitted] = useState(false);
  const [teamTab, setTeamTab] = useState(0);

  useEffect(() => {
    setValue(fromAgenda(agenda));
    setSubmitted(false);
    setTeamTab(0);
  }, [agenda]);

  const errors = useMemo(() => {
    const next: Partial<Record<keyof AgendaMissionariaFormValue, string>> = {};
    if (value.title.trim().length < 3)
      next.title = 'Informe um título com pelo menos 3 caracteres.';
    if (!value.startDate) next.startDate = 'A data inicial é obrigatória.';
    if (!value.startTime) next.startTime = 'O horário inicial é obrigatório.';
    if (value.endDate && value.startDate && value.endDate < value.startDate)
      next.endDate = 'A data final não pode ser anterior à inicial.';
    if (
      value.endDate === value.startDate &&
      value.endTime &&
      value.startTime &&
      value.endTime < value.startTime
    )
      next.endTime = 'O término não pode ser anterior ao início.';
    if (value.location.trim().length < 2) next.location = 'Informe o local da atividade.';
    if (value.city.trim().length < 2) next.city = 'Informe a cidade.';
    if (!/^[A-Z]{2}$/.test(value.state.trim().toUpperCase()))
      next.state = 'Informe uma UF com 2 letras.';
    if (value.zipCode && !/^\d{5}-?\d{3}$/.test(value.zipCode))
      next.zipCode = 'Use o formato 00000-000.';
    if (value.participantLimit < 0) next.participantLimit = 'O limite não pode ser negativo.';
    return next;
  }, [value]);

  const field = (key: keyof AgendaMissionariaFormValue, next: string | number | string[]) =>
    setValue((current) => ({ ...current, [key]: next }));
  const submit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    await onSubmit({ ...value, state: value.state.trim().toUpperCase() });
  };
  const error = (key: keyof AgendaMissionariaFormValue) => (submitted ? errors[key] : undefined);

  return (
    <>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" mb={1.5}>
              Informações principais
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 2,
              }}
            >
              <TextField
                required
                label="Título"
                value={value.title}
                onChange={(event) => field('title', event.target.value)}
                error={Boolean(error('title'))}
                helperText={error('title')}
              />
              <TextField
                select
                required
                label="Tipo"
                value={value.type}
                onChange={(event) => field('type', event.target.value)}
              >
                {typeOptions.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Descrição"
                multiline
                minRows={3}
                value={value.description}
                onChange={(event) => field('description', event.target.value)}
                sx={{ gridColumn: { md: '1/-1' } }}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" mb={1.5}>
              Data e horário
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' },
                gap: 2,
              }}
            >
              <TextField
                required
                type="date"
                label="Data inicial"
                value={value.startDate}
                onChange={(event) => field('startDate', event.target.value)}
                error={Boolean(error('startDate'))}
                helperText={error('startDate')}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="date"
                label="Data final"
                value={value.endDate}
                onChange={(event) => field('endDate', event.target.value)}
                error={Boolean(error('endDate'))}
                helperText={error('endDate')}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                required
                type="time"
                label="Horário inicial"
                value={value.startTime}
                onChange={(event) => field('startTime', event.target.value)}
                error={Boolean(error('startTime'))}
                helperText={error('startTime')}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                type="time"
                label="Horário final"
                value={value.endTime}
                onChange={(event) => field('endTime', event.target.value)}
                error={Boolean(error('endTime'))}
                helperText={error('endTime')}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" mb={1.5}>
              Localização
            </Typography>
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}
            >
              <TextField
                required
                label="Local"
                value={value.location}
                onChange={(event) => field('location', event.target.value)}
                error={Boolean(error('location'))}
                helperText={error('location')}
              />
              <TextField
                label="CEP"
                value={value.zipCode}
                onChange={(event) => field('zipCode', event.target.value)}
                error={Boolean(error('zipCode'))}
                helperText={error('zipCode')}
              />
              <TextField
                label="Endereço"
                value={value.address}
                onChange={(event) => field('address', event.target.value)}
                sx={{ gridColumn: { md: '1/-1' } }}
              />
              <TextField
                label="Bairro"
                value={value.neighborhood}
                onChange={(event) => field('neighborhood', event.target.value)}
              />
              <TextField
                required
                label="Cidade"
                value={value.city}
                onChange={(event) => field('city', event.target.value)}
                error={Boolean(error('city'))}
                helperText={error('city')}
              />
              <TextField
                required
                label="UF"
                value={value.state}
                inputProps={{ maxLength: 2 }}
                onChange={(event) => field('state', event.target.value.toUpperCase())}
                error={Boolean(error('state'))}
                helperText={error('state')}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="h6" mb={1.5}>
              Ministério solicitado
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2,1fr)' },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Missionário solicitado"
                value={value.responsibleId}
                onChange={(event) => field('responsibleId', event.target.value)}
                error={Boolean(error('responsibleId'))}
                helperText={error('responsibleId')}
              >
                <MenuItem value="">A definir pelo líder do ministério</MenuItem>
                {options.members.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Ministério solicitado"
                value={value.ministryId}
                onChange={(event) => field('ministryId', event.target.value)}
              >
                <MenuItem value="">Toda a missão</MenuItem>
                {options.ministries.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="number"
                label="Limite de participantes"
                value={value.participantLimit}
                inputProps={{ min: 0 }}
                onChange={(event) => field('participantLimit', Number(event.target.value))}
                error={Boolean(error('participantLimit'))}
                helperText={error('participantLimit') || 'Use 0 para não limitar.'}
              />
              <TextField
                label="Ponto de encontro"
                value={value.meetingPoint}
                onChange={(event) => field('meetingPoint', event.target.value)}
              />
              <TextField
                label="Transporte"
                value={value.transport}
                onChange={(event) => field('transport', event.target.value)}
              />
              <TextField
                label="Observações"
                multiline
                minRows={3}
                value={value.notes}
                onChange={(event) => field('notes', event.target.value)}
              />
            </Box>
            <Box sx={{ mt: 2.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Tabs
                value={teamTab}
                onChange={(_, next) => setTeamTab(next)}
                variant="fullWidth"
                aria-label="Equipe missionária"
              >
                <Tab label={`Acompanhantes (${value.accompanyingIds.length})`} />
                <Tab label={`Intercessores (${value.intercessorIds.length})`} />
              </Tabs>
              <Box sx={{ p: 2 }}>
                {teamTab === 0 ? (
                  <Autocomplete
                    multiple
                    options={options.members.filter(
                      (member) => !value.intercessorIds.includes(member.id),
                    )}
                    value={options.members.filter((member) =>
                      value.accompanyingIds.includes(member.id),
                    )}
                    getOptionLabel={(member) => member.name}
                    isOptionEqualToValue={(option, selected) => option.id === selected.id}
                    onChange={(_, selected) =>
                      field(
                        'accompanyingIds',
                        selected.map((member) => member.id),
                      )
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Missionários acompanhantes"
                        placeholder="Selecione um ou mais"
                      />
                    )}
                  />
                ) : (
                  <Autocomplete
                    multiple
                    options={options.members.filter(
                      (member) => !value.accompanyingIds.includes(member.id),
                    )}
                    value={options.members.filter((member) =>
                      value.intercessorIds.includes(member.id),
                    )}
                    getOptionLabel={(member) => member.name}
                    isOptionEqualToValue={(option, selected) => option.id === selected.id}
                    onChange={(_, selected) =>
                      field(
                        'intercessorIds',
                        selected.map((member) => member.id),
                      )
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Missionários intercessores"
                        placeholder="Selecione um ou mais"
                      />
                    )}
                  />
                )}
              </Box>
            </Box>
            <FormHelperText sx={{ mt: 1.5 }}>
              A equipe selecionada ficará vinculada à agenda e disponível durante a edição.
            </FormHelperText>
          </Box>
          {serverError && <Alert severity="error">{serverError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void submit()} disabled={saving}>
          {saving ? 'Salvando...' : agenda ? 'Salvar alterações' : 'Criar agenda'}
        </Button>
      </DialogActions>
    </>
  );
}
