import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const statusColors = {
  owner_occupied:  'bg-green-100 text-green-700',
  tenant_occupied: 'bg-blue-100 text-blue-700',
  vacant:          'bg-slate-100 text-slate-500',
}

const statusLabel = {
  owner_occupied:  'Owner occupied',
  tenant_occupied: 'Tenant occupied',
  vacant:          'Vacant',
}

export default function UnitsPage() {
  const { profile } = useAuth()

  const { data: units, isLoading } = useQuery({
    queryKey: ['units-all', profile?.community_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('*, owner:owner_id(full_name, email), tenant:tenant_id(full_name, email)')
        .eq('community_id', profile.community_id)
        .order('unit_number')
      return data ?? []
    },
    enabled: !!profile?.community_id,
  })

  const buildings = ['A', 'B', 'C', 'D', 'E']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Units</h1>
          <p className="text-sm text-slate-500 mt-1">{units?.length ?? 30} units · Martel Arms HOA</p>
        </div>
        <div className="flex gap-2 text-xs">
          {Object.entries(statusLabel).map(([k, v]) => (
            <span key={k} className={`badge ${statusColors[k]}`}>{v}</span>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {buildings.map(bldg => {
        const bldgUnits = units?.filter(u => u.building === bldg) ?? []
        return (
          <div key={bldg} className="card">
            <h2 className="text-sm font-semibold text-slate-600 mb-3">Building {bldg}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {bldgUnits.map(unit => (
                <div key={unit.id}
                  className="border border-surface-border rounded-lg p-3 hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer">
                  <p className="text-base font-semibold text-slate-900">{unit.unit_number}</p>
                  <span className={`badge text-xs mt-1 ${statusColors[unit.status]}`}>
                    {unit.status === 'owner_occupied' ? 'Owner'
                      : unit.status === 'tenant_occupied' ? 'Tenant'
                      : 'Vacant'}
                  </span>
                  {unit.owner?.full_name && (
                    <p className="text-xs text-slate-400 mt-1 truncate">{unit.owner.full_name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
