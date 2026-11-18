/* ============================================================
   EXTRA.JS — interações novas do Atlas das Línguas
   Usa os dados (idiomas, vocab, porId) que estão no index.html.
   Partes:
   A. Pronúncia (voz do navegador)
   B. Passaporte de conquistas + confete
   C. Livro 3D
   D. Cubos do alfabeto
   E. Árvore das línguas
   F. Jogo da memória
   G. Monte a frase
   ============================================================ */

/* ---------- A. PRONÚNCIA ---------- */
// O navegador tem vozes para espanhol e italiano. Latim e guarani
// não têm voz confiável, então o botão só aparece para es e it.
const vozLingua = { es: "es-ES", it: "it-IT" };
const temVoz = "speechSynthesis" in window;
const iconeSom = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>`;

function falar(texto, id, botao) {
  if (!temVoz || !vozLingua[id]) return;
  try {
    speechSynthesis.cancel();
    const fala = new SpeechSynthesisUtterance(texto.replace(/[¿¡]/g, ""));
    fala.lang = vozLingua[id];
    fala.rate = 0.85;
    const voz = speechSynthesis.getVoices().find(v => v.lang && v.lang.startsWith(id));
    if (voz) fala.voice = voz;
    if (botao) { botao.classList.add("tocando"); fala.onend = fala.onerror = () => botao.classList.remove("tocando"); }
    speechSynthesis.speak(fala);
  } catch (e) { /* sem voz: o site continua funcionando */ }
}
function botaoOuvir(texto, id, classe = "") {
  if (!temVoz || !vozLingua[id]) return "";
  return `<button class="ouvir ${classe}" type="button" data-falar="${texto.replace(/"/g, "&quot;")}" data-lingua="${id}">${iconeSom}Ouvir</button>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-falar]");
  if (!b) return;
  e.stopPropagation();
  falar(b.dataset.falar, b.dataset.lingua, b);
}, true);

/* ---------- B. PASSAPORTE + CONFETE ---------- */
const carimbos = [
  { id: "viajante", nome: "Viajante", desc: "visitou os 4 idiomas na jornada", cor: "#ffc23d", r: "-8deg" },
  { id: "arara", nome: "Colecionador", desc: "viu 6 palavras na arara", cor: "#ff6b4a", r: "5deg" },
  { id: "leitor", nome: "Leitor", desc: "folheou o livro até o fim", cor: "#b98cff", r: "-4deg" },
  { id: "alfabeto", nome: "Alfabeto", desc: "girou 10 cubos de letras", cor: "#ff8a6e", r: "7deg" },
  { id: "memoria", nome: "Memória", desc: "venceu o jogo da memória", cor: "#3ccf7e", r: "-6deg" },
  { id: "frase", nome: "Frasista", desc: "montou 3 frases certas", cor: "#6fb7ff", r: "4deg" }
];
let ganhos = [];
try { ganhos = JSON.parse(localStorage.getItem("atlas-carimbos") || "[]"); } catch (e) {}

document.body.insertAdjacentHTML("beforeend", `
  <button class="passaporte-btn" id="passaporte-btn" type="button" aria-haspopup="dialog">
    <span class="selo" id="selo"><span id="selo-n">0</span></span> Passaporte
  </button>
  <div class="passaporte" id="passaporte" role="dialog" aria-modal="true" aria-labelledby="passaporte-titulo">
    <div class="passaporte-livro">
      <p class="rotulo">Atlas das Línguas</p>
      <h2 id="passaporte-titulo">Seu passaporte</h2>
      <p>Explore o site para ganhar os seis carimbos.</p>
      <div class="carimbos-grade" id="carimbos-grade"></div>
      <button class="botao-claro fechar" id="passaporte-fechar" type="button">Voltar à viagem</button>
    </div>
  </div>
  <div class="aviso" id="aviso" role="status"></div>
  <canvas id="confete"></canvas>`);

function desenharPassaporte() {
  document.getElementById("carimbos-grade").innerHTML = carimbos.map(c => {
    const g = ganhos.includes(c.id);
    return `<div class="carimbo-c ${g ? "ganho" : ""}" style="--cor:${c.cor};--r:${c.r}"><div><b>${c.nome}</b>${c.desc}</div></div>`;
  }).join("");
  document.getElementById("selo-n").textContent = ganhos.length;
  document.getElementById("selo").style.setProperty("--p", ganhos.length / carimbos.length * 100);
}
desenharPassaporte();

const passaporte = document.getElementById("passaporte");
document.getElementById("passaporte-btn").addEventListener("click", () => { desenharPassaporte(); passaporte.classList.add("aberto"); document.getElementById("passaporte-fechar").focus(); });
document.getElementById("passaporte-fechar").addEventListener("click", () => passaporte.classList.remove("aberto"));
passaporte.addEventListener("click", e => { if (e.target === passaporte) passaporte.classList.remove("aberto"); });
addEventListener("keydown", e => { if (e.key === "Escape") { passaporte.classList.remove("aberto"); fecharZoom(); } });

let timerAviso;
function avisar(msg) {
  const a = document.getElementById("aviso");
  a.textContent = msg; a.classList.add("mostra");
  clearTimeout(timerAviso); timerAviso = setTimeout(() => a.classList.remove("mostra"), 2600);
}
function ganharCarimbo(id) {
  if (ganhos.includes(id)) return;
  ganhos.push(id);
  try { localStorage.setItem("atlas-carimbos", JSON.stringify(ganhos)); } catch (e) {}
  desenharPassaporte();
  const c = carimbos.find(x => x.id === id);
  avisar(`Carimbo ganho: ${c.nome} (${ganhos.length} de ${carimbos.length})`);
  confete();
}

function confete() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cv = document.getElementById("confete"), g = cv.getContext("2d");
  cv.width = innerWidth; cv.height = innerHeight;
  const cores = ["#ff6b4a", "#3ccf7e", "#b98cff", "#ffc23d", "#eef0f5"];
  const ps = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2, y: innerHeight * .6, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 6,
    r: Math.random() * 6 + 4, c: cores[Math.floor(Math.random() * cores.length)], a: Math.random() * 6, va: (Math.random() - .5) * .4
  }));
  let f = 0;
  (function passo() {
    g.clearRect(0, 0, cv.width, cv.height);
    ps.forEach(p => {
      p.vy += .45; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.a += p.va;
      g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore();
    });
    if (++f < 120) requestAnimationFrame(passo); else g.clearRect(0, 0, cv.width, cv.height);
  })();
}

// ganchos chamados pelo index.html
const passosVistos = new Set(), pecasVistas = new Set();
window.aoPasso = n => { if (n > 0) passosVistos.add(n); if (passosVistos.size === 4) ganharCarimbo("viajante"); };
window.aoArara = i => { pecasVistas.add(i); if (pecasVistas.size >= 6) ganharCarimbo("arara"); };

/* ---------- C. LIVRO 3D ---------- */
const paginas = [
  ["pag/p01.webp", "Capa"], ["pag/p02.webp", "Abertura do Espanhol"], ["pag/p03.webp", "Frutas"], ["pag/p04.webp", "Animais"],
  ["pag/p05.webp", "Transportes"], ["pag/p06.webp", "Cores"], ["pag/p07.webp", "Expressões"], ["pag/p08.webp", "Abertura do Latim"],
  ["pag/p09.webp", "Alfabeto ilustrado"], ["pag/p10.webp", "Animais no latim"], ["pag/p11.webp", "Transportes antigos"], ["pag/p12.webp", "Cores no latim"]
];
const livro = document.getElementById("livro");
const totalFolhas = Math.ceil(paginas.length / 2);
let folhaAtual = 0; // quantas folhas já foram viradas

const folhas = Array.from({ length: totalFolhas }, (_, j) => {
  const f = document.createElement("div");
  f.className = "folha";
  const [fr, frAlt] = paginas[2 * j];
  const verso = paginas[2 * j + 1];
  f.innerHTML = `
    <div class="lado-f ${j === 0 ? "capa-fundo" : ""}"><img src="${fr}" alt="Página: ${frAlt}" loading="lazy" draggable="false"></div>
    <div class="lado-v">${verso ? `<img src="${verso[0]}" alt="Página: ${verso[1]}" loading="lazy" draggable="false">` : ""}</div>`;
  f.addEventListener("click", () => { if (!arrastouLivro) (f.classList.contains("virada") ? voltarFolha() : virarFolha()); });
  livro.appendChild(f);
  return f;
});

function desenharLivro() {
  folhas.forEach((f, j) => {
    const virada = j < folhaAtual;
    f.classList.toggle("virada", virada);
    f.style.zIndex = virada ? j : totalFolhas - j;
  });
  livro.classList.toggle("fechado-inicio", folhaAtual === 0);
  livro.classList.toggle("fechado-fim", folhaAtual === totalFolhas);
  const esq = folhaAtual * 2, dir = esq + 1;
  document.getElementById("contador-livro").textContent =
    folhaAtual === 0 ? "Capa" : folhaAtual === totalFolhas ? `Página ${paginas.length} de ${paginas.length}` : `Páginas ${esq}–${dir} de ${paginas.length}`;
  document.getElementById("livro-ant").disabled = folhaAtual === 0;
  document.getElementById("livro-prox").disabled = folhaAtual === totalFolhas;
  if (folhaAtual === totalFolhas) ganharCarimbo("leitor");
}
function animarFolha(f) { f.classList.add("virando"); setTimeout(() => f.classList.remove("virando"), 1000); }
function virarFolha() { if (folhaAtual < totalFolhas) { animarFolha(folhas[folhaAtual]); folhaAtual++; desenharLivro(); } }
function voltarFolha() { if (folhaAtual > 0) { folhaAtual--; animarFolha(folhas[folhaAtual]); desenharLivro(); } }
document.getElementById("livro-prox").addEventListener("click", virarFolha);
document.getElementById("livro-ant").addEventListener("click", voltarFolha);

let livroX = null, arrastouLivro = false;
livro.addEventListener("pointerdown", e => { livroX = e.clientX; arrastouLivro = false; });
addEventListener("pointerup", e => {
  if (livroX === null) return;
  const dx = e.clientX - livroX; livroX = null;
  if (Math.abs(dx) > 40) { arrastouLivro = true; dx < 0 ? virarFolha() : voltarFolha(); setTimeout(() => arrastouLivro = false, 0); }
});
document.getElementById("livro-palco").addEventListener("keydown", e => {
  if (e.key === "ArrowRight") virarFolha();
  if (e.key === "ArrowLeft") voltarFolha();
});

// ampliar a página da direita (ou a última)
const zoom = document.getElementById("zoom");
document.getElementById("livro-zoom").addEventListener("click", () => {
  const i = Math.min(folhaAtual * 2, paginas.length - 1);
  document.getElementById("zoom-img").src = paginas[i][0];
  document.getElementById("zoom-img").alt = paginas[i][1];
  zoom.classList.add("aberto");
});
function fecharZoom() { zoom.classList.remove("aberto"); }
document.getElementById("zoom-fechar").addEventListener("click", fecharZoom);
zoom.addEventListener("click", e => { if (e.target === zoom) fecharZoom(); });
desenharLivro();

/* ---------- D. CUBOS DO ALFABETO (espanhol, do livro) ---------- */
const alfabeto = [
  ["A","a","agua","água"],["B","bê","barco","barco"],["C","sê","casa","casa"],["D","dê","dado","dado"],["E","ê","elefante","elefante"],
  ["F","éfe","flor","flor"],["G","rê","gato","gato"],["H","átche","huevo","ovo"],["I","i","isla","ilha"],["J","róta","jardín","jardim"],
  ["K","ká","kiwi","kiwi"],["L","éle","luna","lua"],["M","éme","mano","mão"],["N","éne","nube","nuvem"],["Ñ","ênhe","ñandú","ema"],
  ["O","ô","oso","urso"],["P","pê","pan","pão"],["Q","ku","queso","queijo"],["R","érre","rana","rã"],["S","ésse","sol","sol"],
  ["T","tê","tomate","tomate"],["U","u","uva","uva"],["V","úbe","vaca","vaca"],["W","úbe dóble","wifi","rede sem fio"],
  ["X","ékis","xilófono","xilofone"],["Y","iê","yate","iate"],["Z","sêta","zapato","sapato"]
];
const cubos = document.getElementById("cubos");
let cubosGirados = new Set();
cubos.innerHTML = alfabeto.map(([L, nome, pal, trad], i) => `
  <button class="cubo-btn" type="button" data-i="${i}" aria-label="Letra ${L}. Toque para girar.">
    <span class="cubo">
      <span class="face-c f1">${L}</span>
      <span class="face-c f2"><span><b>${pal}</b><small>palavra</small></span></span>
      <span class="face-c f3"><span><b>${trad}</b><small>tradução</small></span></span>
      <span class="face-c f4"><span><b>${nome}</b><small>nome da letra</small></span></span>
    </span>
  </button>`).join("");
cubos.querySelectorAll(".cubo-btn").forEach(b => {
  let giro = 0;
  b.addEventListener("click", () => {
    giro -= 90;
    b.querySelector(".cubo").style.setProperty("--giro", giro + "deg");
    const face = ((-giro / 90) % 4);
    if (face === 1) falar(alfabeto[b.dataset.i][2], "es");
    cubosGirados.add(b.dataset.i);
    if (cubosGirados.size >= 10) ganharCarimbo("alfabeto");
  });
});
document.getElementById("onda-cubos").addEventListener("click", () => {
  cubos.querySelectorAll(".cubo-btn").forEach((b, i) => setTimeout(() => {
    const c = b.querySelector(".cubo");
    const atual = parseInt(c.style.getPropertyValue("--giro") || "0");
    c.style.setProperty("--giro", (atual - 360) + "deg");
  }, i * 45));
});

/* ---------- E. ÁRVORE DAS LÍNGUAS ---------- */
const nos = {
  latim:  { x: 150, y: 120, nome: "Latim", sub: "Lácio, Itália antiga", cor: "#8a5bd6", info: "Surgiu no Lácio e acompanhou a expansão romana. Depois da Antiguidade, continuou presente na religião, na ciência, no ensino e no direito." },
  falado: { x: 470, y: 120, nome: "Latim falado", sub: "o latim do dia a dia", cor: "#8a5bd6", info: "As línguas românicas não vieram do latim dos livros, e sim das variedades do latim falado pelas pessoas." },
  es:     { x: 820, y: 40,  nome: "Espanhol", sub: "Península Ibérica", cor: "#d9452a", info: "Desenvolveu-se a partir do latim falado na Península Ibérica e chegou às Américas com a expansão colonial." },
  pt:     { x: 820, y: 120, nome: "Português", sub: "a sua língua", cor: "#3b6fb6", info: "Também é uma língua românica. Por isso tantas palavras se parecem com as do espanhol e do italiano." },
  it:     { x: 820, y: 200, nome: "Italiano", sub: "base toscana", cor: "#1f9a57", info: "Consolidou-se com forte influência do dialeto toscano, a língua de Dante Alighieri." },
  tupi:   { x: 150, y: 340, nome: "Família tupi-guarani", sub: "América do Sul", cor: "#c48a00", info: "É uma família de línguas, e não uma língua só. Não tem parentesco com o latim." },
  gn:     { x: 820, y: 300, nome: "Guarani paraguaio", sub: "avañe’ẽ", cor: "#c48a00", info: "Língua indígena viva, oficial no Paraguai ao lado do espanhol. É o idioma do módulo 4." },
  outras: { x: 820, y: 380, nome: "Outras línguas", sub: "da mesma família", cor: "#c48a00", info: "A família tupi-guarani inclui várias outras línguas, diferentes do guarani paraguaio." }
};
const ligacoes = [["latim", "falado"], ["falado", "es"], ["falado", "pt"], ["falado", "it"], ["tupi", "gn"], ["tupi", "outras"]];
const W = 220, H = 60;
const svgArvore = document.getElementById("arvore-svg");
svgArvore.innerHTML =
  ligacoes.map(([a, b]) => {
    const A = nos[a], B = nos[b];
    const x1 = A.x + W / 2, x2 = B.x - W / 2, mx = (x1 + x2) / 2;
    return `<path class="galho" stroke="${B.cor}" d="M${x1},${A.y} C${mx},${A.y} ${mx},${B.y} ${x2},${B.y}"/>`;
  }).join("") +
  Object.entries(nos).map(([id, n]) => `
    <g class="no" data-id="${id}" tabindex="0" role="button" aria-label="${n.nome}">
      <rect x="${n.x - W / 2}" y="${n.y - H / 2}" width="${W}" height="${H}" rx="16" fill="#fff" stroke="${n.cor}" stroke-width="2"/>
      <text x="${n.x}" y="${n.y + 2}" text-anchor="middle" fill="${n.cor}">${n.nome}</text>
      <text class="sub" x="${n.x}" y="${n.y + 20}" text-anchor="middle" fill="#5d6372">${n.sub}</text>
    </g>`).join("");
function mostrarNo(id) {
  const n = nos[id];
  svgArvore.querySelectorAll(".no").forEach(g => g.classList.toggle("ativo", g.dataset.id === id));
  const info = document.getElementById("arvore-info");
  info.style.setProperty("--cor", n.cor);
  info.innerHTML = `<b>${n.nome}</b><p>${n.info}</p>`;
}
svgArvore.addEventListener("click", e => { const g = e.target.closest(".no"); if (g) mostrarNo(g.dataset.id); });
svgArvore.addEventListener("keydown", e => { const g = e.target.closest(".no"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); mostrarNo(g.dataset.id); } });
mostrarNo("pt");
// inclina a árvore em 3D seguindo o mouse
const arvore = document.getElementById("arvore");
if (matchMedia("(hover: hover)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  arvore.addEventListener("pointermove", e => {
    const r = arvore.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    arvore.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
  });
  arvore.addEventListener("pointerleave", () => arvore.style.transform = "");
}

/* ---------- F. JOGO DA MEMÓRIA ---------- */
const corEscura = { es: "#d9452a", it: "#1f9a57", la: "#8a5bd6", gn: "#c48a00" };
const paresBase = vocab.filter(v => v.gn); // as 6 palavras que existem nos 4 idiomas
let linguaMem = "es", abertas = [], travado = false, jogadas = 0, pares = 0, inicioMem = null, timerMem = null;

const chipsMem = document.getElementById("chips-mem");
chipsMem.innerHTML = idiomas.map(l => `<button class="chip" type="button" data-id="${l.id}" style="--cor:${l.cor}">${l.nome}</button>`).join("");
chipsMem.addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) { linguaMem = b.dataset.id; novoJogo(); } });
document.getElementById("mem-novo").addEventListener("click", novoJogo);

function novoJogo() {
  chipsMem.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.id === linguaMem));
  const l = porId(linguaMem);
  const cartas = paresBase.flatMap((v, i) => [{ par: i, tipo: "img", v }, { par: i, tipo: "palavra", v }]);
  for (let i = cartas.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cartas[i], cartas[j]] = [cartas[j], cartas[i]]; }
  const tab = document.getElementById("tabuleiro");
  tab.style.setProperty("--cor", l.cor);
  tab.innerHTML = cartas.map((c, k) => `
    <button class="mcarta" type="button" data-par="${c.par}" aria-label="Carta ${k + 1}, virada para baixo">
      <span class="mcarta-dentro">
        <span class="mf"></span>
        <span class="mv">${c.tipo === "img" ? `<img src="img/${c.v.img}.webp" alt="${c.v.pt}">` : `<b>${c.v[linguaMem]}</b>`}</span>
      </span>
    </button>`).join("");
  abertas = []; travado = false; jogadas = 0; pares = 0; inicioMem = null;
  clearInterval(timerMem);
  document.getElementById("mem-jogadas").textContent = 0;
  document.getElementById("mem-pares").textContent = `0/${paresBase.length}`;
  document.getElementById("mem-tempo").textContent = "0s";
  document.getElementById("vitoria").textContent = "";
  tab.querySelectorAll(".mcarta").forEach(c => c.addEventListener("click", () => abrirCarta(c)));
}

function abrirCarta(c) {
  if (travado || c.classList.contains("aberta") || c.classList.contains("par")) return;
  if (!inicioMem) {
    inicioMem = Date.now();
    timerMem = setInterval(() => document.getElementById("mem-tempo").textContent = Math.round((Date.now() - inicioMem) / 1000) + "s", 500);
  }
  c.classList.add("aberta");
  c.setAttribute("aria-label", c.querySelector(".mv").textContent.trim() || c.querySelector("img").alt);
  abertas.push(c);
  if (abertas.length < 2) return;
  jogadas++;
  document.getElementById("mem-jogadas").textContent = jogadas;
  const [a, b] = abertas;
  if (a.dataset.par === b.dataset.par) {
    a.classList.add("par"); b.classList.add("par");
    abertas = []; pares++;
    document.getElementById("mem-pares").textContent = `${pares}/${paresBase.length}`;
    const palavra = paresBase[a.dataset.par][linguaMem];
    falar(palavra, linguaMem);
    if (pares === paresBase.length) {
      clearInterval(timerMem);
      const s = Math.round((Date.now() - inicioMem) / 1000);
      document.getElementById("vitoria").textContent = `Você venceu em ${jogadas} jogadas e ${s} segundos!`;
      ganharCarimbo("memoria"); confete();
    }
  } else {
    travado = true;
    setTimeout(() => { a.classList.add("erro"); b.classList.add("erro"); }, 500);
    setTimeout(() => {
      [a, b].forEach(x => { x.classList.remove("aberta", "erro"); x.setAttribute("aria-label", "Carta virada para baixo"); });
      abertas = []; travado = false;
    }, 1100);
  }
}
novoJogo();

/* ---------- G. MONTE A FRASE (frases do livro) ---------- */
const frases = {
  es: [["Me llamo Carlos", "Meu nome é Carlos"], ["¿Cómo te llamas?", "Como você se chama?"], ["Tengo dos libros", "Tenho dois livros"], ["¿Puedes repetir?", "Pode repetir?"], ["Estoy bien", "Estou bem"]],
  it: [["Mi chiamo Anna", "Eu me chamo Anna"], ["Come ti chiami?", "Como você se chama?"], ["Dov’è il bagno?", "Onde fica o banheiro?"], ["Quanto costa?", "Quanto custa?"], ["Sto bene", "Estou bem"]],
  la: [["Mihi nomen est Carolus", "Meu nome é Carlos"], ["Quid est nomen tibi?", "Qual é seu nome?"], ["Gratias tibi ago", "Agradeço a você"], ["Bene valeo", "Estou bem"], ["Quid agis?", "Como vai?"]],
  gn: [["Che réra Ana", "Meu nome é Ana"], ["Mba’éichapa nde réra?", "Como você se chama?"], ["Che ndaikuaái", "Eu não sei"], ["Che aikuaa", "Eu sei"]]
};
let linguaFrase = "es", fraseIdx = 0, acertosFrase = 0, resposta = [], banco = [];
const chipsFrase = document.getElementById("chips-frase");
chipsFrase.innerHTML = idiomas.map(l => `<button class="chip" type="button" data-id="${l.id}" style="--cor:${l.cor};--cor-escura:${corEscura[l.id]}">${l.nome}</button>`).join("");
chipsFrase.addEventListener("click", e => { const b = e.target.closest(".chip"); if (b) { linguaFrase = b.dataset.id; fraseIdx = 0; novaFrase(); } });

function novaFrase() {
  chipsFrase.querySelectorAll(".chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.id === linguaFrase));
  const [frase, trad] = frases[linguaFrase][fraseIdx % frases[linguaFrase].length];
  document.getElementById("frase-trad").textContent = trad;
  const palavras = frase.split(" ");
  banco = palavras.map((p, i) => ({ p, i }));
  do { banco.sort(() => Math.random() - .5); } while (banco.length > 1 && banco.every((b, k) => b.i === k));
  resposta = [];
  document.getElementById("resposta").className = "resposta";
  document.getElementById("frase-status").textContent = "Toque nas palavras na ordem certa.";
  document.getElementById("frase-ouvir").innerHTML = "";
  desenharFrase();
}
function desenharFrase() {
  const cor = porId(linguaFrase).cor;
  const chip = (o, onde) => `<button class="palavra-chip" type="button" data-onde="${onde}" data-i="${o.i}" style="--cor:${cor}">${o.p}</button>`;
  document.getElementById("resposta").innerHTML = resposta.map(o => chip(o, "resposta")).join("");
  document.getElementById("banco").innerHTML = banco.map(o => chip(o, "banco")).join("");
}
document.getElementById("frase-caixa").addEventListener("click", e => {
  const b = e.target.closest(".palavra-chip"); if (!b) return;
  const i = +b.dataset.i;
  if (b.dataset.onde === "banco") { const k = banco.findIndex(o => o.i === i); resposta.push(banco.splice(k, 1)[0]); }
  else { const k = resposta.findIndex(o => o.i === i); banco.push(resposta.splice(k, 1)[0]); }
  document.getElementById("resposta").className = "resposta";
  desenharFrase();
});
document.getElementById("frase-conferir").addEventListener("click", () => {
  const [frase] = frases[linguaFrase][fraseIdx % frases[linguaFrase].length];
  const caixa = document.getElementById("resposta");
  if (banco.length) { document.getElementById("frase-status").textContent = "Use todas as palavras antes de conferir."; return; }
  const certo = resposta.map(o => o.p).join(" ") === frase;
  caixa.className = "resposta " + (certo ? "certo" : "errado");
  if (certo) {
    acertosFrase++;
    document.getElementById("frase-status").textContent = `Certo! ${acertosFrase} ${acertosFrase === 1 ? "frase montada" : "frases montadas"}.`;
    document.getElementById("frase-ouvir").innerHTML = botaoOuvir(frase, linguaFrase);
    falar(frase, linguaFrase);
    if (acertosFrase >= 3) ganharCarimbo("frase");
  } else {
    document.getElementById("frase-status").textContent = "Quase! Toque numa palavra para devolvê-la e tente de novo.";
  }
});
document.getElementById("frase-proxima").addEventListener("click", () => { fraseIdx++; novaFrase(); });
novaFrase();

/* refaz o módulo e a arara agora que os botões de ouvir existem */
const abaSel = document.querySelector('.aba[aria-selected="true"]');
if (abaSel) mostrarModulo(abaSel.dataset.id);
atualizarInfoArara();
