import { useState } from 'react'

// ── UNIT NUMBER MODE ──────────────────────────────────────────
// sequential: building letter + sequential numbers (start, count)
// custom:     manually type each unit number

function UnitPreview({ buildings }) {
  const active = buildings.filter(b => !b.skip && b.letter)
  if (active.length === 0) return null

  const allUnits = active.flatMap(b => getUnitsForBuilding(b))

  return (
    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Unit Preview</p>
        <span className="text-xs text-slate-400">{allUnits.length} units total</span>
      </div>
      <div className="space-y-2">
        {active.map((b, i) => {
          const units = getUnitsForBuilding(b)
          return (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs font-mono font-bold text-slate-700 w-6 shrink-0 pt-0.5">{b.letter}</span>
              <div className="flex flex-wrap gap-1">
                {units.map(u => (
                  <span key={u} className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 font-mono text-slate-600">{u}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getUnitsForBuilding(b) {
  if (b.skip) return []
  if (b.mode === 'custom') {
    // Parse comma-separated custom unit numbers
    return (b.customUnits || '')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => b.letter + s)
  }
  // Sequential mode
  const start = parseInt(b.unitStart) || 1
  const count = parseInt(b.unitCount) || 0
  return Array.from({ length: count }, (_, i) => b.letter + (start + i))
}

function getAllUnits(buildings) {
  return buildings.flatMap(b => getUnitsForBuilding(b))
}

// ── BUILDING ROW ──────────────────────────────────────────────
function BuildingRow({ b, index, onChange, onRemove }) {
  return (
    <div className="p-3 border-b border-slate-100 last:border-0 space-y-2">
      <div className="flex items-center gap-2">
        {/* Letter */}
        <input
          className="w-12 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center font-mono font-bold uppercase"
          maxLength={2}
          placeholder="A"
          value={b.letter}
          onChange={e => onChange(index, 'letter', e.target.value.toUpperCase())}
        />

        {/* Skip */}
        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={!!b.skip}
            onChange={e => onChange(index, 'skip', e.target.checked)}
            className="rounded"
          />
          Skip
        </label>

        {!b.skip && (
          <>
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
              <button
                className={`px-2 py-1 transition-colors ${b.mode !== 'custom' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => onChange(index, 'mode', 'sequential')}
              >Sequential</button>
              <button
                className={`px-2 py-1 transition-colors ${b.mode === 'custom' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                onClick={() => onChange(index, 'mode', 'custom')}
              >Custom</button>
            </div>

            {b.mode !== 'custom' ? (
              <>
                {/* Start */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Start</span>
                  <input
                    type="number"
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center"
                    placeholder="1"
                    value={b.unitStart}
                    onChange={e => onChange(index, 'unitStart', e.target.value)}
                  />
                </div>
                {/* Count */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Count</span>
                  <input
                    type="number"
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center"
                    placeholder="6"
                    min="1"
                    value={b.unitCount}
                    onChange={e => onChange(index, 'unitCount', e.target.value)}
                  />
                </div>
                {/* Range preview */}
                {b.letter && b.unitStart && b.unitCount && (
                  <span className="text-xs text-slate-400 font-mono">
                    {b.letter}{b.unitStart}–{b.letter}{parseInt(b.unitStart) + parseInt(b.unitCount) - 1}
                  </span>
                )}
              </>
            ) : (
              /* Custom unit numbers */
              <div className="flex-1 flex items-center gap-1">
                <span className="text-xs text-slate-400 shrink-0">Units</span>
                <input
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono"
                  placeholder="39,40,41,42,43,44  or  101,102,201,202"
                  value={b.customUnits || ''}
                  onChange={e => onChange(index, 'customUnits', e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {b.skip && (
          <input
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-400 italic"
            placeholder="Reason (e.g. pool building, office, parking)"
            value={b.skipReason || ''}
            onChange={e => onChange(index, 'skipReason', e.target.value)}
          />
        )}

        {/* Remove */}
        <button
          onClick={() => onRemove(index)}
          className="text-slate-300 hover:text-red-400 transition-colors text-xl leading-none ml-auto"
        >×</button>
      </div>

      {/* Custom mode hint */}
      {!b.skip && b.mode === 'custom' && b.customUnits && (
        <div className="flex flex-wrap gap-1 pl-14">
          {getUnitsForBuilding(b).map(u => (
            <span key={u} className="text-xs bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 font-mono text-blue-700">{u}</span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────
export default function CommunityIntakeForm({ onSubmit }) {
  const [step, setStep] = useState(1)

  const [community, setCommunity] = useState({
    name: '', address: '', city: '', state: 'FL', zip: '', drive_folder_id: '',
  })

  // Default: Martel Arms as example
  const [buildings, setBuildings] = useState([
    { letter: 'A', mode: 'sequential', unitStart: '1',  unitCount: '6', skip: false, skipReason: '' },
    { letter: 'B', mode: 'sequential', unitStart: '7',  unitCount: '6', skip: false, skipReason: '' },
    { letter: 'C', mode: 'sequential', unitStart: '13', unitCount: '6', skip: false, skipReason: '' },
    { letter: 'D', mode: 'sequential', unitStart: '19', unitCount: '6', skip: false, skipReason: '' },
    { letter: 'E', mode: 'sequential', unitStart: '25', unitCount: '6', skip: true,  skipReason: 'Does not exist' },
    { letter: 'F', mode: 'sequential', unitStart: '31', unitCount: '6', skip: true,  skipReason: 'Pool building' },
    { letter: 'G', mode: 'custom', customUnits: '39,40,41,42,43,44',   skip: false, skipReason: '' },
  ])

  const [submitted, setSubmitted] = useState(false)
  const [generatedSQL, setGeneratedSQL] = useState('')
  const [generatedScript, setGeneratedScript] = useState('')

  function updateBuilding(index, field, value) {
    setBuildings(prev => prev.map((b, i) => i === index ? { ...b, [field]: value } : b))
  }

  function addBuilding() {
    setBuildings(prev => [...prev, { letter: '', mode: 'sequential', unitStart: '', unitCount: '6', skip: false, skipReason: '' }])
  }

  function removeBuilding(index) {
    setBuildings(prev => prev.filter((_, i) => i !== index))
  }

  function generateSQL(communityId) {
    const id = communityId || 'YOUR-COMMUNITY-UUID-HERE'
    const units = getAllUnits(buildings)
    const lines = units.map(u => {
      const bldg = buildings.find(b => u.startsWith(b.letter) && !b.skip)?.letter || u[0]
      return `('${id}', '${u}', '${bldg}', 'vacant')`
    })
    return (
      `-- AutomateMyBoard Community Intake — ${community.name || 'New Community'}\n` +
      `-- Total units: ${units.length}\n` +
      `-- Replace ${id} with actual community id\n\n` +
      `insert into units (community_id, unit_number, building, status) values\n` +
      lines.join(',\n') + ';'
    )
  }

  function generateDriveScript() {
    const active = buildings.filter(b => !b.skip && b.letter)
    const buildingLines = active.map(b => {
      const units = getUnitsForBuilding(b)
      const unitNums = units.map(u => u.replace(b.letter, '')).join(',')
      return `  // Building ${b.letter}: units ${units[0]}–${units[units.length - 1]}\n` +
             `  var units${b.letter} = [${units.map(u => `'${u}'`).join(', ')}];`
    }).join('\n')

    const loopLines = active.map(b => {
      return (
        `  var folder${b.letter} = mkDir(s05, 'Building ${b.letter}');\n` +
        `  var units${b.letter}List = [${getUnitsForBuilding(b).map(u => `'${u}'`).join(', ')}];\n` +
        `  for (var i = 0; i < units${b.letter}List.length; i++) {\n` +
        `    var uf = mkDir(folder${b.letter}, units${b.letter}List[i]);\n` +
        `    for (var sf = 0; sf < unitSubs.length; sf++) { mkDir(uf, unitSubs[sf]); }\n` +
        `  }`
      )
    }).join('\n')

    const skipped = buildings.filter(b => b.skip && b.letter)
      .map(b => `  // ${b.letter} skipped — ${b.skipReason || 'no units'}`)
      .join('\n')

    return (
      `// AutomateMyBoard — Drive Folder Builder\n` +
      `// Community: ${community.name || 'New Community'}\n` +
      `// Generated by intake form\n\n` +
      `function buildCommunityFolders() {\n` +
      `  var ROOT_FOLDER_ID = '${community.drive_folder_id || 'YOUR-DRIVE-FOLDER-ID'}';\n` +
      `  var root = DriveApp.getFolderById(ROOT_FOLDER_ID);\n\n` +
      `  function mkDir(parent, name) {\n` +
      `    var iter = parent.getFoldersByName(name);\n` +
      `    if (iter.hasNext()) { Logger.log('exists: ' + name); return iter.next(); }\n` +
      `    Logger.log('create: ' + name);\n` +
      `    Utilities.sleep(150);\n` +
      `    return parent.createFolder(name);\n` +
      `  }\n\n` +
      `  var unitSubs = ['Lease and Ownership Docs', 'Violations', 'Requests and Work Orders', 'Correspondence'];\n\n` +
      `  mkDir(root, '_Admin');\n` +
      `  var s01 = mkDir(root, '01 - Governing Documents');\n` +
      `  ['Declaration of Condominium','Bylaws','Rules and Regulations','Amendments','Articles of Incorporation'].forEach(function(n){mkDir(s01,n);});\n` +
      `  var s02 = mkDir(root, '02 - Board Only');\n` +
      `  ['Attorney-Client Communications','Personnel and Contracts','Insurance Policies','Litigation','Executive Session Minutes'].forEach(function(n){mkDir(s02,n);});\n` +
      `  var s03 = mkDir(root, '03 - Financials');\n` +
      `  ['2025','2026'].forEach(function(yr){ var yf=mkDir(s03,yr); ['Invoices','Bank Statements','Budget','Audits and Reviews','Reserve Fund'].forEach(function(n){mkDir(yf,n);}); });\n` +
      `  var s04 = mkDir(root, '04 - Meetings');\n` +
      `  ['2025','2026'].forEach(function(yr){ var yf=mkDir(s04,yr); ['Agendas','Minutes','Proxies','Notices'].forEach(function(n){mkDir(yf,n);}); });\n\n` +
      `  // 05 Units\n` +
      `  var s05 = mkDir(root, '05 - Units');\n` +
      (skipped ? skipped + '\n' : '') +
      loopLines + '\n\n' +
      `  var s06 = mkDir(root, '06 - Maintenance');\n` +
      `  var vf=mkDir(s06,'Vendors'); mkDir(vf,'Contracts'); mkDir(vf,'Certificates of Insurance');\n` +
      `  mkDir(s06,'Work Orders');\n` +
      `  var inf=mkDir(s06,'Inspections'); mkDir(inf,'Structural'); mkDir(inf,'Fire and Life Safety'); mkDir(inf,'SIRS - Structural Integrity Reserve Study');\n` +
      `  mkDir(s06,'Common Areas');\n` +
      `  var s07 = mkDir(root, '07 - Communications');\n` +
      `  ['Board Announcements','Owner Correspondence','Notices - Florida Statutory','Newsletters'].forEach(function(n){mkDir(s07,n);});\n\n` +
      `  Logger.log('Done! ' + ${getAllUnits(buildings).length} + ' units created.');\n` +
      `}\n`
    )
  }

  function handleSubmit() {
    const sql = generateSQL()
    const script = generateDriveScript()
    setGeneratedSQL(sql)
    setGeneratedScript(script)
    setSubmitted(true)
    if (onSubmit) onSubmit({ community, buildings, units: getAllUnits(buildings), sql, script })
  }

  const units = getAllUnits(buildings)

  // ── STEP 1: COMMUNITY INFO ──────────────────────────────────
  if (step === 1) return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">New Community Setup</h1>
        <p className="text-sm text-slate-500 mt-1">Step 1 of 3 — Community information</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Community name *</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Martel Arms HOA"
            value={community.name} onChange={e => setCommunity(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Street address</label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="123 Main Street"
            value={community.address} onChange={e => setCommunity(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Delray Beach"
              value={community.city} onChange={e => setCommunity(p => ({ ...p, city: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">State</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={community.state} onChange={e => setCommunity(p => ({ ...p, state: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ZIP</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="33444"
              value={community.zip} onChange={e => setCommunity(p => ({ ...p, zip: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Google Drive folder ID <span className="text-slate-400 font-normal">(from Drive URL)</span></label>
          <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono" placeholder="1B_celNz21S7V9kBtDOf1GEbi-85sB9XS"
            value={community.drive_folder_id} onChange={e => setCommunity(p => ({ ...p, drive_folder_id: e.target.value }))} />
        </div>
      </div>
      <button className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
        disabled={!community.name} onClick={() => setStep(2)}>
        Next: Configure units →
      </button>
    </div>
  )

  // ── STEP 2: UNIT CONFIGURATION ──────────────────────────────
  if (step === 2) return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Unit Configuration</h1>
        <p className="text-sm text-slate-500 mt-1">Step 2 of 3 — Define your building and unit structure</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
        <p><strong>Sequential:</strong> units numbered automatically from a start number (e.g. A starts at 1, B starts at 7).</p>
        <p><strong>Custom:</strong> type exact unit numbers separated by commas (e.g. 39,40,41,42,43,44 or 101,102,201,202).</p>
        <p><strong>Skip:</strong> building exists in the sequence but has no residential units (pool, office, parking, etc).</p>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {buildings.map((b, i) => (
          <BuildingRow key={i} b={b} index={i} onChange={updateBuilding} onRemove={removeBuilding} />
        ))}
        <div className="px-3 py-2 bg-slate-50">
          <button onClick={addBuilding} className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
            + Add building
          </button>
        </div>
      </div>

      <UnitPreview buildings={buildings} />

      <div className="flex gap-3">
        <button className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          onClick={() => setStep(1)}>← Back</button>
        <button className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-40"
          disabled={units.length === 0} onClick={() => setStep(3)}>
          Next: Review ({units.length} units) →
        </button>
      </div>
    </div>
  )

  // ── STEP 3: REVIEW ──────────────────────────────────────────
  if (step === 3 && !submitted) return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Review & Generate</h1>
        <p className="text-sm text-slate-500 mt-1">Step 3 of 3 — Confirm and generate SQL + Drive script</p>
      </div>

      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
        <div className="px-4 py-3">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Community</p>
          <p className="text-sm font-semibold text-slate-800">{community.name}</p>
          <p className="text-xs text-slate-500">{community.address}, {community.city}, {community.state} {community.zip}</p>
        </div>
        <div className="px-4 py-3 space-y-1">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Unit structure</p>
          {buildings.filter(b => !b.skip && b.letter).map((b, i) => {
            const us = getUnitsForBuilding(b)
            return (
              <p key={i} className="text-sm text-slate-700">
                <span className="font-mono font-bold">{b.letter}</span>
                {' — '}{us[0]} to {us[us.length - 1]}
                <span className="text-slate-400 ml-1">({us.length} units{b.mode === 'custom' ? ', custom' : ''})</span>
              </p>
            )
          })}
          {buildings.filter(b => b.skip && b.letter).map((b, i) => (
            <p key={i} className="text-sm text-slate-400 italic">
              <span className="font-mono font-bold">{b.letter}</span> — skipped {b.skipReason ? `(${b.skipReason})` : ''}
            </p>
          ))}
        </div>
        <div className="px-4 py-3">
          <p className="text-2xl font-bold text-blue-600">{units.length} <span className="text-sm font-normal text-slate-500">total units</span></p>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
          onClick={() => setStep(2)}>← Back</button>
        <button className="flex-1 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition-colors"
          onClick={handleSubmit}>Generate SQL & Drive script ✓</button>
      </div>
    </div>
  )

  // ── SUCCESS ─────────────────────────────────────────────────
  if (submitted) return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-lg">✓</div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Ready to deploy</h1>
          <p className="text-sm text-slate-500">{community.name} · {units.length} units</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Step 1 — Supabase SQL</p>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => navigator.clipboard.writeText(generatedSQL)}>Copy</button>
          </div>
          <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-auto max-h-40 leading-relaxed">{generatedSQL}</pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Step 2 — Google Apps Script</p>
            <button className="text-xs text-blue-600 hover:underline" onClick={() => navigator.clipboard.writeText(generatedScript)}>Copy</button>
          </div>
          <pre className="bg-slate-900 text-green-400 text-xs rounded-xl p-4 overflow-auto max-h-40 leading-relaxed">{generatedScript}</pre>
          <p className="text-xs text-slate-400 mt-1">Paste at script.google.com → run <span className="font-mono">buildCommunityFolders</span></p>
        </div>
      </div>

      <button
        className="w-full border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors"
        onClick={() => { setStep(1); setSubmitted(false); setCommunity({ name:'',address:'',city:'',state:'FL',zip:'',drive_folder_id:'' }); setBuildings([{ letter:'',mode:'sequential',unitStart:'1',unitCount:'6',skip:false,skipReason:'' }]) }}
      >
        + Set up another community
      </button>
    </div>
  )
}
