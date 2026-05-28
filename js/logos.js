// ==============================
// logos.js
// Modular rebuild version
// ==============================

// ---- Logo path helper (for local assets after repo cleanup) ----
// Normalize team logo filename coming from Google Sheets:
function normalizeLogoFilename(input) {
  // If it's a URL, keep as-is (logo candidates will normalize extension/casing)
// Team logo helper:
function setLogoImgSrcWithFallback(img, logoValue, folder) {
  const candidates = buildLogoCandidates(logoValue, primary);
function buildLogoCandidates(logoValue, folder) {
  const raw = (logoValue ?? "").toString().trim();
  const normalized = normalizeLogoFilename(raw);
  push(resolveLogoPath(normalized, primary));
  push(resolveLogoPath(normalized, altFolder));
    push(resolveLogoPath(jpg, primary));
    push(resolveLogoPath(jpg, altFolder));
function resolveLogoPath(raw, defaultFolder) {
  const logoIdx = header.findIndex(h => /로고|logo/i.test(String(h||'')));
  const teamIdx = header.findIndex((h, idx) => idx !== logoIdx && /팀명|팀/i.test(String(h||'')));
  const indices = header.map((_, i) => i).filter(i => i !== logoIdx);
        td.classList.add('logo-only-cell');
        let logoVal = (logoIdx >= 0) ? (r||[])[logoIdx] : null;
        if (!logoVal && /https?:\/\//i.test(teamStr)) logoVal = teamStr;
        const match = (logoVal + '').match(/https?:\/\/[\S")]+/i);
          wrap.className = 'logo-wrap';
          setLogoImgSrcWithFallback(img, match[0], 's10team');
          img.className = 'team-logo';
      td.classList.add('hof-logo-cell');
      img.className = 'hof-logo-img';
      img.alt = 'logo';
    // 우승 | (logo) | 팀명 | 감독 | ... | 부감독 | ...
    // 준우승 | (logo) | 팀명 | 감독 | ... | 부감독 | ...
          // If the row is like: [우승, logo, team, 감독, name, 부감독, name]
          // Use heuristics: team name is first non-url, non-empty after logo.
          // logo is usually at index 1; team name around index 2.
        const pickLogo = (row)=>{
        const winLogo = pickLogo(blockData[rWinV]||[]);
        const runLogo = pickLogo(blockData[rRunV]||[]);
        const makeCard = (place, logo, name, coach, sub)=>{
          if(logo){
            setLogoImgSrcWithFallback(img, logo, 's10team');
        podium.appendChild(makeCard('우승', winLogo, winName, winCoach, winSub));
        if(rRunV >= 0){ podium.appendChild(makeCard('준우승', runLogo, runName, runCoach, runSub)); }
    // try to find logo row shortly after header
    let logoR=-1;
      if(isImgish(row[cWin]) || isImgish(row[cRun])) { logoR=r; break; }
    const winLogo = (logoR>=0 && cleanVal((blockData[logoR]||[])[cWin]) && isImgish((blockData[logoR]||[])[cWin])) ? norm((blockData[logoR]||[])[cWin]) : '';
    const runLogo = (logoR>=0 && cleanVal((blockData[logoR]||[])[cRun]) && isImgish((blockData[logoR]||[])[cRun])) ? norm((blockData[logoR]||[])[cRun]) : '';
    const makeCard = (place, logo, name, coach, sub)=>{
      // Badge (우승/준우승 + 왕관) sits *above* the team logo.
      // Logo box (bigger) with the badge pinned above it.
      if(logo){
        setLogoImgSrcWithFallback(img, logo, 's10team');
    podium.appendChild(makeCard('우승', winLogo, winName, winCoach, winSub));
    if(rRunV >= 0){ podium.appendChild(makeCard('준우승', runLogo, runName, runCoach, runSub)); }
  // Detect logo row (first row below header where either winner/runner cell is a url)
  let logoR=-1;
    if(isUrl(w) || isUrl(u)) { logoR=r; break; }
  const win = { logo:'', team:'', coach:'', subcoach:'', ops:'' };
  const run = { logo:'', team:'', coach:'', subcoach:'', ops:'' };
  if(logoR>=0){
    win.logo = norm(cell(blockData[logoR], cWin));
    run.logo = norm(cell(blockData[logoR], cRun));
    if(obj.logo && isUrl(obj.logo)){
      img.src = obj.logo;
  //   [우승 | 준우승] header row, image/logo row, then label rows (팀명/감독/부감독/운영팀 ...)
    // attempt to pick logo row: the next row with URL-ish values at win/run cols
    let logoR=-1;
        logoR=r; break;
    const win = { label:'우승', name:'-', logo:'', lines:{} };
    const run = { label:'준우승', name:'-', logo:'', lines:{} };
    if(logoR>=0){
      const row = blockData[logoR]||[];
      win.logo = pickImg(row, cWin);
      run.logo = pickImg(row, cRun);
    const hasRunner = (run.name && run.name!=='-' && run.name!=='—') || Object.keys(run.lines).length || run.logo;
      if(obj.logo){
        img.src=obj.logo; img.alt='';
    // Meta + Logo extraction near top of block (감독/부감독만 표기)
    let logoUrl = '';
      if (!logoUrl){
          logoUrl = urlCandidate;
    return { roster: out, coach, assistant, logoUrl };
    const { roster, coach, assistant, logoUrl } = extractTeamRoster(rows, team);
    // Header (logo + team name + 감독/부감독)
    if (logoUrl){
          <img class="roster-team-logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(team.name)} 로고">