import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDown, ArrowUp, BarChart3, Check, CheckCircle2,
  ChevronDown, Clock3, LayoutDashboard, LogOut, Plus, RefreshCw,
  Search, Ticket, Users, X, XCircle
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis, BarChart, Bar
} from "recharts";
import api, { getErrorMessage } from "./api";

function App() {
  const [manager, setManager] = useState(() => {
    try { return JSON.parse(localStorage.getItem("queueflow_manager") || "null"); }
    catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("dashboard");
  const [queues, setQueues] = useState([]);
  const [selectedQueueId, setSelectedQueueId] = useState("");
  const [tokens, setTokens] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showQueueForm, setShowQueueForm] = useState(false);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [search, setSearch] = useState("");

  const selectedQueue = queues.find(q => q.id === selectedQueueId);

  const logout = () => {
    localStorage.removeItem("queueflow_token");
    localStorage.removeItem("queueflow_manager");
    setManager(null); setQueues([]); setTokens([]); setAnalytics(null);
  };

  const loadQueues = useCallback(async () => {
    const { data } = await api.get("/queues");
    setQueues(data);
    setSelectedQueueId(current => current && data.some(q => q.id === current) ? current : (data[0]?.id || ""));
  }, []);

  const loadQueueData = useCallback(async (queueId) => {
    if (!queueId) { setTokens([]); setAnalytics(null); return; }
    const [tokenResponse, analyticsResponse] = await Promise.all([
      api.get(`/tokens/queue/${queueId}`),
      api.get(`/analytics/${queueId}`)
    ]);
    setTokens(tokenResponse.data);
    setAnalytics(analyticsResponse.data);
  }, []);

  useEffect(() => {
    if (!manager) return;
    setLoading(true); setError("");
    loadQueues().catch(e => setError(getErrorMessage(e))).finally(() => setLoading(false));
  }, [manager, loadQueues]);

  useEffect(() => {
    if (!manager || !selectedQueueId) return;
    loadQueueData(selectedQueueId).catch(e => setError(getErrorMessage(e)));
  }, [manager, selectedQueueId, loadQueueData]);

  const refresh = async () => {
    setError(""); setLoading(true);
    try { await loadQueues(); if (selectedQueueId) await loadQueueData(selectedQueueId); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };

  const runAction = async (action, successMessage) => {
    setError(""); setNotice("");
    try {
      await action();
      await loadQueueData(selectedQueueId);
      await loadQueues();
      setNotice(successMessage);
    } catch (e) { setError(getErrorMessage(e)); }
  };

  if (!manager) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} onSuccess={(data) => {
      localStorage.setItem("queueflow_token", data.token);
      localStorage.setItem("queueflow_manager", JSON.stringify(data.manager));
      setManager(data.manager);
    }} />;
  }

  const waiting = tokens.filter(t => t.status === "WAITING").sort((a,b) => a.position - b.position);
  const serving = tokens.find(t => t.status === "SERVING");
  const completed = tokens.filter(t => t.status === "COMPLETED");
  const filteredWaiting = waiting.filter(t =>
    `${t.tokenNumber} ${t.personName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Ticket size={21}/></div><span>Queue<span className="brand-accent">Flow</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>
          <button className={page === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => setPage("dashboard")}><LayoutDashboard size={18}/> Dashboard</button>
          <button className={page === "queues" ? "nav-item active" : "nav-item"} onClick={() => setPage("queues")}><Users size={18}/> Queue management</button>
          <button className={page === "analytics" ? "nav-item active" : "nav-item"} onClick={() => setPage("analytics")}><BarChart3 size={18}/> Analytics</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-mini"><div className="avatar">{manager.name?.[0]?.toUpperCase()}</div><div className="user-meta"><strong>{manager.name}</strong><small>Queue Manager</small></div></div>
          <button className="logout-button" onClick={logout}><LogOut size={17}/> Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><div className="eyebrow">QUEUE MANAGEMENT PLATFORM</div><h1>{page === "dashboard" ? "Overview" : page === "queues" ? "Queue management" : "Analytics"}</h1></div>
          <div className="topbar-actions">
            <span className="online-dot"/> <span className="online-label">System operational</span>
            <button className="icon-button" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button>
          </div>
        </header>

        {error && <div className="alert error"><XCircle size={18}/>{error}<button onClick={() => setError("")}><X size={16}/></button></div>}
        {notice && <div className="alert success"><CheckCircle2 size={18}/>{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}
        {loading && <div className="loading-line"/>}

        {!queues.length && !loading ? (
          <section className="welcome-card">
            <div className="welcome-icon"><Ticket size={28}/></div>
            <h2>Create your first queue</h2>
            <p>Start managing visitors by creating a queue. You can add people, generate tokens and track service performance.</p>
            <button className="primary-button" onClick={() => setShowQueueForm(true)}><Plus size={17}/> Create a queue</button>
          </section>
        ) : page === "dashboard" ? (
          <Dashboard analytics={analytics} waiting={waiting} serving={serving} queues={queues} selectedQueueId={selectedQueueId} setSelectedQueueId={setSelectedQueueId} onAdd={() => setShowTokenForm(true)} onManage={() => setPage("queues")} />
        ) : page === "queues" ? (
          <section className="content-section">
            <div className="section-heading"><div><h2>Manage your queues</h2><p>Create queues and manage the people waiting in each one.</p></div><button className="primary-button" onClick={() => setShowQueueForm(true)}><Plus size={17}/> New queue</button></div>
            <div className="queue-toolbar">
              <label className="select-wrap"><span>Selected queue</span><select value={selectedQueueId} onChange={e => setSelectedQueueId(e.target.value)}>{queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}</select><ChevronDown size={15}/></label>
              {selectedQueue && <span className="muted-text">{waiting.length} people waiting</span>}
            </div>
            {selectedQueue && <QueuePanel queue={selectedQueue} waiting={filteredWaiting} serving={serving} completed={completed} search={search} setSearch={setSearch} onAdd={() => setShowTokenForm(true)}
              onMove={(id,direction) => runAction(() => api.patch(`/tokens/${id}/move`, {direction}), "Queue order updated.")}
              onCancel={(id) => { if (confirm("Cancel this token?")) runAction(() => api.patch(`/tokens/${id}/cancel`), "Token cancelled."); }}
              onCall={() => runAction(() => api.patch(`/tokens/queue/${selectedQueueId}/call-next`), "Next person called for service.")}
              onComplete={(id) => runAction(() => api.patch(`/tokens/${id}/complete`), "Service marked as completed.")}
            />}
          </section>
        ) : (
          <AnalyticsPage analytics={analytics} queues={queues} selectedQueueId={selectedQueueId} setSelectedQueueId={setSelectedQueueId}/>
        )}
      </main>

      {showQueueForm && <QueueModal onClose={() => setShowQueueForm(false)} onCreate={async name => {
        const {data} = await api.post("/queues", {name});
        await loadQueues(); setSelectedQueueId(data.id); setPage("queues"); setShowQueueForm(false); setNotice("Queue created successfully.");
      }} />}
      {showTokenForm && <TokenModal onClose={() => setShowTokenForm(false)} onCreate={async person => {
        await api.post(`/tokens/queue/${selectedQueueId}`, person);
        await loadQueueData(selectedQueueId); await loadQueues(); setShowTokenForm(false); setNotice("Person added and token generated.");
      }} />}
    </div>
  );
}

function AuthScreen({ mode, setMode, onSuccess }) {
  const [form, setForm] = useState({name:"", email:"", password:""});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const {data} = await api.post(`/auth/${mode}`, form);
      onSuccess(data);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return <div className="auth-page">
    <div className="auth-art">
      <div className="brand brand-light"><div className="brand-mark"><Ticket size={21}/></div><span>Queue<span className="brand-accent">Flow</span></span></div>
      <div className="auth-art-content"><div className="art-kicker">SMARTER WAITING STARTS HERE</div><h1>Every queue.<br/><span>Under control.</span></h1><p>A simpler way to organize visitors, manage service flow and understand your queue performance.</p><div className="art-stat"><div className="art-stat-icon"><Activity/></div><div><strong>One clear view</strong><small>From first token to completed service</small></div></div></div>
      <div className="auth-footer">QUEUEFLOW · QUEUE MANAGEMENT</div>
    </div>
    <div className="auth-form-side"><form className="auth-card" onSubmit={submit}>
      <div className="eyebrow">MANAGER WORKSPACE</div><h2>{register ? "Create your account" : "Welcome back"}</h2><p className="form-subtitle">{register ? "Set up your manager account to get started." : "Sign in to continue to your dashboard."}</p>
      {error && <div className="alert error">{error}</div>}
      {register && <label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
      <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
      <label>Password<input required minLength={register ? 8 : 1} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={register ? "At least 8 characters" : "Enter your password"}/></label>
      <button className="primary-button full-button" disabled={busy}>{busy ? "Please wait..." : register ? "Create account" : "Sign in"}</button>
      <div className="switch-auth">{register ? "Already have an account?" : "New to QueueFlow?"} <button type="button" onClick={()=>{setError("");setMode(register ? "login" : "register");}}> {register ? "Sign in" : "Create an account"}</button></div>
    </form></div>
  </div>;
}

function Dashboard({analytics, waiting, serving, queues, selectedQueueId, setSelectedQueueId, onAdd, onManage}) {
  return <div className="content-section">
    <div className="section-heading"><div><h2>Good day, here's your queue snapshot</h2><p>Monitor activity and keep your service moving.</p></div>
      <label className="select-wrap compact-select"><select value={selectedQueueId} onChange={e=>setSelectedQueueId(e.target.value)}>{queues.map(q=><option key={q.id} value={q.id}>{q.name}</option>)}</select><ChevronDown size={15}/></label>
    </div>
    <div className="stats-grid">
      <Stat icon={<Users/>} label="Waiting now" value={analytics?.waiting ?? waiting.length} tone="blue" note="People in line"/>
      <Stat icon={<Activity/>} label="Currently serving" value={analytics?.serving ?? (serving?1:0)} tone="purple" note="Active service"/>
      <Stat icon={<CheckCircle2/>} label="Completed" value={analytics?.completed ?? 0} tone="green" note="All-time completed"/>
      <Stat icon={<Clock3/>} label="Average wait" value={`${analytics?.averageWaitMinutes ?? 0} min`} tone="orange" note="For called tokens"/>
    </div>
    <div className="dashboard-grid">
      <div className="panel chart-panel"><div className="panel-heading"><div><h3>Queue activity</h3><p>Tokens created over the last 7 days</p></div><span className="chart-legend"><i/> Tokens</span></div>
        <div className="chart-area">{analytics?.trend?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics.trend}><defs><linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5378ed" stopOpacity={0.25}/><stop offset="100%" stopColor="#5378ed" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:"#8b93a4",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#8b93a4",fontSize:12}}/><Tooltip/><Area type="monotone" dataKey="tokens" stroke="#5378ed" strokeWidth={2.5} fill="url(#fillTokens)"/></AreaChart></ResponsiveContainer> : <EmptyChart/>}</div>
      </div>
      <div className="panel quick-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Keep the queue moving</p></div></div>
        <button className="quick-action" onClick={onAdd}><span className="quick-icon blue-bg"><Plus/></span><span><strong>Add a person</strong><small>Generate a new token</small></span><span className="quick-arrow">→</span></button>
        <button className="quick-action" onClick={onManage}><span className="quick-icon purple-bg"><Users/></span><span><strong>Manage queue</strong><small>Reorder or call next</small></span><span className="quick-arrow">→</span></button>
        <div className="serving-highlight"><div className="serving-label"><span className="pulse-dot"/> NOW SERVING</div><strong>{serving ? `T${String(serving.tokenNumber).padStart(3,"0")}` : "No active token"}</strong><small>{serving ? serving.personName : "Call the next person when ready"}</small></div>
      </div>
    </div>
  </div>;
}

function Stat({icon,label,value,tone,note}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>;
}

function QueuePanel({queue, waiting, serving, completed, search, setSearch, onAdd, onMove, onCancel, onCall, onComplete}) {
  return <div className="panel queue-panel">
    <div className="queue-panel-head"><div><div className="queue-title-line"><h3>{queue.name}</h3><span className="status-pill active-pill">Active queue</span></div><p>Manage token order and service status.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17}/> Add person</button></div>
    <div className="queue-summary">
      <div><span>WAITING</span><strong>{waiting.length}</strong></div><div><span>SERVING</span><strong>{serving ? 1 : 0}</strong></div><div><span>COMPLETED</span><strong>{completed.length}</strong></div>
      <button className="call-button" disabled={!waiting.length || !!serving} onClick={onCall}><Users size={17}/> {serving ? "Complete current service first" : "Call next"}</button>
    </div>
    {serving && <div className="current-serving"><div className="serving-avatar"><Users size={19}/></div><div className="serving-person"><small>CURRENTLY SERVING</small><strong>{serving.personName}</strong><span>Token T{String(serving.tokenNumber).padStart(3,"0")}</span></div><button className="complete-button" onClick={()=>onComplete(serving.id)}><Check size={16}/> Complete service</button></div>}
    <div className="table-heading"><div><h3>Waiting list</h3><p>{waiting.length} people are waiting</p></div><div className="search-box"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search token or name"/></div></div>
    <div className="token-table-wrap"><table className="token-table"><thead><tr><th>POSITION</th><th>TOKEN</th><th>PERSON</th><th>ADDED</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
      {waiting.map((t,index)=><tr key={t.id}><td><span className="position-badge">{t.position}</span></td><td className="token-id">T{String(t.tokenNumber).padStart(3,"0")}</td><td><strong>{t.personName}</strong>{t.phone && <small className="table-sub">{t.phone}</small>}</td><td>{new Date(t.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</td><td><span className="status-pill waiting-pill">Waiting</span></td><td><div className="row-actions"><button title="Move up" disabled={index===0} onClick={()=>onMove(t.id,"up")}><ArrowUp size={15}/></button><button title="Move down" disabled={index===waiting.length-1} onClick={()=>onMove(t.id,"down")}><ArrowDown size={15}/></button><button className="cancel-action" title="Cancel token" onClick={()=>onCancel(t.id)}><X size={15}/></button></div></td></tr>)}
      {!waiting.length && <tr><td colSpan="6"><div className="empty-table"><Ticket size={25}/><strong>{search ? "No matching tokens" : "No one is waiting"}</strong><span>{search ? "Try another search." : "Add a person to generate the first token."}</span></div></td></tr>}
    </tbody></table></div>
  </div>;
}

function AnalyticsPage({analytics,queues,selectedQueueId,setSelectedQueueId}) {
  return <div className="content-section">
    <div className="section-heading"><div><h2>Queue analytics</h2><p>Understand service performance and queue activity.</p></div><label className="select-wrap compact-select"><select value={selectedQueueId} onChange={e=>setSelectedQueueId(e.target.value)}>{queues.map(q=><option key={q.id} value={q.id}>{q.name}</option>)}</select><ChevronDown size={15}/></label></div>
    <div className="stats-grid">
      <Stat icon={<Clock3/>} label="Average wait time" value={`${analytics?.averageWaitMinutes ?? 0} min`} tone="orange" note="Created to called"/>
      <Stat icon={<Activity/>} label="Average service time" value={`${analytics?.averageServiceMinutes ?? 0} min`} tone="purple" note="Called to completed"/>
      <Stat icon={<CheckCircle2/>} label="People completed" value={analytics?.completed ?? 0} tone="green" note="Completed tokens"/>
      <Stat icon={<XCircle/>} label="Cancelled tokens" value={analytics?.cancelled ?? 0} tone="blue" note="Cancelled tokens"/>
    </div>
    <div className="panel chart-panel analytics-chart"><div className="panel-heading"><div><h3>Daily token volume</h3><p>Number of tokens generated per day over the last 7 days</p></div></div>
      <div className="chart-area tall">{analytics?.trend?.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.trend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f5"/><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill:"#8b93a4",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#8b93a4",fontSize:12}}/><Tooltip/><Bar dataKey="tokens" fill="#5378ed" radius={[6,6,0,0]} maxBarSize={42}/></BarChart></ResponsiveContainer> : <EmptyChart/>}</div>
    </div>
    <div className="analytics-note"><Activity size={18}/><span>Wait time is calculated from token creation until the manager calls the token. Service time is calculated from call time until completion.</span></div>
  </div>;
}

function EmptyChart(){return <div className="empty-chart"><BarChart3 size={28}/><span>Analytics will appear as tokens move through your queue.</span></div>;}

function QueueModal({onClose,onCreate}) {
  const [name,setName]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{await onCreate(name);}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}};
  return <Modal title="Create a queue" onClose={onClose}><form onSubmit={submit}><p className="modal-description">Give your queue a clear name so you can identify it easily.</p><label>Queue name<input autoFocus required maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. General Consultation"/></label>{error&&<div className="alert error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Creating...":"Create queue"}</button></div></form></Modal>;
}

function TokenModal({onClose,onCreate}) {
  const [personName,setPersonName]=useState(""); const [phone,setPhone]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{await onCreate({personName,phone});}catch(e){setError(getErrorMessage(e));}finally{setBusy(false);}};
  return <Modal title="Add a person" onClose={onClose}><form onSubmit={submit}><p className="modal-description">A unique token number will be generated automatically.</p><label>Person's name<input autoFocus required maxLength={80} value={personName} onChange={e=>setPersonName(e.target.value)} placeholder="Enter full name"/></label><label>Phone number <span className="optional">(optional)</span><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Enter phone number"/></label>{error&&<div className="alert error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy?"Generating...":"Generate token"}</button></div></form></Modal>;
}

function Modal({title,onClose,children}) {
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[onClose]);
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</div></div>;
}

export default App;
