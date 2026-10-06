import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function HomePage() {
  const [state, setState] = useState({ loading: true, status: null, error: null });

  useEffect(() => {
    let active = true;
    api
      .health()
      .then((data) => {
        if (active) setState({ loading: false, status: data?.status ?? null, error: null });
      })
      .catch((err) => {
        if (active) setState({ loading: false, status: null, error: err.message });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section>
      <h1>Interview Prep</h1>
      {state.loading && <p>Checking backend…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {state.status && <p>Backend status: {state.status}</p>}
    </section>
  );
}
