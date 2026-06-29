import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { format, differenceInDays } from 'date-fns'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

const categories = [
  { value: 'governing',     label: 'Governing Documents', visibility: 'all'   },
  { value: 'board_only',    label: 'Board Only',          visibility: 'board' },
  { value: 'financial',     label: 'Financials',          visibility: 'board' },
  { value: 'meeting',       label: 'Meetings',            visibility: 'all'   },
  { value: 'maintenance',   label: 'Maintenance',         visibility: 'board' },
  { value: 'communication', label: 'Communications',      visibility: 'all'   },
]

const retentionLabel = {
  null: 'Permanent',
  7:    '7 years',
  15:   '15 years',
  1:    '1 year',
}

function PostingStatus({ postedAt }) {
  const days = differenceInDays(new Date(), new Date(postedAt))
  if (days <= 30) return <span className="badge bg-green-100 text-green-700">Posted on time</span>
  return <span className="badge bg-red-100 text-red-700">Posted {days}d ago</span>
}

export default function DocumentsPage() {
  const { profile, hasAnyRole } = useAuth()
  const qc = useQueryClient()
  const isBoard = hasAnyRole(['admin', 'board'])
  const [showForm, setShowForm] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const { register, handleSubmit, reset } = useForm()

  const { data: docs, isLoading } = useQuery({
    queryKey: ['documents', profile?.community_id, activeCategory],
    queryFn: async () => {
      let q = supabase
        .from('documents')
        .select('*, created_by_profile:created_by(full_name)')
        .eq('community_id', profile.community_id)
        .order('posted_at', { ascending: false })
      if (activeCategory !== 'all') q = q.eq('category', activeCategory)
      const { data } = await q
      return data ?? []
    },
    enabled: !!profile?.community_id,
  })

  const addDoc = useMutation({
    mutationFn: async (values) => {
      const cat = categories.find(c => c.value === values.category)
      const retention = values.category === 'governing' ? null
        : values.category === 'maintenance' ? 15 : 7
      const { error } = await supabase.from('documents').insert({
        community_id:    profile.community_id,
        title:           values.title,
        category:        values.category,
        drive_file_url:  values.drive_file_url || null,
        drive_file_id:   values.drive_file_url ? values.drive_file_url.split('/d/')[1]?.split('/')[0] : null,
        visibility:      cat?.visibility ?? 'board',
        retention_years: retention,
        hb1021_required: ['governing', 'meeting', 'financial'].includes(values.category),
        created_by:      profile.id,
      })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries(['documents']); reset(); setShowForm(false) },
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Community records · Florida HB 1021 compliant</p>
        </div>
        {isBoard && (
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            + Add document
          </button>
        )}
      </div>

      {/* Add document form */}
      {showForm && isBoard && (
        <div className="card border-brand-200 bg-brand-50">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Add document</h2>
          <form onSubmit={handleSubmit(v => addDoc.mutate(v))} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <input className="input" placeholder="e.g. 2026 Annual Budget" {...register('title', { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select className="input" {...register('category', { required: true })}>
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Google Drive URL</label>
              <input className="input" placeholder="https://drive.google.com/file/d/..." {...register('drive_file_url')} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary" disabled={addDoc.isPending}>
                {addDoc.isPending ? 'Saving...' : 'Save document'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === 'all' ? 'bg-brand-600 text-white' : 'bg-white border border-surface-border text-slate-600 hover:bg-slate-50'}`}
          onClick={() => setActiveCategory('all')}>All</button>
        {categories.map(c => (
          <button key={c.value}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeCategory === c.value ? 'bg-brand-600 text-white' : 'bg-white border border-surface-border text-slate-600 hover:bg-slate-50'}`}
            onClick={() => setActiveCategory(c.value)}>{c.label}</button>
        ))}
      </div>

      {/* Documents list */}
      {isLoading && <div className="py-10 text-center text-slate-400 text-sm">Loading documents...</div>}

      {!isLoading && docs?.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm">No documents posted yet.</p>
          {isBoard && <p className="text-xs text-slate-400 mt-1">Click "Add document" to post the first one.</p>}
        </div>
      )}

      <div className="space-y-2">
        {docs?.map(doc => (
          <div key={doc.id} className="card flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                <PostingStatus postedAt={doc.posted_at} />
                {doc.hb1021_required && (
                  <span className="badge bg-amber-100 text-amber-700">HB 1021</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {categories.find(c => c.value === doc.category)?.label} ·
                Retention: {retentionLabel[doc.retention_years] ?? `${doc.retention_years} yrs`} ·
                Posted {format(new Date(doc.posted_at), 'MMM d, yyyy')}
              </p>
            </div>
            {doc.drive_file_url && (
              <a href={doc.drive_file_url} target="_blank" rel="noreferrer"
                 className="btn-secondary text-xs shrink-0">View in Drive</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
