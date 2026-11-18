/* ============================================================
   EFEITOS.JS — detalhes de interface futurista
   1. barra de progresso de rolagem
   2. faixa de palavras em movimento (toque para ouvir)
   3. títulos que se "decodificam" ao aparecer
   4. luz que segue o cursor nos cartões de vidro
   5. botões magnéticos
   6. controle de números preenchido em neon
   ============================================================ */
const desktop = matchMedia("(hover: hover) and (pointer: fine)").matches;
const semMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. PROGRESSO ---------- */
const barraProg = document.createElement("div");
barraProg.className = "progresso-rolagem";
document.body.appendChild(barraProg);
addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  barraProg.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
}, { passive: true });

/* ---------- 2. FAIXA DE PALAVRAS ---------- */
(function montarFita() {
  const fita = document.getElementById("fita");
  if (!fita) return;
  const expr = idiomas.flatMap(l => l.expressoes.slice(0, 4).map(([fr, , tr]) => ({ w: fr, pt: tr, l })));
  const pals = vocab.flatMap(v => idiomas.filter(l => v[l.id]).map(l => ({ w: v[l.id], pt: v.pt, l })));
  const embaralhar = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
  const item = o => `<button class="fita-item" type="button" style="--cor:${o.l.cor}" data-w="${o.w.replace(/"/g, "&quot;")}" data-id="${o.l.id}">
      <i></i><b>${o.w}</b><small>${o.pt} · ${o.l.nome}</small></button>`;
  [embaralhar(expr), embaralhar(pals).slice(0, 22)].forEach((lista, k) => {
    const linha = document.createElement("div");
    linha.className = "fita-linha" + (k ? " volta" : "");
    const html = lista.map(item).join("");
    linha.innerHTML = html + html; // repetido para o loop não ter emenda
    linha.querySelectorAll(".fita-item").forEach((b, i) => { if (i >= lista.length) { b.setAttribute("aria-hidden", "true"); b.tabIndex = -1; } });
    fita.appendChild(linha);
  });
  fita.addEventListener("click", e => {
    const b = e.target.closest(".fita-item"); if (!b) return;
    if (window.falar && vozLingua[b.dataset.id]) falar(b.dataset.w, b.dataset.id);
    else avisar(`${b.dataset.w}: em ${porId(b.dataset.id).nome}, pratique com falantes`);
  });
})();

/* ---------- 3. TÍTULOS QUE SE DECODIFICAM ---------- */
// roda toda vez que o título entra na tela, descendo ou subindo
const simbolos = "ñẽỹãõàèòæ¿¡’ÑXIVMCL0123456789#/<>";
function decodificar(el) {
  if (semMovimento || el.dataset.rodando) return;
  el.dataset.rodando = "1";
  const final = el.dataset.texto || (el.dataset.texto = el.textContent);
  el.setAttribute("aria-label", final);
  const total = 26;
  let quadro = 0;
  el.classList.add("decodificando");
  (function passo() {
    const revelado = Math.floor((quadro / total) * final.length);
    el.textContent = final.split("").map((c, i) =>
      i < revelado || c === " " ? c : simbolos[Math.floor(Math.random() * simbolos.length)]).join("");
    if (++quadro <= total) setTimeout(passo, 32);
    else { el.textContent = final; el.classList.remove("decodificando"); delete el.dataset.rodando; }
  })();
}
const obsTitulos = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) decodificar(e.target);
}), { threshold: .6 });
document.querySelectorAll(".titulo-secao h2, .painel-idioma h2").forEach(h => obsTitulos.observe(h));

/* ---------- 3b. ENTRADA AO ROLAR, NOS DOIS SENTIDOS ---------- */
// Cada elemento entra de baixo quando você desce e de cima quando você sobe.
// Quando sai da tela, ele "reseta" (fora da sua vista) para animar de novo.
document.querySelectorAll(".surge").forEach(el => el.classList.remove("surge", "fora"));
const alvosRevela = [
  ".passo .painel", ".titulo-secao", ".arara", ".info-arara", ".livro-palco", ".livro-controles",
  ".abas", ".modulo > *", ".numeros > *", ".linha-num", ".cubos-barra", ".cubo-btn", ".arvore",
  ".memoria-topo", ".mcarta", ".frase-caixa", ".tabela-caixa", ".comparar tbody tr", ".quiz", ".precisao"
];
const obsRevela = new IntersectionObserver(es => es.forEach(e => {
  const el = e.target;
  if (e.isIntersecting) {
    el.classList.remove("fora-baixo", "fora-cima");
  } else {
    el.classList.remove("fora-baixo", "fora-cima");
    el.classList.add(e.boundingClientRect.top > 0 ? "fora-baixo" : "fora-cima");
  }
}), { rootMargin: "0px 0px -6% 0px" });

function prepararRevela(raiz = document) {
  alvosRevela.forEach(sel => raiz.querySelectorAll(sel).forEach(el => {
    if (el.classList.contains("revela")) return;
    // itens irmãos entram em sequência (efeito cascata)
    const irmaos = [...el.parentElement.children].filter(x => x.matches(sel));
    const i = irmaos.indexOf(el);
    el.style.setProperty("--atraso", Math.min(i * 45, 600) + "ms");
    el.classList.add("revela");
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight) el.classList.add("fora-baixo");
    obsRevela.observe(el);
  }));
}
prepararRevela();

// conteúdos que são recriados (módulo, memória, números) entram animados de novo
["modulo", "tabuleiro", "linhas-num"].forEach(id => {
  const alvo = document.getElementById(id);
  if (alvo) new MutationObserver(() => prepararRevela(alvo.parentElement)).observe(alvo, { childList: true });
});

/* ---------- 4. LUZ QUE SEGUE O CURSOR ---------- */
if (desktop) {
  document.addEventListener("pointermove", e => {
    const el = e.target.closest(".bloco, .linha-num, .arvore, .frase-caixa, .quiz, .tabela-caixa, .arvore-info, .precisao");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
}

/* ---------- 5. BOTÕES MAGNÉTICOS ---------- */
if (desktop && !semMovimento) {
  document.addEventListener("pointermove", e => {
    const b = e.target.closest(".botao-claro, .botao-tinta, .botao-linha, .proxima, .seta");
    document.querySelectorAll(".ima").forEach(x => { if (x !== b) { x.style.translate = ""; x.classList.remove("ima"); } });
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) * .25, dy = (e.clientY - (r.top + r.height / 2)) * .35;
    b.classList.add("ima");
    b.style.translate = `${dx}px ${dy}px`;
  }, { passive: true });
}

/* ---------- 6. CONTROLE DE NÚMEROS ---------- */
const sliderNum = document.getElementById("slider");
if (sliderNum) {
  const pintar = () => sliderNum.style.setProperty("--pct", (sliderNum.value / sliderNum.max * 100) + "%");
  sliderNum.addEventListener("input", pintar); pintar();
}
