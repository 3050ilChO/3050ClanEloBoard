// HOF CLEAN FINAL v10_63
const HOF_LINKS = {
  PRO: 'https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/gviz/tq?gid=1109513359&tqx=out:html',
  TST: 'https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/gviz/tq?gid=381201435&tqx=out:html',
  TSL: 'https://docs.google.com/spreadsheets/d/1llp7MXLWxOgCUMdmvy3wnTGaf3uAfZam0TMXKGTy5ic/gviz/tq?gid=1798494471&tqx=out:html'
};

const hofContent = document.getElementById('hofContent');
const seasonList = document.getElementById('hofSeasonList');

async function loadPro() {
  const html = await fetch(HOF_LINKS.PRO).then(r => r.text());
  const div = document.createElement('div');
  div.innerHTML = html;

  // IMPORTANT: render ALL tables (winner + runner-up)
  const tables = div.querySelectorAll('table');
  let out = '';
  tables.forEach(t => out += t.outerHTML);
  hofContent.innerHTML = out;
}

window.addEventListener('DOMContentLoaded', loadPro);
