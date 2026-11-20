/* kspace. — a small interactive terminal and an editable me.py for the home page */
(function () {
  'use strict';
  const term = document.getElementById('term');
  const out = document.getElementById('term-out');
  const input = document.getElementById('term-in');
  if (!term || !out || !input) return;
  const win = term.closest('.win');
  const started = Date.now();

  const LINKS = {
    github: 'https://github.com/karthiksreenivasanp',
    linkedin: 'https://www.linkedin.com/in/karthiksreenivasanp/',
    x: 'https://x.com/karthikpsreeni',
    instagram: 'https://www.instagram.com/karthiksreenivasanp',
    coffee: 'https://buymeacoffee.com/karthiksreenivasanp',
    email: 'mailto:karthiksreenivasanp@gmail.com',
    blog: 'blog.html',
    paper: 'https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=Geofenced%20Voice%20Biometric%20Attendance'
  };
  const PROJECTS = [
    { id: 'robo-duck-image', name: 'RoboDuck', desc: 'Android app that sends photos between phones as R2-D2 style chirps, decoded live.', url: 'https://github.com/karthiksreenivasanp/robo-duck-image' },
    { id: 'martian-map', name: 'Martian Map', desc: 'Turn-by-turn walk planner and 3D HUD for astronauts on Mars (NASA Space Apps 2026).', url: 'https://karthiksreenivasanp.github.io/martian-map/' },
    { id: 'speaker-based-attendance', name: 'Speaker Based Attendance', desc: 'Voice biometric attendance with a 20 m geofence. Published at IEEE.', url: 'https://github.com/karthiksreenivasanp/speaker-based-attendance' },
    { id: 'homo-lang', name: 'HOMO Language', desc: 'Plain-English programming language with built-in ML and a self-fixing compiler.', url: 'https://github.com/karthiksreenivasanp/homo-lang' }
  ];
  const FILES = {
    'about.txt': () => "hey there, i'm karthik! ^ ω ^\ni love building offline ai systems, exploring machine learning,\nand crafting terminal-based workflows. open source and linux fan.",
    'contact.txt': () => 'email     karthiksreenivasanp@gmail.com\ngithub    github.com/karthiksreenivasanp\nlinkedin  linkedin.com/in/karthiksreenivasanp\nx         x.com/karthikpsreeni',
    'me.py': () => (document.getElementById('code-pad') || {}).innerText || ''
  };

  /* ---------- output helpers ---------- */
  function line(text, cls) {
    const d = document.createElement('div');
    d.className = cls || 'o';
    d.textContent = text;
    out.appendChild(d);
    return d;
  }
  function linkLine(label, href, prefix) {
    const d = document.createElement('div');
    d.className = 'o';
    if (prefix) d.append(prefix);
    const a = document.createElement('a');
    a.href = href; a.textContent = label;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
    d.append(a);
    out.appendChild(d);
  }
  function echoCmd(cmd) {
    const d = document.createElement('div');
    const p = document.createElement('span'); p.className = 'p'; p.textContent = '~ $';
    d.append(p, document.createTextNode(cmd));
    out.appendChild(d);
  }
  const scroll = () => { term.scrollTop = term.scrollHeight; };
  function openUrl(href) {
    if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
    else location.href = href;
  }

  /* ---------- commands ---------- */
  const COMMANDS = {
    help() {
      line([
        'commands:',
        '  whoami          who is this',
        '  about           a little about me',
        '  projects        things i built',
        '  open <name>     open a project, blog, paper, github, linkedin, x, instagram, coffee',
        '  ls / cat <file> list and read files (about.txt, contact.txt, me.py)',
        '  python me.py    run the code in the me.py window',
        '  blog            read my blog',
        '  contact         how to reach me',
        '  theme <dark|light>',
        '  neofetch, date, echo, history, clear, exit'
      ].join('\n'));
    },
    whoami() { line('karthik — builds offline ai & terminal tools'); },
    about() { line(FILES['about.txt']()); },
    projects() {
      PROJECTS.forEach(p => { linkLine(p.name, p.url, ''); line('  ' + p.desc); });
      line("tip: open martian-map");
    },
    ls(args) {
      const dir = (args[0] || '').replace(/\/$/, '').replace(/^~\//, '');
      if (dir === 'projects') line(PROJECTS.map(p => p.id).join('  '));
      else if (!dir || dir === '.' || dir === '~') line('about.txt  contact.txt  me.py  projects/  blog/');
      else if (dir === 'blog') line('read it with: blog');
      else line(`ls: ${dir}: No such file or directory`, 'err');
    },
    cat(args) {
      if (!args.length) return line('usage: cat <file>', 'err');
      args.forEach(f => FILES[f] ? line(FILES[f]()) : line(`cat: ${f}: No such file or directory`, 'err'));
    },
    open(args) {
      const t = (args[0] || '').toLowerCase().replace(/^projects\//, '');
      const proj = PROJECTS.find(p => p.id === t || p.name.toLowerCase().replace(/\s+/g, '-') === t);
      const href = proj ? proj.url : LINKS[t];
      if (!href) return line(`open: don't know "${t || ''}". try: ${PROJECTS.map(p => p.id).concat(Object.keys(LINKS)).join(', ')}`, 'err');
      line(`opening ${proj ? proj.name : t}…`);
      openUrl(href);
    },
    blog() { line('opening blog…'); openUrl('blog.html'); },
    contact() { line(FILES['contact.txt']()); },
    email() { line('opening your mail app…'); openUrl(LINKS.email); },
    coffee() { line('thank you! ☕'); openUrl(LINKS.coffee); },
    theme(args) {
      const t = (args[0] || '').toLowerCase();
      if (t !== 'dark' && t !== 'light') return line('usage: theme dark  or  theme light', 'err');
      window.KS && KS.setTheme(t);
      line(`theme set to ${t}`);
    },
    python(args) {
      if (args[0] !== 'me.py') return line('usage: python me.py', 'err');
      const src = FILES['me.py']();
      const m = src.match(/return\s+(["'])(.*?)\1/);
      if (/class\s+\w+/.test(src) && m) line(m[2]);
      else line('(no output — try keeping a return "…" line in me.py)');
    },
    neofetch() {
      const up = Math.round((Date.now() - started) / 1000);
      line([
        '   ▄▄▄▄▄      karthik@kspace',
        '  █ ^ω^ █     ------------',
        '  █▄▄▄▄▄█     os: kspace. (macOS-ish)',
        '   ▀▀ ▀▀      shell: zsh (tiny)',
        `              theme: ${document.documentElement.getAttribute('data-theme')}`,
        `              uptime: ${up}s`,
        '              likes: local llms, linux, cli tools'
      ].join('\n'));
    },
    date() { line(new Date().toString()); },
    echo(args) { line(args.join(' ')); },
    pwd() { line('/home/karthik'); },
    cd() { line("this terminal is tiny, there's nowhere else to go ^ ω ^"); },
    history() { line(hist.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n') || '(empty)'); },
    clear() { out.innerHTML = ''; },
    sudo() { line('nice try. this incident will be reported ^ ω ^'); },
    exit() { line('bye!'); setTimeout(() => window.KS && KS.WM.close(win), 250); }
  };
  COMMANDS.python3 = COMMANDS.python;
  COMMANDS.mail = COMMANDS.email;
  COMMANDS.clr = COMMANDS.clear;

  /* ---------- input handling ---------- */
  const hist = [];
  let hPos = 0;

  function run(raw) {
    const cmd = raw.trim();
    echoCmd(raw);
    if (cmd) {
      hist.push(cmd);
      const [name, ...args] = cmd.split(/\s+/);
      const fn = COMMANDS[name.toLowerCase()];
      if (fn) fn(args);
      else line(`zsh: command not found: ${name}. type help`, 'err');
    }
    hPos = hist.length;
    scroll();
  }

  function complete() {
    const v = input.value;
    const parts = v.split(/\s+/);
    const last = parts[parts.length - 1];
    const pool = parts.length === 1 ? Object.keys(COMMANDS)
      : parts[0] === 'open' ? PROJECTS.map(p => p.id).concat(Object.keys(LINKS))
      : Object.keys(FILES).concat('projects/');
    const hits = pool.filter(c => c.startsWith(last));
    if (hits.length === 1) { parts[parts.length - 1] = hits[0]; input.value = parts.join(' ') + (parts.length === 1 ? ' ' : ''); }
    else if (hits.length > 1) { echoCmd(v); line(hits.join('  ')); scroll(); }
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); const v = input.value; input.value = ''; run(v); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (hPos > 0) input.value = hist[--hPos]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hPos = Math.min(hist.length, hPos + 1); input.value = hist[hPos] || ''; }
    else if (e.key === 'Tab') { e.preventDefault(); complete(); }
    else if (e.key.toLowerCase() === 'l' && e.ctrlKey) { e.preventDefault(); COMMANDS.clear(); }
  });
  // Click anywhere in the terminal to type (but let people select text)
  term.addEventListener('mouseup', () => { if (!String(window.getSelection())) input.focus({ preventScroll: true }); });
  input.addEventListener('focus', scroll);

  /* ---------- editable me.py ---------- */
  const pad = document.getElementById('code-pad');
  if (pad) {
    // Fallback for browsers without contenteditable="plaintext-only"
    if (pad.contentEditable !== 'plaintext-only') pad.contentEditable = 'true';
    const title = pad.closest('.win').querySelector('.win-title');
    pad.addEventListener('input', () => { if (title) title.textContent = 'me.py — Edited'; });
    pad.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '  '); }
    });
    // Re-colour the Python code when the visitor clicks away
    const KW = new Set(['def', 'return', 'import', 'from', 'as', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False', 'pass', 'with', 'try', 'except', 'lambda', 'yield', 'self', 'print', 'class']);
    const escH = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function highlight(src) {
      const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|\b([A-Za-z_]\w*)\b/g;
      let html = '', last = 0, prev = '', m;
      while ((m = re.exec(src))) {
        html += escH(src.slice(last, m.index));
        if (m[1]) html += `<span class="c-com">${escH(m[1])}</span>`;
        else if (m[2]) html += `<span class="c-str">${escH(m[2])}</span>`;
        else {
          const w = m[3];
          if (prev === 'class') html += `<span class="c-cls">${w}</span>`;
          else if (prev === 'def') html += `<span class="c-fn">${w}</span>`;
          else if (w === 'return') html += `<span class="c-ret">${w}</span>`;
          else if (w === 'class' || KW.has(w)) html += w === 'class' ? w : `<span class="c-kw">${w}</span>`;
          else html += w;
          prev = w;
        }
        last = re.lastIndex;
      }
      return html + escH(src.slice(last));
    }
    pad.addEventListener('blur', () => { pad.innerHTML = highlight(pad.innerText.replace(/\n$/, '')); });

    pad.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }
})();
