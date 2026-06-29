import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [roles, setRoles]     = useState([])   // e.g. ['admin', 'board']
  const [units, setUnits]     = useState([])   // e.g. [{unit_id, unit_number, is_primary}]
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setRoles([])
        setUnits([])
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    // Fetch profile + community in one query
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*, communities(*)')
      .eq('id', userId)
      .single()

    if (profileError) console.error('Profile fetch error:', profileError)

    // Fetch all roles for this user
    const { data: rolesData, error: rolesError } = await supabase
      .from('profile_roles')
      .select('role')
      .eq('profile_id', userId)

    if (rolesError) console.error('Roles fetch error:', rolesError)

    // Fetch all units for this user (with unit details)
    const { data: unitsData, error: unitsError } = await supabase
      .from('profile_units')
      .select('unit_id, is_primary, units(unit_number)')
      .eq('profile_id', userId)

    if (unitsError) console.error('Units fetch error:', unitsError)

    const rolesList = rolesData ? rolesData.map(r => r.role) : []
    const unitsList = unitsData ? unitsData.map(u => ({
      unit_id:     u.unit_id,
      unit_number: u.units?.unit_number,
      is_primary:  u.is_primary,
    })) : []

    console.log('Profile loaded:', JSON.stringify(profileData, null, 2))
    console.log('Roles loaded:', rolesList)
    console.log('Units loaded:', unitsList)

    setProfile(profileData)
    setRoles(rolesList)
    setUnits(unitsList)
    setLoading(false)
  }

  // ── CONVENIENCE HELPERS ──────────────────────────────────────
  // Use these throughout the app instead of checking profile.role

  // Check if user has a specific role: hasRole('board')
  function hasRole(role) {
    return roles.includes(role)
  }

  // Check if user has any of the given roles: hasAnyRole(['admin', 'board'])
  function hasAnyRole(roleList) {
    return roleList.some(r => roles.includes(r))
  }

  // Get the user's primary unit (for display in header/nav)
  function primaryUnit() {
    return units.find(u => u.is_primary) || units[0] || null
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      roles,
      units,
      loading,
      hasRole,
      hasAnyRole,
      primaryUnit,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
