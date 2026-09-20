import { useEffect, useState } from 'react';
import { todayString } from './dateUtils';
import { API_URL, USER_ID } from './api';
import { useDialog } from './DialogProvider';

interface PendingItem {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
}

function PendingView() {
  const { confirm, notify } = useDialog();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertDate, setConvertDate] = useState('');
  const [convertStartTime, setConvertStartTime] = useState('');
  const [convertType, setConvertType] = useState('TASK');
  const [busy, setBusy] = useState(false);

  function loadItems() {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/pending-items?userId=${USER_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao buscar pendências');
        return res.json();
      })
      .then((data: PendingItem[]) => {
        setItems(data.filter((item) => item.status !== 'COMPLETED'));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function createPendingItem() {
    if (!newTitle.trim() || busy) return;
    setBusy(true);

    try {
      const response = await fetch(`${API_URL}/api/pending-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: USER_ID, title: newTitle }),
      });

      if (!response.ok) throw new Error('Erro ao criar pendência');

      setNewTitle('');
      notify('Pendência adicionada.', 'success');
      loadItems();
    } catch (err) {
      notify(
        'Não conseguimos salvar esta pendência. Verifique sua conexão e tente novamente.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  async function markResolved(id: number) {
    if (busy) return;
    setBusy(true);

    try {
      const response = await fetch(
        `${API_URL}/api/pending-items/${id}/status?userId=${USER_ID}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar pendência');

      notify('Pendência resolvida.', 'success');
      loadItems();
    } catch (err) {
      notify(
        'Não conseguimos atualizar esta pendência. Verifique sua conexão e tente novamente.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(item: PendingItem) {
    if (busy) return;

    const ok = await confirm({
      title: 'Excluir esta pendência?',
      message: `"${item.title}" será removida para sempre. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Sim, excluir',
      cancelLabel: 'Voltar',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);

    try {
      const response = await fetch(
        `${API_URL}/api/pending-items/${item.id}?userId=${USER_ID}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Erro ao excluir pendência');

      notify('Pendência excluída.', 'success');
      loadItems();
    } catch (err) {
      notify(
        'Não conseguimos excluir esta pendência. Verifique sua conexão e tente novamente.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  function startConvert(id: number) {
    setConvertingId(id);
    setConvertDate('');
    setConvertStartTime('');
    setConvertType('TASK');
  }

  async function confirmConvert() {
    if (busy) return;

    if (!convertingId || !convertDate) {
      notify('Escolha uma data para converter esta pendência.', 'error');
      return;
    }

    if (convertDate < todayString()) {
      notify('A data não pode ser no passado. Escolha hoje ou uma data futura.', 'error');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `${API_URL}/api/pending-items/${convertingId}/convert?userId=${USER_ID}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: convertDate,
            startTime: convertStartTime ? `${convertStartTime}:00` : null,
            type: convertType,
          }),
        }
      );

      if (response.status === 409) {
        notify(
          'Esse horário já está ocupado por outra atividade. Escolha outro horário.',
          'error'
        );
        return;
      }

      if (!response.ok) throw new Error('Erro ao converter pendência');

      setConvertingId(null);
      notify('Pendência convertida em atividade com sucesso!', 'success');
      loadItems();
    } catch (err) {
      notify(
        'Não conseguimos converter esta pendência. Verifique sua conexão e tente novamente.',
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p>Carregando pendências...</p>;
  if (error) return <p>Erro: {error}</p>;

  const todayStr = todayString();

  return (
    <div className="app-container" style={{ maxWidth: 600 }}>
      <h2 style={{ color: 'var(--color-text-primary)' }}>Pendências</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Nova pendência..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createPendingItem()}
          style={{ flex: 1, minWidth: 150 }}
        />
        <button className="btn-primary" onClick={createPendingItem} disabled={busy}>
          Adicionar
        </button>
      </div>

      {items.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)' }}>Nenhuma pendência no momento.</p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 10,
              backgroundColor: 'var(--color-surface)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="checkbox"
                checked={false}
                disabled={busy}
                onChange={() => markResolved(item.id)}
              />
              <strong style={{ flex: 1, color: 'var(--color-text-primary)', minWidth: 100 }}>
                {item.title}
              </strong>
              <button className="btn-small" onClick={() => startConvert(item.id)} disabled={busy}>
                Converter
              </button>
              <button
                className="btn-small btn-danger"
                onClick={() => deleteItem(item)}
                disabled={busy}
              >
                Excluir
              </button>
            </div>

            {item.description && (
              <p style={{ margin: '6px 0 0 28px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                {item.description}
              </p>
            )}

            {convertingId === item.id && (
              <div
                style={{
                  marginTop: 12,
                  marginLeft: 28,
                  padding: 12,
                  backgroundColor: 'var(--color-surface-alt)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <p style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Transformar em atividade:
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={convertDate}
                    min={todayStr}
                    onChange={(e) => setConvertDate(e.target.value)}
                  />
                  <input
                    type="time"
                    step={300}
                    value={convertStartTime}
                    onChange={(e) => setConvertStartTime(e.target.value)}
                  />
                  <select value={convertType} onChange={(e) => setConvertType(e.target.value)}>
                    <option value="TASK">Tarefa</option>
                    <option value="COMMITMENT">Compromisso</option>
                    <option value="POSSIBILITY">Possibilidade</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn-small btn-primary" onClick={confirmConvert} disabled={busy}>
                    Confirmar
                  </button>
                  <button
                    className="btn-small btn-ghost"
                    onClick={() => setConvertingId(null)}
                    disabled={busy}
                  >
                    Cancelar
                  </button>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Horário é opcional — deixe em branco se não tiver hora definida.
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PendingView;