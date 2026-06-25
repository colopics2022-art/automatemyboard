import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays, addBusinessDays, isPast } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

function SLAClock({ dueAt, status }) {
  if (status === 'fulfilled') return <span className="badge bg-green-100 text-green-700">Fulfilled</span>
  if (!dueAt) return null
  const due = new Date(dueAt)
  const daysLeft = differenceInDays(due, new Date())
  const overdue  = isPast(due)
  if (overdue)       return <span className="badge bg-red-100 text-red-700">Overdue</span>
  if (daysLeft <= 2) return <span className="badge bg-amber-100 text-amber-700">{daysLeft}d left</span>
  return <span className="badge bg-blue-100 text-blue-700">Due {format(due, 'MMM d')}</span>
}

export default function RecordRequestsPage() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const role = profile?.role ?? 'owner'
  const isBoard = ['admin','board'].includes(role)
  const [showForm, setShowForm] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['record-requests', profile?.community_id, profile?.id],
    queryFn: async () => {
      let q = supabase
        .from('record_requests')
        .select('*, requester:requester_id(full_name, email)')
        .eq('community_id', profile.community_id)
        .order('requested_at', { ascending: false })
      if (!isBoard) q = q.eq('requester_id', profile.id)
      const { data } = await q
      return data ?? []
    },
    enabled: !!profile?.community_id,
  })

  const submitRequest = useMutation({
    mutationFn: async (values) => {
      const dueAt = addBusinessDays(new Date(), 10)
      const { error } = await supabase.from('record_requests').insert({
        community_id:    profile.community_id,
        requester_id:    profile.id,
        requester_name:  profile.full_name,
        requester_email: profile.email,
        items_requested: values.items_requested,
        due_at:          dueAt.toISOString(),
        status:          'open',
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['record-requests']); reset(); setShowForm(false) },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const update = { status }
      if (status === 'fulfilled') update.fulfilled_at = new Date().toISOString()
      const { error } = await supabase.from('record_requests').update(update).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(['record-requests']),
  })

  const open      = requests?.filter(r => r.status === 'open')        ?? []
  const pending   = requests?.filter(r => r.status === 'in_progress') ?? []
  const fulfilled = requests?.filter(r => r.status === 'fulfilled')   ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Record Requests</h1>
          <p className="text-sm text-slate-500 mt-1">Florida HB 1021 · 10 working day response window</p>
        </div>
        {!isBoard && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            + New request
          </button>
        )}
      </div>

      {/* New request form (owners) */}
      {showForm && !isBoard && (
        <div className="card border-brand-200 bg-brand-50">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Submit a record request</h2>
          <p className="text-xs text-slate-500 mb-4">
            The board is required to fulfill your request within 10 working days under Florida HB 1021.
          </p>
          <form onSubmit={handleSubmit(v => submitRequest.mutate(v))} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Documents requested</label>
              <textarea
                className="input resize-none h-24"
                placeholder="e.g. Copy of 2025 annual budget, last three months of bank statements..."
                {...register('items_requested', { required: true })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={submitRequest.isPending}>
                {submitRequest.isPending ? 'Submitting...' : 'Submit request'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Stats — board only */}
      {isBoard && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-600">{open.length}</p>
            <p className="text-xs text-slate-500 mt-1">Open</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-slate-500 mt-1">In progress</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-green-600">{fulfilled.length}</p>
            <p className="text-xs text-slate-500 mt-1">Fulfilled</p>
          </div>
        </div>
      )}

      {/* Request list */}
      {isLoading && <div className="py-10 text-center text-slate-400 text-sm">Loading requests...</div>}

      {!isLoading && requests?.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No record requests yet.</p>
          {!isBoard && <p className="text-xs text-slate-400 mt-1">Click "New request" to request community documents.</p>}
        </div>
      )}

      <div className="space-y-3">
        {requests?.map(req => {
          const overdue = req.due_at && isPast(new Date(req.due_at)) && req.status !== 'fulfilled'
          return (
            <div key={req.id} className={`card ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SLAClock dueAt={req.due_at} status={req.status} />
                    {isBoard && req.requester?.full_name && (
                      <span className="text-xs text-slate-500">from {req.requester.full_name}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{req.items_requested}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Requested {format(new Date(req.requested_at), 'MMM d, yyyy')}
                    {req.due_at && ` · Due ${format(new Date(req.due_at), 'MMM d, yyyy')}`}
                  </p>
                </div>

                {/* Board actions */}
                {isBoard && req.status !== 'fulfilled' && (
                  <div className="flex gap-2 shrink-0">
                    {req.status === 'open' && (
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => updateStatus.mutate({ id: req.id, status: 'in_progress' })}>
                        Start
                      </button>
                    )}
                    <button
                      className="btn-primary text-xs"
                      onClick={() => updateStatus.mutate({ id: req.id, status: 'fulfilled' })}>
                      Mark fulfilled
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
