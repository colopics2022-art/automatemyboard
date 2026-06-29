import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { differenceInDays, format, isPast } from 'date-fns'

function StatCard({ label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'bg-brand-50  text-brand-700  border-brand-100',
    green: 'bg-green-50  text-green-700  border-green-100',
    amber: 'bg-amber-50  text-amber-700  border-amber-100',
    red:   'bg-red-50    text-red-700    border-red-100',
  }
  return (
    <div className={`card border ${colors[color]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function ComplianceBanner({ requests }) {
  const overdue = requests?.filter(r => r.status === 'overdue') ?? []
  const urgent  = requests?.filter(r => {
    if (!r.due_at || r.status !== 'open') return false
    return differenceInDays(new Date(r.due_at), new Date()) <= 2
  }) ?? []

  if (overdue.length === 0 && urgent.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
        <span className="text-lg">✅</span>
        <span>All record requests are within compliance windows.</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
      <span className="text-lg mt-0.5">⚠️</span>
      <div>
        <p className="font-medium">Compliance action needed</p>
        {overdue.length > 0 && <p>{overdue.length} record request{overdue.length > 1 ? 's are' : ' is'} overdue — Florida HB 1021 requires fulfillment within 10 working days.</p>}
        {urgent.length > 0  && <p>{urgent.length} request{urgent.length > 1 ? 's are' : ' is'} due within 2 days.</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { profile, hasAnyRole } = useAuth()
  const isBoard = hasAnyRole(['admin', 'board'])
  const communityId = profile?.community_id

  const { data: units } = useQuery({
    queryKey: ['units', communityId],
    queryFn: async () => {
      const { data } = await supabase.from('units').select('*').eq('community_id', communityId)
      return data ?? []
    },
    enabled: !!communityId && isBoard,
  })

  const { data: documents } = useQuery({
    queryKey: ['documents', communityId],
    queryFn: async () => {
      const { data } = await supabase.from('documents').select('*').eq('community_id', communityId).order('posted_at', { ascending: false }).limit(5)
      return data ?? []
    },
    enabled: !!communityId,
  })

  const { data: requests } = useQuery({
    queryKey: ['requests', communityId],
    queryFn: async () => {
      const query = supabase.from('record_requests').select('*').eq('community_id', communityId)
      const { data } = isBoard
        ? await query
        : await query.eq('requester_id', profile.id)
      return data ?? []
    },
    enabled: !!communityId,
  })

  const occupied = units?.filter(u => u.status !== 'vacant').length ?? 0
  const openReqs = requests?.filter(r => r.status === 'open').length ?? 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {isBoard ? 'Board Dashboard' : 'My Portal'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {profile?.communities?.name ?? 'Martel Arms HOA'} · {format(new Date(), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Compliance banner — board/admin only */}
      {isBoard && <ComplianceBanner requests={requests} />}

      {/* Stats — board/admin only */}
      {isBoard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total units"      value={units?.length ?? 30}    sub="Martel Arms"        color="brand" />
          <StatCard label="Occupied"         value={occupied}               sub={`${units?.length ?? 30} total`} color="green" />
          <StatCard label="Open requests"    value={openReqs}               sub="Record requests"    color={openReqs > 0 ? 'amber' : 'green'} />
          <StatCard label="Documents posted" value={documents?.length ?? 0} sub="This community"     color="brand" />
        </div>
      )}

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent documents */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Recent Documents</h2>
          {documents?.length === 0 && (
            <p className="text-sm text-slate-400">No documents posted yet.</p>
          )}
          <ul className="space-y-2">
            {documents?.map(doc => (
              <li key={doc.id} className="flex items-start justify-between gap-3 py-2 border-b border-surface-border last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.title}</p>
                  <p className="text-xs text-slate-400">{doc.category} · {format(new Date(doc.posted_at), 'MMM d, yyyy')}</p>
                </div>
                {doc.drive_file_url && (
                  <a href={doc.drive_file_url} target="_blank" rel="noreferrer"
                     className="text-xs text-brand-600 hover:underline shrink-0">View</a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Record requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Record Requests</h2>
            <span className="badge bg-slate-100 text-slate-600">{requests?.length ?? 0}</span>
          </div>
          {requests?.length === 0 && (
            <p className="text-sm text-slate-400">No record requests.</p>
          )}
          <ul className="space-y-2">
            {requests?.slice(0, 5).map(req => {
              const isOverdue = req.due_at && isPast(new Date(req.due_at)) && req.status !== 'fulfilled'
              const statusColors = {
                open:        'bg-blue-100 text-blue-700',
                in_progress: 'bg-amber-100 text-amber-700',
                fulfilled:   'bg-green-100 text-green-700',
                overdue:     'bg-red-100 text-red-700',
              }
              return (
                <li key={req.id} className="flex items-start justify-between gap-3 py-2 border-b border-surface-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{req.items_requested}</p>
                    <p className="text-xs text-slate-400">{format(new Date(req.requested_at), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={`badge shrink-0 ${statusColors[isOverdue ? 'overdue' : req.status]}`}>
                    {isOverdue ? 'overdue' : req.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
