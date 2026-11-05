import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from './api';
import { todayString } from './dateUtils';
import { useDialog } from './DialogProvider';
import './ActivityForm.css';

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

const TYPES: { value: string; label: string }[] = [
  { value: 'TASK', label: 'Tarefa' },
  { value: 'COMMITMENT', label: 'Compromisso' },
  { value: 'POSSIBILITY', label: 'Possibilidade' },
];

const PRIORITIES: { value: string; label: string }[] = [
  { value: '', label: 'Nenhuma' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
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
  const [showSlots, setShowSlots] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Trava a rolagem da pagina enquanto o formulario esta aberto
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function computeEnd(): string {
    if (!hasTime || !startTime) return '';
    if (durationMode === 'none') return '';
    if (durationMode === 'custom') return customEnd;
    const total = toMinutes(startTime) + durationMode;
    return total > 1439 ? '23:59' : fromMinutes(total);
  }

  const endTime = computeEnd();

  const busyActivities = existingActivities
    .filter((other) => {
      if (isEditing && other.id === activity!.id) return false;
      if (other.date !== date) return false;
      if (other.status === 'CANCELLED') return false;
      return Boolean(other.startTime);
    })
    .sort((a, b) => (a.startTime! < b.startTime! ? -1 : 1));

  function isSlotBusy(slot: string): boolean {
    const s = toMinutes(slot);
    return busyActivities.some((other) => {
      const os = toMinutes(other.startTime!.slice(0, 5));
      const oe = other.endTime ? toMinutes(other.endTime.slice(0, 5)) : os + 1;
      return s >= os && s < oe;
    });
  }

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
      return 'Escolha o horário de início ou desligue "Definir horário".';
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

    const path = isEditing ? `/api/activities/${activity!.id}` : '/api/activities';

    try {
      const response = await apiFetch(path, {
        method: isEditing ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });

      if (response.status === 409) {
        setFormError(
          'Este horário já está ocupado por outra atividade. Escolha outro horário e tente de novo.'
        );
        setSaving(false);
        return;
      }

      if (!response.ok) {
        setFormError('O servidor recusou os dados desta atividade. Confira os campos e tente de novo.');
        setSaving(false);
        return;
      }

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
      const response = await apiFetch(`/api/activities/${activity.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

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
      const response = await apiFetch(`/api/activities/${activity.id}`, { method: 'DELETE' });

      if (!response.ok) throw new Error('Erro ao excluir atividade');

      notify('Atividade excluída.', 'success');
      onSaved();
    } catch (err) {
      setFormError('Não conseguimos excluir esta atividade. Verifique sua conexão e tente novamente.');
      setSaving(false);
    }
  }

  const form = (
    <div className="af-overlay" onClick={() => !saving && onClose()}>
      <div
        className="af-card"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="af-header">
          <h2>{isEditing ? 'Editar Atividade' : 'Nova Atividade'}</h2>
          <button className="af-close" onClick={onClose} disabled={saving} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="af-body">
          <div className="af-field">
            <label className="af-label" htmlFor="af-title">
              Título
            </label>
            <input
              id="af-title"
              className="af-input af-title-input"
              type="text"
              placeholder="O que você precisa fazer?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="af-field">
            <label className="af-label" htmlFor="af-description">
              Descrição
            </label>
            <textarea
              id="af-description"
              className="af-textarea"
              rows={2}
              placeholder="Detalhes (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="af-field">
            <label className="af-label" htmlFor="af-date">
              Data
            </label>
            <input
              id="af-date"
              className="af-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="af-field">
            <span className="af-label">Tipo</span>
            <div className="af-segment">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={type === t.value ? 'on' : ''}
                  onClick={() => setType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="af-toggle" onClick={() => setHasTime(!hasTime)}>
            Definir Horário
            <span className={`af-switch ${hasTime ? 'on' : ''}`} />
          </div>

          {hasTime && (
            <div className="af-timebox">
              <div className="af-row">
                <div className="af-field">
                  <label className="af-label" htmlFor="af-start">
                    Início
                  </label>
                  <input
                    id="af-start"
                    className="af-input"
                    type="time"
                    step={300}
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="af-field">
                  <span className="af-label">Fim</span>
                  <input
                    className="af-input"
                    type="time"
                    step={300}
                    value={durationMode === 'custom' ? customEnd : endTime}
                    disabled={durationMode !== 'custom'}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="--:--"
                  />
                </div>
              </div>

              <button type="button" className="af-link" onClick={() => setShowSlots(!showSlots)}>
                {showSlots ? 'Esconder horários rápidos' : 'Escolher em horários rápidos'}
              </button>

              {showSlots && (
                <div className="af-slots">
                  {TIME_SLOTS.map((slot) => {
                    const busy = isSlotBusy(slot);
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={busy}
                        title={busy ? 'Horário ocupado' : undefined}
                        className={`af-chip ${startTime === slot ? 'on' : ''}`}
                        onClick={() => setStartTime(slot)}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="af-field">
                <span className="af-label">Duração</span>
                <div className="af-chips">
                  <button
                    type="button"
                    className={`af-chip ${durationMode === 'none' ? 'on' : ''}`}
                    onClick={() => setDurationMode('none')}
                  >
                    Sem Fim
                  </button>
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      className={`af-chip ${durationMode === d.value ? 'on' : ''}`}
                      onClick={() => setDurationMode(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`af-chip ${durationMode === 'custom' ? 'on' : ''}`}
                    onClick={() => setDurationMode('custom')}
                  >
                    Outro
                  </button>
                </div>
              </div>

              {startTime && (
                <div className="af-summary">
                  Resumo: <strong>{startTime}</strong>
                  {endTime ? ` até ${endTime}` : ' (sem horário de fim)'}
                </div>
              )}

              {busyActivities.length > 0 && (
                <div className="af-summary">
                  Já ocupado neste dia:
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
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

          <div className="af-field">
            <span className="af-label">Prioridade</span>
            <div className="af-chips">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`af-chip ${priority === p.value ? 'on' : ''}`}
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="af-toggle" onClick={() => setHighlighted(!highlighted)}>
            Destacar no Calendário Mensal
            <span className={`af-switch ${highlighted ? 'on' : ''}`} />
          </div>

          {formError && <div className="af-error">{formError}</div>}

          {hasConflicts && (
            <div className="af-error">
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
        </div>

        <div className="af-footer">
          <div className="af-footer-main">
            <button className="af-btn af-btn-ghost" onClick={onClose} disabled={saving}>
              Fechar
            </button>
            <button
              className="af-btn af-btn-primary"
              onClick={save}
              disabled={saving || hasConflicts}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>

          {isEditing && (
            <div className="af-footer-secondary">
              {activity!.status !== 'CANCELLED' && (
                <button className="af-text-btn" onClick={cancelActivity} disabled={saving}>
                  Cancelar Atividade
                </button>
              )}
              <button className="af-text-btn danger" onClick={deleteActivity} disabled={saving}>
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(form, document.body);
}

export default ActivityForm;