import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Plus, RefreshCw, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, X, Save, ChevronDown,
} from 'lucide-react';
import { shiftService } from '../../../services/newServices';
import adminService from '../../../services/adminService';
import useBranch     from '../../../hooks/useBranch';
import usePermission from '../../../hooks/usePermission';

const SHIFT_TYPES  = ['MORNING','AFTERNOON','EVENING','NIGHT','FULL_DAY'];
const STATUS_CFG   = {
  SCHEDULED:   { bg:'#f0f9ff', color:'#0369a1' },
  CONFIRMED:   { bg:'#f0fdf4', color:'#15803d' },
  IN_PROGRESS: { bg:'#e8f0fd', color:'#0052b3' },
  COMPLETED:   { bg:'#f8fafc', color:'#475569' },
  ABSENT:      { bg:'#fef2f2', color:'#dc2626' },
  CANCELLED:   { bg:'#f1f5f9', color:'#94a3b8' },
};
const SHIFT_COLORS = { MORNING:'#fbbf24', AFTERNOON:'#34d399', EVENING:'#3385e0', NIGHT:'#94a3b8', FULL_DAY:'#0061d2' };

const isoWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay(); const diff = (day===0?-6:1) - day;
  d.setDate(d.getDate() + diff); d.setHours(0,0,0,0); return d;
};
const addDays = (date, n) => { const d=new Date(date); d.setDate(d.getDate()+n); return d; };
const fmt = (d) => d.toISOString().split('T')[0];
const dayName = (d) => ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][d.getDay()===0?6:d.getDay()-1];
const monthDay = (d) => `${d.toLocaleString('default',{month:'short'})} ${d.getDate()}`;

const emptyForm = () => ({ userId:'', shiftDate:'', startTime:'08:00', endTime:'16:00', type:'MORNING', notes:'' });

export default function ShiftScheduler() {
  const { branchId } = useBranch();
  const { canApprove } = usePermission();
  const [shifts,   setShifts]   = useState([]);
  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const [weekStart,setWeekStart]= useState(isoWeekStart(new Date()));
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(emptyForm());
  const [saving,   setSaving]   = useState(false);

  const weekDays = Array.from({length:7},(_,i)=>addDays(weekStart,i));
  const from = fmt(weekDays[0]);
  const to   = fmt(weekDays[6]);

  const load = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        shiftService.getAll(branchId, from, to),
        adminService.getAllUsers({ branchId }),
      ]);
      setShifts(sRes.data || []);
      setStaff(uRes.data || []);
    } catch { setError('Failed to load schedule'); }
    finally { setLoading(false); }
  }, [branchId, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (success) { const t=setTimeout(()=>setSuccess(null),3000); return ()=>clearTimeout(t); } }, [success]);

  const getShiftsForStaffAndDay = (userId, dayStr) => shifts.filter(s => s.userId===userId && s.shiftDate===dayStr);

  const handleSave = async () => {
    if (!form.userId||!form.shiftDate) { setError('Select staff and date'); return; }
    setSaving(true);
    try {
      await shiftService.create({ ...form, branchId, userId:Number(form.userId) });
      setSuccess('Shift created'); setModal(false); setForm(emptyForm()); load();
    } catch (e) { setError(e.response?.data||'Failed to create shift'); }
    finally { setSaving(false); }
  };

  const handleClockIn  = async (id) => { try { await shiftService.clockIn(id);  setSuccess('Clocked in');  load(); } catch(e){setError(e.response?.data||'Error');} };
  const handleClockOut = async (id) => { try { await shiftService.clockOut(id); setSuccess('Clocked out'); load(); } catch(e){setError(e.response?.data||'Error');} };
  const handleDelete   = async (id) => { if(!window.confirm('Delete shift?'))return; try{await shiftService.delete(id);load();}catch(e){setError(e.response?.data||'Error');} };

  // Summary counts
  const todayStr = fmt(new Date());
  const todayShifts = shifts.filter(s=>s.shiftDate===todayStr);
  const totalHours = shifts.reduce((s,sh)=>s+(sh.hoursWorked||0),0);

  return (
    <div className="ss-page">
      <div className="ss-header">
        <div>
          <h2 className="ss-title"><Clock size={20}/> Shift Scheduler</h2>
          <p className="ss-sub">Weekly staff roster — {from} to {to}</p>
        </div>
        <div className="ss-header-right">
          <div className="ss-week-nav">
            <button className="ss-week-btn" onClick={()=>setWeekStart(addDays(weekStart,-7))}><ChevronLeft size={16}/></button>
            <span className="ss-week-label">Week of {monthDay(weekStart)}</span>
            <button className="ss-week-btn" onClick={()=>setWeekStart(addDays(weekStart,7))}><ChevronRight size={16}/></button>
          </div>
          <button className="ss-btn-ghost" onClick={load} disabled={loading}><RefreshCw size={14} className={loading?'ss-spin':''}/></button>
          {canApprove && <button className="ss-btn-primary" onClick={()=>{setForm(emptyForm());setModal(true);}}><Plus size={14}/> Add Shift</button>}
        </div>
      </div>

      {error   && <div className="ss-banner error"><AlertTriangle size={14}/>{error}<button onClick={()=>setError(null)}>✕</button></div>}
      {success && <div className="ss-banner success"><CheckCircle size={14}/>{success}</div>}

      {/* Week summary */}
      <div className="ss-summary">
        {[
          { label:"Today's Shifts",  val: todayShifts.length },
          { label:'Week Total Shifts',val: shifts.length },
          { label:'Hours Logged',    val: totalHours.toFixed(1)+'h' },
          { label:'Staff Scheduled', val: [...new Set(shifts.map(s=>s.userId))].length },
        ].map((k,i)=>(
          <div key={i} className="ss-sum-card">
            <div className="ss-sum-val">{k.val}</div>
            <div className="ss-sum-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Weekly grid */}
      {loading ? (
        <div className="ss-loading"><RefreshCw size={22} className="ss-spin"/><p>Loading schedule...</p></div>
      ) : (
        <div className="ss-grid-wrap">
          <table className="ss-grid">
            <thead>
              <tr>
                <th className="ss-th-staff">Staff</th>
                {weekDays.map(d => (
                  <th key={fmt(d)} className={`ss-th-day ${fmt(d)===todayStr?'ss-today':''}`}>
                    <div>{dayName(d)}</div>
                    <div className="ss-th-date">{monthDay(d)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={8} className="ss-empty-row">No staff found for this branch</td></tr>
              ) : staff.map(u => (
                <tr key={u.id} className="ss-row">
                  <td className="ss-td-staff">
                    <div className="ss-staff-avatar">{u.fullName?.charAt(0)||u.username?.charAt(0)||'?'}</div>
                    <div>
                      <div className="ss-staff-name">{u.fullName||u.username}</div>
                      <div className="ss-staff-role">{u.role?.replace('ROLE_','')}</div>
                    </div>
                  </td>
                  {weekDays.map(d => {
                    const dayStr   = fmt(d);
                    const dayShifts= getShiftsForStaffAndDay(u.id, dayStr);
                    return (
                      <td key={dayStr} className={`ss-td-day ${dayStr===todayStr?'ss-today-col':''}`}>
                        {dayShifts.map(sh => (
                          <div key={sh.id} className="ss-shift-chip"
                            style={{borderLeft:`3px solid ${SHIFT_COLORS[sh.type]||'#94a3b8'}`}}>
                            <div className="ss-shift-time">{sh.startTime?.slice(0,5)} – {sh.endTime?.slice(0,5)}</div>
                            <div className="ss-shift-type" style={{color:SHIFT_COLORS[sh.type]}}>{sh.type}</div>
                            <div className="ss-shift-actions">
                              {sh.status==='SCHEDULED'||sh.status==='CONFIRMED' ? (
                                <button className="ss-clock-btn in" onClick={()=>handleClockIn(sh.id)} title="Clock In">▶</button>
                              ) : sh.status==='IN_PROGRESS' ? (
                                <button className="ss-clock-btn out" onClick={()=>handleClockOut(sh.id)} title="Clock Out">⏹</button>
                              ) : null}
                              {sh.hoursWorked ? <span className="ss-hours">{sh.hoursWorked}h</span> : null}
                              {canApprove && <button className="ss-del-btn" onClick={()=>handleDelete(sh.id)} title="Delete">✕</button>}
                            </div>
                            <span className="ss-shift-status" style={{background:STATUS_CFG[sh.status]?.bg,color:STATUS_CFG[sh.status]?.color}}>
                              {sh.status?.replace('_',' ')}
                            </span>
                          </div>
                        ))}
                        {canApprove && (
                          <button className="ss-add-day-btn" onClick={()=>{setForm({...emptyForm(),userId:String(u.id),shiftDate:dayStr});setModal(true);}}>+</button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Shift Modal */}
      {modal && (
        <div className="ss-overlay" onClick={()=>setModal(false)}>
          <div className="ss-modal" onClick={e=>e.stopPropagation()}>
            <div className="ss-modal-hdr"><h3>Add Shift</h3><button className="ss-modal-close" onClick={()=>setModal(false)}><X size={15}/></button></div>
            <div className="ss-modal-body">
              <div className="ss-form-grid">
                <div>
                  <label className="ss-label">Staff *</label>
                  <div className="ss-sel-wrap">
                    <select className="ss-select" value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))}>
                      <option value="">— Select staff —</option>
                      {staff.map(u=><option key={u.id} value={u.id}>{u.fullName||u.username}</option>)}
                    </select>
                    <ChevronDown size={12} className="ss-sel-icon"/>
                  </div>
                </div>
                <div>
                  <label className="ss-label">Date *</label>
                  <input className="ss-input" type="date" value={form.shiftDate} onChange={e=>setForm(f=>({...f,shiftDate:e.target.value}))}/>
                </div>
                <div>
                  <label className="ss-label">Start Time</label>
                  <input className="ss-input" type="time" value={form.startTime} onChange={e=>setForm(f=>({...f,startTime:e.target.value}))}/>
                </div>
                <div>
                  <label className="ss-label">End Time</label>
                  <input className="ss-input" type="time" value={form.endTime} onChange={e=>setForm(f=>({...f,endTime:e.target.value}))}/>
                </div>
                <div>
                  <label className="ss-label">Shift Type</label>
                  <div className="ss-sel-wrap">
                    <select className="ss-select" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      {SHIFT_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={12} className="ss-sel-icon"/>
                  </div>
                </div>
                <div>
                  <label className="ss-label">Notes</label>
                  <input className="ss-input" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional"/>
                </div>
              </div>
            </div>
            <div className="ss-modal-ftr">
              <button className="ss-btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
              <button className="ss-btn-primary" onClick={handleSave} disabled={saving}>
                {saving?<RefreshCw size={13} className="ss-spin"/>:<Save size={13}/>} Create Shift
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ss-page{max-width:1200px;font-family:'DM Sans',sans-serif;}
        .ss-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
        .ss-title{display:flex;align-items:center;gap:8px;font-size:20px;font-weight:700;color:#1f2937;margin:0 0 3px;}
        .ss-sub{font-size:12px;color:#9ca3af;margin:0;}
        .ss-header-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
        .ss-week-nav{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e5e7eb;border-radius:9px;padding:4px 10px;}
        .ss-week-btn{background:none;border:none;cursor:pointer;color:#6b7280;display:flex;align-items:center;padding:2px;}
        .ss-week-btn:hover{color:#1f2937;}
        .ss-week-label{font-size:13px;font-weight:600;color:#1f2937;white-space:nowrap;}
        .ss-btn-primary{display:flex;align-items:center;gap:6px;padding:8px 14px;background:#e8f0fd;border:1px solid #b3ccf5;border:1px solid #b3ccf5;color:#0052b3;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;}
        .ss-btn-ghost{display:flex;align-items:center;gap:5px;padding:7px 12px;background:#f0f2f7;border:1px solid #e2e6ef;border-radius:8px;font-size:12px;color:#374151;cursor:pointer;}
        .ss-banner{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:13px;margin-bottom:12px;}
        .ss-banner button{margin-left:auto;background:none;border:none;cursor:pointer;font-size:15px;}
        .ss-banner.error{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;}
        .ss-banner.success{background:#f0fdf4;border:1px solid #bbf7d0;color:#15803d;}
        .ss-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
        @media(max-width:700px){.ss-summary{grid-template-columns:repeat(2,1fr);}}
        .ss-sum-card{background:#fff;border-radius:10px;border:1px solid #e5e7eb;padding:12px;text-align:center;}
        .ss-sum-val{font-size:20px;font-weight:800;color:#1f2937;margin-bottom:3px;}
        .ss-sum-lbl{font-size:11px;color:#9ca3af;}
        .ss-grid-wrap{overflow:auto;border-radius:12px;border:1px solid #e5e7eb;background:#fff;}
        .ss-grid{width:100%;border-collapse:collapse;min-width:900px;}
        .ss-grid thead tr{background:#f8fafc;border-bottom:1px solid #e5e7eb;}
        .ss-th-staff{padding:10px 14px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;width:140px;position:sticky;left:0;background:#f8fafc;z-index:2;}
        .ss-th-day{padding:8px 10px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;min-width:110px;}
        .ss-th-day div:first-child{text-transform:uppercase;letter-spacing:.5px;}
        .ss-th-date{font-size:12px;font-weight:600;color:#374151;margin-top:2px;}
        .ss-th-day.ss-today{background:#e8f0fd;}
        .ss-row{border-bottom:1px solid #f1f5f9;}
        .ss-row:last-child{border-bottom:none;}
        .ss-td-staff{padding:12px 14px;vertical-align:top;position:sticky;left:0;background:#fff;z-index:1;display:flex;align-items:center;gap:8px;}
        .ss-row:hover .ss-td-staff{background:#fafafa;}
        .ss-staff-avatar{width:28px;height:28px;background:linear-gradient(135deg,#0061d2,#3385e0);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0052b3;flex-shrink:0;}
        .ss-staff-name{font-size:12px;font-weight:600;color:#1f2937;}
        .ss-staff-role{font-size:10px;color:#9ca3af;text-transform:capitalize;}
        .ss-td-day{padding:6px;vertical-align:top;min-height:60px;transition:background .15s;}
        .ss-td-day.ss-today-col{background:#fffbeb;}
        .ss-shift-chip{background:#fff;border-radius:8px;padding:6px 8px;margin-bottom:4px;border:1px solid #e5e7eb;border-left-width:3px;}
        .ss-shift-time{font-size:10px;font-weight:700;color:#374151;}
        .ss-shift-type{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px;}
        .ss-shift-actions{display:flex;align-items:center;gap:4px;margin-bottom:3px;}
        .ss-clock-btn{width:18px;height:18px;border-radius:4px;border:none;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;}
        .ss-clock-btn.in{background:#dcfce7;color:#15803d;}
        .ss-clock-btn.out{background:#fee2e2;color:#dc2626;}
        .ss-hours{font-size:9px;color:#6b7280;font-weight:600;}
        .ss-del-btn{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:10px;margin-left:auto;}
        .ss-del-btn:hover{color:#dc2626;}
        .ss-shift-status{font-size:8.5px;font-weight:700;padding:1.5px 5px;border-radius:4px;text-transform:uppercase;letter-spacing:.3px;}
        .ss-add-day-btn{width:100%;padding:3px;background:none;border:1px dashed #e5e7eb;border-radius:6px;font-size:13px;cursor:pointer;color:#d1d5db;transition:all .15s;margin-top:2px;}
        .ss-add-day-btn:hover{border-color:#0061d2;color:#0061d2;background:#e8f0fd;}
        .ss-empty-row{text-align:center;padding:30px;color:#9ca3af;font-size:13px;}
        .ss-loading{display:flex;align-items:center;justify-content:center;gap:10px;padding:48px;color:#9ca3af;}
        .ss-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px;}
        .ss-modal{background:#fff;border-radius:14px;width:100%;max-width:480px;overflow:hidden;}
        .ss-modal-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e5e7eb;}
        .ss-modal-hdr h3{margin:0;font-size:15px;font-weight:700;color:#1f2937;}
        .ss-modal-close{background:#e8f0fd;border:1px solid #b3ccf5;border-radius:7px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0052b3;}
        .ss-modal-body{padding:18px 20px;}
        .ss-modal-ftr{display:flex;gap:10px;justify-content:flex-end;padding:14px 20px;border-top:1px solid #e5e7eb;}
        .ss-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
        .ss-label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:5px;}
        .ss-sel-wrap{position:relative;}
        .ss-select{appearance:none;width:100%;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:8px 28px 8px 12px;font-size:13px;color:#1f2937;outline:none;cursor:pointer;}
        .ss-select:focus{border-color:#0061d2;}
        .ss-sel-icon{position:absolute;right:8px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none;}
        .ss-input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;outline:none;font-family:inherit;box-sizing:border-box;}
        .ss-input:focus{border-color:#0061d2;}
        .ss-spin{animation:ss-spin .8s linear infinite;}
        @keyframes ss-spin{to{transform:rotate(360deg);}}
      `}</style>
    </div>
  );
}