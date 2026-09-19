import { useState } from 'react';
import { API_URL, USER_ID } from './api';
import { todayString } from './dateUtils';
import { useDialog } from './DialogProvider';

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  type: string;
  status: string;
  priority: string | null;
  highlighted: boolean;
}

interface ActivityFormProps {
  activity: Activity | null;
  defaultDate: string;
  existingActivities: Activity[];
  onSaved: () => void;
  onClose: () => void;
}

type DurationMode = 'none' | 'custom' | number;

const DURATIONS: { label: string; value: number }[] = [
  { label: '30 min', value: 30 },
  { label: '1 h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2 h', value: 120 },
];

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): string {
  const h = String(Math.floor(total / 60)).padStart(2, '0');
  const m = String(total % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// Todos os horários de 05:00 até 23:30, de 30 em 30 minutos
const TIME_SLOTS: string[] = [];
for (let minutes = 5 * 60; minutes <= 23 * 60 + 30; minutes += 30) {
  TIME_SLOTS.push(fromMinutes(minutes));
}

function initialDurationMode(activity: Activity | null): DurationMode {
  if (!activity?.startTime || !activity.endTime) return 'none';
  const diff = toMinutes(activity.endTime.slice(0, 5)) - toMinutes(activity.startTime.slice(0, 5));
  return DURATIONS.some((d) => d.value === diff) ? diff : 'custom';
}

function ActivityForm({
  activity,
  defaultDate,
  existingActivities,
  onSaved,
  onClose,
}: ActivityFormProps) {
  const { confirm, notify } = useDialog();
  const isEditing = activity !== null;

  const [title, setTitle] = useState(activity?.title ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [date, setDate] = useState(activity?.date ?? defaultDate ?? todayString());
  const [type, setType] = useState(activity?.type ?? 'TASK');
  const [priority, setPriority] = useState(activity?.priority ?? '');
  const [highlighted, setHighlighted] = useState(activity?.highlighted ?? false);

  const [hasTime, setHasTime] = useState(Boolean(activity?.startTime));
  const [startTime, setStartTime] = useState(activity?.startTime?.slice(0, 5) ?? '');
  const [durationMode, setDurationMode] = useState<DurationMode>(initialDurationMode(activity));
  const [customEnd, setCustomEnd] = useState(activity?.endTime?.slice(0, 5) ?? '');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Horário de fim calculado a partir da duração escolhida
  function computeEnd(): string {
    if (!hasTime || !startTime) return '';
    if (durationMode === 'none') return '';
    if (durationMode === 'custom') return customEnd;
    const total = toMinutes(startTime) + durationMode;
    return total > 1439 ? '23:59' : fromMinutes(total);
  }

  const endTime = computeEnd();

  // Horários ocupados no dia escolhido (ignora canceladas e a própria atividade)
  const busyActivities = existingActivities
    .filter((other) => {
      if (isEditing && other.id === activity!.id) return false;
      if (other.date !== date) return false;
      if (other.status === 'CANCELLED') return false;
      return Boolean(other.startTime);
    })
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));

  // Um horário da grade está ocupado se cai dentro de outra atividade
  function isSlotBusy(slot: string): boolean {
    const s = toMinutes(slot);
    return busyActivities.some((other) => {
      const os = toMinutes(other.startTime!.slice(0, 5));
      const oe = other.endTime ? toMinutes(other.endTime.slice(0, 5)) : os + 1;
      return s >= os && s < oe;
    });
  }

  // Sobreposição: sem horário de fim, a atividade ocupa só o minuto de início
  const conflicts: Activity[] =
    hasTime && startTime
      ? busyActivities.filter((other) => {
          const newStart = toMinutes(startTime);
          const newEnd = endTime ? toMinutes(endTime) : newStart + 1;
          const otherStart = toMinutes(other.startTime!.slice(0, 5));
          const otherEnd = other.endTime
            ? toMinutes(other.endTime.slice(0, 5))
            : otherStart + 1;
          return newStart < otherEnd && otherStart < newEnd;
        })
      : [];

  const hasConflicts = conflicts.length > 0;

  function validate(): string | null {
    if (!title.trim()) return 'Escreva um título para a atividade.';
    if (!date) return 'Escolha uma data.';
    if (hasTime && !startTime) {
      return 'Escolha o horário de início ou desmarque "Definir horário".';
    }
    if (hasTime && durationMode === 'custom') {
      if (!customEnd) return 'Informe o horário de fim ou escolha outra duração.';
      if (customEnd <= startTime) {
        return 'O horário de fim precisa ser depois do horário de início.';
      }
    }
    return null;
  }

  async function save() {
    if (saving || hasConflicts) return;

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setFormError(null);
    setSaving(true);

    const body = {
      userId: USER_ID,
      title: title.trim(),
      description: description.trim() || null,
      date,
      startTime: hasTime && startTime ? `${startTime}:00` : null,
      endTime: hasTime && endTime ? `${endTime}:00` : null,
      type,
      status: activity?.status ?? 'PENDING',
      priority: priority || null,
      highlighted,
    };

    const url = isEditing
      ? `${API_URL}/api/activities/${activity!.id}?userId=${USER_ID}`
      : `${API_URL}/api/activities?userId=${USER_ID}`;

    try {
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Erro ao salvar atividade');

      notify(isEditing ? 'Atividade atualizada.' : 'Atividade criada.', 'success');
      onSaved();
    } catch (err) {
      setFormError('Não conseguimos salvar esta atividade. Verifique sua conexão e tente novamente.');
      setSaving(false);
    }
  }

  async function cancelActivity() {
    if (saving || !activity) return;

    const ok = await confirm({
      title: 'Cancelar esta atividade?',
      message: 'Ela continua no seu histórico, só que marcada como cancelada.',
      confirmLabel: 'Cancelar atividade',
      cancelLabel: 'Voltar',
    });
    if (!ok) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/activities/${activity.id}/status?userId=${USER_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        }
      );

      if (!response.ok) throw new Error('Erro ao cancelar atividade');

      notify('Atividade cancelada.', 'info');
      onSaved();
    } catch (err) {
      setFormError('Não conseguimos cancelar esta atividade. Verifique sua conexão e tente novamente.');
      setSaving(false);
    }
  }

  async function deleteActivity() {
    if (saving || !activity) return;

    const ok = await confirm({
      title: 'Excluir esta atividade?',
      message: `"${activity.title}" será removida para sempre. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Sim, excluir',
      cancelLabel: 'Voltar',
      danger: true,
    });
    if (!ok) return;

    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/activities/${activity.id}?userId=${USER_ID}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Erro ao excluir atividade');

      notify('Atividade excluída.', 'success');
      onSaved();
    } catch (err) {
      setFormError('Não conseguimos excluir esta atividade. Verifique sua conexão e tente novamente.');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Editar atividade' : 'Nova atividade'}</h2>

        <div className="form-field">
          <label htmlFor="af-title">Título *</label>
          <input
            id="af-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="form-field">
          <label htmlFor="af-description">Descrição</label>
          <textarea
            id="af-description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-field">
            <label htmlFor="af-date">Data *</label>
            <input
              id="af-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="af-type">Tipo</label>
            <select id="af-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="TASK">Tarefa</option>
              <option value="COMMITMENT">Compromisso</option>
              <option value="POSSIBILITY">Possibilidade</option>
            </select>
          </div>
        </div>

        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={hasTime}
            onChange={(e) => setHasTime(e.target.checked)}
          />
          Definir horário
        </label>

        {hasTime && (
          <div className="time-box">
            <div className="form-field">
              <label>Escolha o horário de início</label>
              <div
                className="chip-row"
                style={{
                  maxHeight: 170,
                  overflowY: 'auto',
                  padding: 8,
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {TIME_SLOTS.map((slot) => {
                  const busy = isSlotBusy(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={busy}
                      title={busy ? 'Horário ocupado' : undefined}
                      className={`chip ${startTime === slot ? 'selected' : ''}`}
                      style={busy ? { textDecoration: 'line-through' } : undefined}
                      onClick={() => setStartTime(slot)}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                Horários riscados já estão ocupados neste dia.
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="af-start">Ou digite um horário exato</label>
              <input
                id="af-start"
                type="time"
                step={300}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Duração</label>
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip ${durationMode === 'none' ? 'selected' : ''}`}
                  onClick={() => setDurationMode('none')}
                >
                  Sem fim
                </button>
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    className={`chip ${durationMode === d.value ? 'selected' : ''}`}
                    onClick={() => setDurationMode(d.value)}
                  >
                    {d.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ${durationMode === 'custom' ? 'selected' : ''}`}
                  onClick={() => setDurationMode('custom')}
                >
                  Outro
                </button>
              </div>
            </div>

            {durationMode === 'custom' && (
              <div className="form-field">
                <label htmlFor="af-end">Termina às</label>
                <input
                  id="af-end"
                  type="time"
                  step={300}
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </div>
            )}

            {startTime && (
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Resumo: <strong>{startTime}</strong>
                {endTime ? ` até ${endTime}` : ' (sem horário de fim)'}
              </div>
            )}

            {busyActivities.length > 0 && (
              <div className="busy-list">
                Horários já ocupados neste dia:
                <ul>
                  {busyActivities.map((b) => (
                    <li key={b.id}>
                      {b.startTime!.slice(0, 5)}
                      {b.endTime ? `–${b.endTime.slice(0, 5)}` : ''} — {b.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="form-field">
          <label htmlFor="af-priority">Prioridade (opcional)</label>
          <select id="af-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Sem prioridade</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
        </div>

        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={highlighted}
            onChange={(e) => setHighlighted(e.target.checked)}
          />
          Destacar no calendário mensal
        </label>

        {formError && <div className="form-error">{formError}</div>}

        {hasConflicts && (
          <div className="form-error">
            <strong>Horário indisponível.</strong> Já existe atividade neste horário:
            <ul>
              {conflicts.map((c) => (
                <li key={c.id}>
                  {c.startTime?.slice(0, 5)}
                  {c.endTime ? `–${c.endTime.slice(0, 5)}` : ''} — {c.title}
                </li>
              ))}
            </ul>
            Escolha outro horário ou outra duração para salvar.
          </div>
        )}

        <div className="form-actions">
          <button className="btn-ghost" onClick={onClose} disabled={saving}>
            Fechar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving || hasConflicts}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

        {isEditing && (
          <div className="form-actions-secondary">
            {activity!.status !== 'CANCELLED' && (
              <button className="btn-small" onClick={cancelActivity} disabled={saving}>
                Cancelar atividade
              </button>
            )}
            <button className="btn-small btn-danger" onClick={deleteActivity} disabled={saving}>
              Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ActivityForm;