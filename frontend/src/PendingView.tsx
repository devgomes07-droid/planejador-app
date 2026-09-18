import { useEffect, useState } from 'react';

interface PendingItem {
  id: number;
  title: string;
  description: string | null;
  priority: string | null;
  status: string;
}

function PendingView() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [convertingId, setConvertingId] = useState<number | null>(null);
  const [convertDate, setConvertDate] = useState('');
  const [convertStartTime, setConvertStartTime] = useState('');
  const [convertType, setConvertType] = useState('TASK');

  function loadItems() {
    setLoading(true);
    setError(null);
    fetch('http://localhost:8080/api/pending-items?userId=1')
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
    if (!newTitle.trim()) return;

    try {
      const response = await fetch('http://localhost:8080/api/pending-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 1, title: newTitle }),
      });

      if (!response.ok) throw new Error('Erro ao criar pendência');

      setNewTitle('');
      loadItems();
    } catch (err) {
      alert('Não conseguimos salvar esta pendência. Verifique sua conexão e tente novamente.');
    }
  }

  async function markResolved(id: number) {
    try {
      const response = await fetch(
        `http://localhost:8080/api/pending-items/${id}/status?userId=1`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'COMPLETED' }),
        }
      );

      if (!response.ok) throw new Error('Erro ao atualizar pendência');

      loadItems();
    } catch (err) {
      alert('Não conseguimos atualizar esta pendência. Verifique sua conexão e tente novamente.');
    }
  }

  async function deleteItem(id: number) {
    try {
      const response = await fetch(`http://localhost:8080/api/pending-items/${id}?userId=1`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir pendência');

      loadItems();
    } catch (err) {
      alert('Não conseguimos excluir esta pendência. Verifique sua conexão e tente novamente.');
    }
  }

  function startConvert(id: number) {
    setConvertingId(id);
    setConvertDate('');
    setConvertStartTime('');
    setConvertType('TASK');
  }

  async function confirmConvert() {
    if (!convertingId || !convertDate) {
      alert('Escolha uma data para converter esta pendência.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (convertDate < todayStr) {
      alert('A data não pode ser no passado. Escolha hoje ou uma data futura.');
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/pending-items/${convertingId}/convert?userId=1`,
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

      if (!response.ok) throw new Error('Erro ao converter pendência');

      setConvertingId(null);
      loadItems();
      alert('Pendência convertida em atividade com sucesso!');
    } catch (err) {
      alert('Não conseguimos converter esta pendência. Verifique sua conexão e tente novamente.');
    }
  }

  if (loading) return <p>Carregando pendências...</p>;
  if (error) return <p>Erro: {error}</p>;

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h2>Pendências</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Nova pendência..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createPendingItem()}
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={createPendingItem}>Adicionar</button>
      </div>

      {items.length === 0 && <p style={{ color: '#999' }}>Nenhuma pendência no momento.</p>}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => markResolved(item.id)}
              />
              <strong style={{ flex: 1 }}>{item.title}</strong>
              <button onClick={() => startConvert(item.id)}>Converter</button>
              <button onClick={() => deleteItem(item.id)}>Excluir</button>
            </div>

            {item.description && (
              <p style={{ margin: '4px 0 0 28px', fontSize: 13, color: '#666' }}>
                {item.description}
              </p>
            )}

            {convertingId === item.id && (
              <div
                style={{
                  marginTop: 10,
                  marginLeft: 28,
                  padding: 10,
                  backgroundColor: '#f7f7f7',
                  borderRadius: 6,
                }}
              >
                <p style={{ margin: '0 0 8px 0', fontSize: 13 }}>
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
                    value={convertStartTime}
                    onChange={(e) => setConvertStartTime(e.target.value)}
                  />
                  <select value={convertType} onChange={(e) => setConvertType(e.target.value)}>
                    <option value="TASK">Tarefa</option>
                    <option value="COMMITMENT">Compromisso</option>
                    <option value="POSSIBILITY">Possibilidade</option>
                  </select>
                  <button onClick={confirmConvert}>Confirmar</button>
                  <button onClick={() => setConvertingId(null)}>Cancelar</button>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: 11, color: '#999' }}>
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