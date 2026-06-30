import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { collection, addDoc, onSnapshot, updateDoc, doc, serverTimestamp, query, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { Coffee, ClipboardList, CheckCircle2, BarChart3, Trash2 } from 'lucide-react';
import { db } from './firebase';
import './style.css';

const DRINKS = [
  { id: 'grounded', name: 'The Grounded', desc: 'Hot Vanilla Latte', emoji: '☕' },
  { id: 'watchman', name: 'The Watchman', desc: 'Iced Vanilla Latte', emoji: '🧊' },
  { id: 'daily-bread', name: 'The Daily Bread', desc: 'Americano / Black Coffee', emoji: '☕' },
  { id: 'good-news', name: 'The Good News', desc: 'Mocha Latte', emoji: '🍫' }
];

function formatTime(ts) {
  if (!ts?.toDate) return 'now';
  return ts.toDate().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesSince(ts) {
  if (!ts?.toDate) return 0;
  return Math.max(0, Math.round((Date.now() - ts.toDate().getTime()) / 60000));
}

function App() {
  const [tab, setTab] = useState('order');
  const [orders, setOrders] = useState([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(DRINKS[0]);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'groundedOrders'), orderBy('createdAt', 'asc'));
    return onSnapshot(q, snapshot => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, err => {
      console.error(err);
      setToast('Firebase is not connected yet. Replace firebaseConfig first.');
    });
  }, []);

  const waiting = orders.filter(o => o.status === 'waiting');
  const making = orders.filter(o => o.status === 'making');
  const ready = orders.filter(o => o.status === 'ready');
  const completed = orders.filter(o => o.status === 'completed');
  const active = [...waiting, ...making, ...ready];

  const stats = useMemo(() => {
    const counts = Object.fromEntries(DRINKS.map(d => [d.id, 0]));
    orders.forEach(o => { counts[o.drinkId] = (counts[o.drinkId] || 0) + 1; });
    const avgWait = completed.length ? Math.round(completed.reduce((sum, o) => sum + (o.waitMinutes || 0), 0) / completed.length) : Math.max(2, waiting.length * 2);
    return { counts, total: orders.length, avgWait };
  }, [orders, completed.length, waiting.length]);

  async function placeOrder(e) {
    e.preventDefault();
    if (!name.trim()) return setToast('Please enter a guest name.');
    await addDoc(collection(db, 'groundedOrders'), {
      guestName: name.trim(), drinkId: selected.id, drinkName: selected.name, drinkDesc: selected.desc, note: note.trim(), status: 'waiting', createdAt: serverTimestamp()
    });
    setName(''); setNote(''); setSelected(DRINKS[0]); setToast('Order placed.');
    setTimeout(() => setToast(''), 2200);
  }

  async function setStatus(order, status) {
    const updates = { status };
    if (status === 'making') updates.startedAt = serverTimestamp();
    if (status === 'ready') updates.readyAt = serverTimestamp();
    if (status === 'completed') { updates.completedAt = serverTimestamp(); updates.waitMinutes = minutesSince(order.createdAt); }
    await updateDoc(doc(db, 'groundedOrders', order.id), updates);
  }

  async function resetOrders() {
    if (!confirm('Clear all orders for the event?')) return;
    const snap = await getDocs(collection(db, 'groundedOrders'));
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, 'groundedOrders', d.id))));
  }

  return <div className="app">
    <header className="hero">
      <div className="brand"><Coffee size={30}/><div><h1>GROUNDED</h1><p>Coffee • Conversation • Bible Study</p></div></div>
      <div className="pill">Est. wait: {stats.avgWait} min</div>
    </header>

    <nav className="tabs">
      <button onClick={() => setTab('order')} className={tab==='order'?'active':''}><Coffee size={18}/> Order</button>
      <button onClick={() => setTab('barista')} className={tab==='barista'?'active':''}><ClipboardList size={18}/> Barista</button>
      <button onClick={() => setTab('report')} className={tab==='report'?'active':''}><BarChart3 size={18}/> Report</button>
    </nav>

    {toast && <div className="toast">{toast}</div>}

    {tab === 'order' && <main className="card">
      <h2>Choose a drink</h2>
      <form onSubmit={placeOrder}>
        <div className="drinkGrid">{DRINKS.map(d => <button type="button" key={d.id} onClick={() => setSelected(d)} className={`drink ${selected.id===d.id?'selected':''}`}><span>{d.emoji}</span><strong>{d.name}</strong><small>{d.desc}</small></button>)}</div>
        <label>Guest Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" /></label>
        <label>Notes optional<input value={note} onChange={e => setNote(e.target.value)} placeholder="Oat milk, less sweet, etc." /></label>
        <button className="primary">Place Order</button>
      </form>
    </main>}

    {tab === 'barista' && <main>
      <section className="stats"><div><b>{waiting.length}</b><span>Waiting</span></div><div><b>{making.length}</b><span>Making</span></div><div><b>{ready.length}</b><span>Ready</span></div><div><b>{completed.length}</b><span>Completed</span></div></section>
      <OrderList title="Waiting" orders={waiting} action="Start" onAction={(o)=>setStatus(o,'making')} />
      <OrderList title="Making" orders={making} action="Mark Ready" onAction={(o)=>setStatus(o,'ready')} />
      <OrderList title="Ready for Pickup" orders={ready} action="Complete" onAction={(o)=>setStatus(o,'completed')} />
    </main>}

    {tab === 'report' && <main className="card">
      <h2>End-of-Event Report</h2>
      <section className="reportHero"><b>{stats.total}</b><span>Total Orders</span></section>
      {DRINKS.map(d => <div className="row" key={d.id}><span>{d.name}</span><b>{stats.counts[d.id] || 0}</b></div>)}
      <div className="row"><span>Average Wait</span><b>{stats.avgWait} min</b></div>
      <button className="danger" onClick={resetOrders}><Trash2 size={18}/> Reset Event Orders</button>
    </main>}
  </div>
}

function OrderList({ title, orders, action, onAction }) {
  return <section className="card list"><h2>{title}</h2>{orders.length === 0 ? <p className="empty">No orders here.</p> : orders.map(o => <article className="order" key={o.id}><div><b>{o.guestName}</b><span>{o.drinkName} — {o.drinkDesc}</span>{o.note && <em>{o.note}</em>}<small>Ordered {formatTime(o.createdAt)} • {minutesSince(o.createdAt)} min ago</small></div><button onClick={() => onAction(o)}><CheckCircle2 size={17}/>{action}</button></article>)}</section>
}

createRoot(document.getElementById('root')).render(<App/>);
