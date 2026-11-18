/* ============================================================
   CENA.JS — o globo holográfico futurista (Three.js)
   Peças da cena:
   1. globo: núcleo escuro, pontos que piscam, linhas neon,
      brilho de borda (shader) e um anel de scanner
   2. rotas de luz entre os lugares de origem, com pulsos
   3. luas dos idiomas: núcleo + casca geométrica + palavras
   4. letras dos alfabetos flutuando em órbita
   5. satélites, grade holográfica no chão e estrelas
   6. câmera que voa até cada idioma conforme a rolagem
   ============================================================ */
function criarCena() {
  const palco = document.getElementById("palco");
  const canvas = document.getElementById("cena");
  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NEON = new THREE.Color("#3df2ff");
  const ROSA = new THREE.Color("#ff4fd8");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070b18, 10, 26);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);

  scene.add(new THREE.AmbientLight(0x8899ff, 0.5));
  const luz = new THREE.DirectionalLight(0xffffff, 0.9);
  luz.position.set(5, 4, 7);
  scene.add(luz);

  const mundo = new THREE.Group();
  scene.add(mundo);

  /* ---------- texturas desenhadas em canvas ---------- */
  function texturaBrilho() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const BRILHO = texturaBrilho();
  function brilho(cor, tamanho, opacidade = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: BRILHO, color: cor, transparent: true, opacity: opacidade, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(tamanho);
    return s;
  }
  const cacheTexto = {};
  function texturaTexto(txt, fonte = "600 54px 'Unbounded', 'Manrope', system-ui, sans-serif", larg = 512) {
    const chave = txt + fonte;
    if (cacheTexto[chave]) return cacheTexto[chave];
    const c = document.createElement("canvas"); c.width = larg; c.height = 128;
    const g = c.getContext("2d");
    g.font = fonte; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    g.shadowColor = "rgba(255,255,255,.9)"; g.shadowBlur = 14;
    g.fillText(txt, larg / 2, 64);
    return (cacheTexto[chave] = new THREE.CanvasTexture(c));
  }
  function spriteTexto(txt, cor, escalaX, escalaY, fonte, larg) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texturaTexto(txt, fonte, larg), color: cor, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(escalaX, escalaY, 1);
    return s;
  }

  /* ---------- 1. GLOBO ---------- */
  const R = 1.8;
  function ponto(lat, lon, raio) {
    const phi = (90 - lat) * Math.PI / 180, th = (lon + 180) * Math.PI / 180;
    return new THREE.Vector3(-raio * Math.sin(phi) * Math.cos(th), raio * Math.cos(phi), raio * Math.sin(phi) * Math.sin(th));
  }

  // núcleo escuro (esconde o que está atrás do globo)
  mundo.add(new THREE.Mesh(new THREE.SphereGeometry(R * .97, 64, 64), new THREE.MeshBasicMaterial({ color: 0x08142a })));

  // brilho de borda (efeito Fresnel): mais forte onde a esfera "vira" para longe de você
  const vertFresnel = `
    varying vec3 vN; varying vec3 vV;
    void main() {
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`;
  const fragFresnel = `
    uniform vec3 uCor; uniform float uForca; uniform float uPot;
    varying vec3 vN; varying vec3 vV;
    void main() {
      float f = pow(1.0 - abs(dot(vN, vV)), uPot);
      gl_FragColor = vec4(uCor, f * uForca);
    }`;
  function fresnel(raio, cor, forca, pot, lado) {
    return new THREE.Mesh(new THREE.SphereGeometry(raio, 64, 64), new THREE.ShaderMaterial({
      uniforms: { uCor: { value: cor }, uForca: { value: forca }, uPot: { value: pot } },
      vertexShader: vertFresnel, fragmentShader: fragFresnel,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: lado
    }));
  }
  mundo.add(fresnel(R * .99, NEON, 1.1, 2.6, THREE.FrontSide));
  mundo.add(fresnel(R * 1.25, new THREE.Color("#5a6bff"), .9, 3.2, THREE.BackSide));

  // pontos que piscam; perto de cada lugar de origem eles ganham a cor do idioma
  const origens = idiomas.map(l => ({ p: ponto(l.lat, l.lon, 1).normalize(), cor: new THREE.Color(l.cor) }));
  const N = 3200, pos = [], cores = [], fases = [];
  const base = new THREE.Color("#3a8fb8");
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = i * Math.PI * (3 - Math.sqrt(5));
    const v = new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r);
    pos.push(v.x * R, v.y * R, v.z * R);
    let c = base.clone();
    origens.forEach(o => { const d = v.distanceTo(o.p); if (d < .32) c.lerp(o.cor, 1 - d / .32); });
    cores.push(c.r, c.g, c.b);
    fases.push(Math.random());
  }
  const gPontos = new THREE.BufferGeometry();
  gPontos.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  gPontos.setAttribute("aCor", new THREE.Float32BufferAttribute(cores, 3));
  gPontos.setAttribute("aFase", new THREE.Float32BufferAttribute(fases, 1));
  const matPontos = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uPx: { value: 3.2 * renderer.getPixelRatio() } },
    vertexShader: `
      uniform float uT; uniform float uPx;
      attribute vec3 aCor; attribute float aFase;
      varying vec3 vC; varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        float pisca = 0.5 + 0.5 * sin(uT * 2.2 + aFase * 6.2831);
        vA = 0.35 + pisca * 0.65; vC = aCor;
        gl_PointSize = uPx * (0.8 + pisca * 0.7) * (9.0 / -mv.z);
      }`,
    fragmentShader: `
      varying vec3 vC; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(vC, smoothstep(0.5, 0.0, d) * vA);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  mundo.add(new THREE.Points(gPontos, matPontos));

  // linhas de latitude e longitude neon
  const linhasPos = [];
  for (let lat = -60; lat <= 60; lat += 30) for (let k = 0; k < 96; k++) {
    const a = ponto(lat, k / 96 * 360, R * 1.005), b = ponto(lat, (k + 1) / 96 * 360, R * 1.005);
    linhasPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let lon = 0; lon < 360; lon += 30) for (let k = 0; k < 48; k++) {
    const a = ponto(-90 + k / 48 * 180, lon, R * 1.005), b = ponto(-90 + (k + 1) / 48 * 180, lon, R * 1.005);
    linhasPos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const gLinhas = new THREE.BufferGeometry();
  gLinhas.setAttribute("position", new THREE.Float32BufferAttribute(linhasPos, 3));
  mundo.add(new THREE.LineSegments(gLinhas, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: .14, blending: THREE.AdditiveBlending, depthWrite: false })));

  // anel de scanner que sobe e desce pelo globo
  const circ = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, k) => new THREE.Vector3(Math.cos(k / 128 * Math.PI * 2), 0, Math.sin(k / 128 * Math.PI * 2))));
  const scanner = new THREE.Line(circ, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false }));
  const scanner2 = new THREE.Line(circ, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false }));
  mundo.add(scanner, scanner2);

  // marcadores nos lugares de origem: ponto + anel pulsante + coluna de luz
  const pinos = idiomas.map(l => {
    const cor = new THREE.Color(l.cor), p = ponto(l.lat, l.lon, R * 1.01);
    const g = brilho(cor, .32); g.position.copy(p); mundo.add(g);
    const onda = new THREE.Mesh(new THREE.RingGeometry(.07, .09, 40), new THREE.MeshBasicMaterial({ color: cor, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    onda.position.copy(p); onda.lookAt(p.clone().multiplyScalar(2)); mundo.add(onda);
    const topo = p.clone().setLength(R * 1.32);
    const coluna = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p, topo]), new THREE.LineBasicMaterial({ color: cor, transparent: true, opacity: .8, blending: THREE.AdditiveBlending }));
    mundo.add(coluna);
    return { id: l.id, p, onda };
  });
  const pinoDe = id => pinos.find(x => x.id === id).p;

  /* ---------- 2. ROTAS DE LUZ ---------- */
  // Latim → Espanhol, Latim → Italiano e Espanhol ↔ Guarani (as duas línguas oficiais do Paraguai)
  const rotas = [["la", "es"], ["la", "it"], ["es", "gn"]].map(([a, b], i) => {
    const A = pinoDe(a), B = pinoDe(b);
    const meio = A.clone().add(B).multiplyScalar(.5);
    meio.setLength(R + .35 + A.distanceTo(B) * .45);
    const curva = new THREE.QuadraticBezierCurve3(A, meio, B);
    const pts = curva.getPoints(80);
    const cA = new THREE.Color(porId(a).cor), cB = new THREE.Color(porId(b).cor), vc = [];
    pts.forEach((_, k) => { const c = cA.clone().lerp(cB, k / 80); vc.push(c.r, c.g, c.b); });
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.setAttribute("color", new THREE.Float32BufferAttribute(vc, 3));
    mundo.add(new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false })));
    const pulsos = [0, .5].map(o => { const s = brilho(0xffffff, .28); mundo.add(s); return { s, o }; });
    return { curva, pulsos, vel: .22 + i * .05 };
  });

  /* ---------- 3. LUAS DOS IDIOMAS ---------- */
  const ORB = 3.5;
  const orbita = new THREE.Line(circ, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: .22, blending: THREE.AdditiveBlending }));
  orbita.scale.setScalar(ORB); mundo.add(orbita);
  // marquinhas na órbita, como uma régua de nave
  const marcas = [];
  for (let k = 0; k < 72; k++) {
    const a = k / 72 * Math.PI * 2, r1 = ORB - (k % 6 ? .04 : .12), r2 = ORB + (k % 6 ? .04 : .12);
    marcas.push(Math.cos(a) * r1, 0, Math.sin(a) * r1, Math.cos(a) * r2, 0, Math.sin(a) * r2);
  }
  const gMarcas = new THREE.BufferGeometry(); gMarcas.setAttribute("position", new THREE.Float32BufferAttribute(marcas, 3));
  const regua = new THREE.LineSegments(gMarcas, new THREE.LineBasicMaterial({ color: NEON, transparent: true, opacity: .35, blending: THREE.AdditiveBlending }));
  mundo.add(regua);

  const luas = idiomas.map((l, i) => {
    const cor = new THREE.Color(l.cor);
    const grupo = new THREE.Group();
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(.26, 32, 32), new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: .8, roughness: .3 }));
    const casca = new THREE.Mesh(new THREE.IcosahedronGeometry(.46, 1), new THREE.MeshBasicMaterial({ color: cor, wireframe: true, transparent: true, opacity: .55, blending: THREE.AdditiveBlending }));
    const casca2 = new THREE.Mesh(new THREE.OctahedronGeometry(.62, 0), new THREE.MeshBasicMaterial({ color: cor, wireframe: true, transparent: true, opacity: .25, blending: THREE.AdditiveBlending }));
    const aura = brilho(cor, 1.6, .55);
    grupo.add(nucleo, casca, casca2, aura);
    if (l.id === "la") {
      const anel = new THREE.Mesh(new THREE.TorusGeometry(.78, .015, 8, 90), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: .9, blending: THREE.AdditiveBlending }));
      anel.rotation.x = 1.25; grupo.add(anel);
    }
    mundo.add(grupo);

    // palavras que orbitam a lua quando ela está ativa
    const nuvem = new THREE.Group();
    const sprites = l.palavras3d.map((w, k) => {
      const s = spriteTexto(w, cor, 1.6, .4);
      const t = k / l.palavras3d.length * Math.PI * 2;
      s.position.set(Math.cos(t) * 1.3, Math.sin(t * 2) * .35 + .1, Math.sin(t) * 1.3);
      nuvem.add(s); return s;
    });
    mundo.add(nuvem);

    // feixe da lua até o lugar de origem
    const gF = new THREE.BufferGeometry().setFromPoints(new Array(48).fill().map(() => new THREE.Vector3()));
    const feixe = new THREE.Line(gF, new THREE.LineDashedMaterial({ color: cor, dashSize: .1, gapSize: .07, transparent: true, opacity: .4, blending: THREE.AdditiveBlending }));
    mundo.add(feixe);

    const et = document.createElement("span");
    et.className = "etiqueta"; et.style.setProperty("--cor", l.cor); et.textContent = l.nome;
    document.getElementById("etiquetas").appendChild(et);

    nucleo.userData.passo = i + 1;
    return { l, grupo, nucleo, casca, casca2, aura, nuvem, sprites, feixe, et, ang: i * Math.PI / 2, escala: 1, pino: pinoDe(l.id) };
  });

  /* ---------- 4. LETRAS FLUTUANDO ---------- */
  const letrasPorIdioma = {
    es: ["ñ", "¿", "¡", "á", "é", "ll", "Ñ", "ch"],
    it: ["à", "è", "ò", "gn", "gli", "sc", "zz", "cc"],
    la: ["V", "X", "IV", "M", "C", "L", "æ", "IX"],
    gn: ["ẽ", "ỹ", "ũ", "’", "mb", "nd", "ã", "õ"]
  };
  const nuvemLetras = new THREE.Group();
  const letras = [];
  idiomas.forEach(l => letrasPorIdioma[l.id].forEach((ch, k) => {
    for (let rep = 0; rep < 2; rep++) {
      const s = spriteTexto(ch, new THREE.Color(l.cor), .5, .5, "700 84px 'Manrope', system-ui, sans-serif", 128);
      const raio = 2.4 + Math.random() * 2.6, a = Math.random() * Math.PI * 2, y = (Math.random() - .5) * 3.4;
      s.userData = { raio, a, y, vel: (.04 + Math.random() * .08) * (Math.random() < .5 ? -1 : 1), fase: Math.random() * 6 };
      s.material.opacity = .5;
      nuvemLetras.add(s); letras.push(s);
    }
  }));
  mundo.add(nuvemLetras);

  /* ---------- 5. SATÉLITES, CHÃO E ESTRELAS ---------- */
  const satelites = [0, 1, 2].map(i => {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(.12, .06, .06), new THREE.MeshStandardMaterial({ color: 0xdfe8ff, metalness: .8, roughness: .3 }));
    const painel = new THREE.Mesh(new THREE.BoxGeometry(.34, .005, .1), new THREE.MeshBasicMaterial({ color: 0x2f6bff }));
    const luzinha = brilho(i === 1 ? ROSA : NEON, .25);
    g.add(corpo, painel, luzinha);
    const eixo = new THREE.Group(); eixo.rotation.set(.4 + i * .5, i * 1.3, .3 - i * .4); eixo.add(g);
    mundo.add(eixo);
    return { g, luzinha, raio: 2.35 + i * .25, vel: .5 - i * .12, fase: i * 2 };
  });

  const grade = new THREE.PolarGridHelper(9, 24, 10, 96, 0x3df2ff, 0x1d4a7a);
  grade.position.y = -3.4;
  grade.material.transparent = true; grade.material.opacity = .28; grade.material.depthWrite = false;
  scene.add(grade);
  const pulsoChao = new THREE.Line(circ, new THREE.LineBasicMaterial({ color: NEON, transparent: true, blending: THREE.AdditiveBlending }));
  pulsoChao.position.y = -3.39; scene.add(pulsoChao);

  const ep = [], ec = [];
  for (let i = 0; i < 1800; i++) {
    const v = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize().multiplyScalar(28 + Math.random() * 30);
    ep.push(v.x, v.y, v.z);
    const c = new THREE.Color().setHSL(.55 + Math.random() * .35, .8, .75); ec.push(c.r, c.g, c.b);
  }
  const gE = new THREE.BufferGeometry();
  gE.setAttribute("position", new THREE.Float32BufferAttribute(ep, 3));
  gE.setAttribute("color", new THREE.Float32BufferAttribute(ec, 3));
  const estrelas = new THREE.Points(gE, new THREE.PointsMaterial({ size: .09, vertexColors: true, transparent: true, opacity: .8, fog: false }));
  scene.add(estrelas);

  /* ---------- 6. CÂMERA ---------- */
  const camPos = new THREE.Vector3(0, 1.4, 12), camOlha = new THREE.Vector3();
  const alvoPos = camPos.clone(), alvoOlha = new THREE.Vector3();
  let alvoRot = 0, passo = 0, celular = false;
  function definirAlvo() {
    if (passo === 0) {
      alvoPos.set(celular ? 0 : -1.9, 1.7, celular ? 14 : 11.5);
      alvoOlha.set(celular ? 0 : -1.9, celular ? -.7 : 0, 0);
    } else {
      alvoRot = luas[passo - 1].ang - Math.PI / 2;
      if (celular) { alvoPos.set(0, .9, 8.6); alvoOlha.set(0, -1.3, 1.5); }
      else { alvoPos.set(-2.1, .8, 8.6); alvoOlha.set(-2.1, 0, 1.2); }
    }
  }
  const mouse = { x: 0, y: 0 };
  addEventListener("pointermove", e => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; });

  // clicar numa lua leva até o idioma dela
  const raycaster = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function luaSob(e) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ptr, camera);
    const hit = raycaster.intersectObjects(luas.map(o => o.nucleo).concat(luas.map(o => o.casca)), false)[0];
    if (!hit) return null;
    return luas.find(o => o.nucleo === hit.object || o.casca === hit.object);
  }
  canvas.addEventListener("pointermove", e => { canvas.style.cursor = luaSob(e) ? "pointer" : ""; });
  canvas.addEventListener("click", e => {
    const o = luaSob(e);
    if (o) document.getElementById(`jornada-${o.l.id}`).scrollIntoView({ behavior: "smooth" });
  });

  function ajustar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    celular = w < 800; definirAlvo();
  }
  new ResizeObserver(ajustar).observe(palco);
  ajustar();

  let visivel = true;
  new IntersectionObserver(e => { visivel = e[0].isIntersecting; }).observe(palco);

  const v = new THREE.Vector3(), relogio = new THREE.Clock();
  const vel = calmo ? .25 : 1;
  function quadro() {
    requestAnimationFrame(quadro);
    if (!visivel) return;
    const t = relogio.getElapsedTime() * vel;
    matPontos.uniforms.uT.value = t;

    if (passo === 0) { mundo.rotation.y += .0018 * vel; alvoRot = mundo.rotation.y; }
    else {
      const d = ((alvoRot - mundo.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      mundo.rotation.y += d * .05;
    }
    mundo.rotation.x = .2 + Math.sin(t * .3) * .03;

    camPos.lerp(alvoPos, .045); camOlha.lerp(alvoOlha, .045);
    camera.position.set(camPos.x + mouse.x * .7, camPos.y - mouse.y * .45, camPos.z);
    camera.lookAt(camOlha);

    // scanner
    const sy = Math.sin(t * .7) * R * .92, sr = Math.sqrt(Math.max(R * R - sy * sy, .01)) * 1.012;
    scanner.position.y = sy; scanner.scale.set(sr, 1, sr);
    const sy2 = Math.sin(t * .7 - .25) * R * .92, sr2 = Math.sqrt(Math.max(R * R - sy2 * sy2, .01)) * 1.012;
    scanner2.position.y = sy2; scanner2.scale.set(sr2, 1, sr2);

    pinos.forEach((p, i) => { const k = (t * .8 + i * .25) % 1; p.onda.scale.setScalar(1 + k * 3.5); p.onda.material.opacity = (1 - k); });
    rotas.forEach(r => r.pulsos.forEach(pp => { pp.s.position.copy(r.curva.getPoint((t * r.vel + pp.o) % 1)); }));
    regua.rotation.y = -t * .05;

    luas.forEach((o, i) => {
      const ativa = passo === i + 1;
      o.grupo.position.set(Math.cos(o.ang) * ORB, Math.sin(t * .8 + i) * .2, Math.sin(o.ang) * ORB);
      o.escala += ((ativa ? 1.9 : passo === 0 ? 1.1 : .8) - o.escala) * .08;
      o.grupo.scale.setScalar(o.escala);
      o.casca.rotation.set(t * .6, t * .9, 0);
      o.casca2.rotation.set(-t * .4, -t * .3, t * .2);
      o.aura.material.opacity = ativa ? .7 + Math.sin(t * 4) * .15 : .45;

      o.nuvem.position.copy(o.grupo.position);
      o.nuvem.rotation.y = t * .35;
      o.sprites.forEach(s => { s.material.opacity += ((ativa ? .95 : 0) - s.material.opacity) * .06; });

      const meio = o.grupo.position.clone().add(o.pino).multiplyScalar(.5).setLength(R + 1.5);
      const at = o.feixe.geometry.attributes.position;
      new THREE.QuadraticBezierCurve3(o.grupo.position, meio, o.pino).getPoints(47).forEach((p, k) => at.setXYZ(k, p.x, p.y, p.z));
      at.needsUpdate = true; o.feixe.computeLineDistances();
      o.feixe.material.opacity += ((ativa ? .95 : .3) - o.feixe.material.opacity) * .06;

      o.grupo.getWorldPosition(v);
      const longe = v.distanceTo(camera.position) > camera.position.length() + .5;
      v.project(camera);
      o.et.style.left = ((v.x + 1) / 2 * palco.clientWidth) + "px";
      o.et.style.top = ((-v.y + 1) / 2 * palco.clientHeight) + "px";
      o.et.style.opacity = ativa ? 0 : longe ? .3 : 1;
    });

    const foco = passo === 0 ? .5 : .18; // letras ficam discretas quando um idioma está em foco
    letras.forEach(s => {
      const d = s.userData;
      d.a += d.vel * .01 * vel;
      s.position.set(Math.cos(d.a) * d.raio, d.y + Math.sin(t + d.fase) * .15, Math.sin(d.a) * d.raio);
      s.material.opacity += (foco * (.6 + .4 * Math.sin(t * 1.5 + d.fase)) - s.material.opacity) * .05;
    });

    satelites.forEach(s => {
      const a = t * s.vel + s.fase;
      s.g.position.set(Math.cos(a) * s.raio, 0, Math.sin(a) * s.raio);
      s.g.rotation.y = -a;
      s.luzinha.material.opacity = Math.sin(t * 6 + s.fase) > .3 ? 1 : .15;
    });

    grade.rotation.y = t * .03;
    const kc = (t * .35) % 1; pulsoChao.scale.setScalar(.5 + kc * 8.5); pulsoChao.material.opacity = (1 - kc) * .7;
    estrelas.rotation.y = t * .008;

    renderer.render(scene, camera);
  }
  quadro();

  const hudLugar = document.getElementById("hud-lugar"), hudCoord = document.getElementById("hud-coord"), hudSinal = document.getElementById("hud-sinal");
  function atualizarHud() {
    if (!hudLugar) return;
    if (passo === 0) { hudLugar.textContent = "VARREDURA GLOBAL"; hudCoord.textContent = "4 IDIOMAS · 4 ORIGENS"; hudSinal.style.setProperty("--cor", "#3df2ff"); return; }
    const l = idiomas[passo - 1];
    const f = (n, p, m) => `${Math.abs(n).toFixed(1)}° ${n >= 0 ? p : m}`;
    hudLugar.textContent = `ORIGEM · ${l.lugar.toUpperCase()}`;
    hudCoord.textContent = `${f(l.lat, "N", "S")}  ${f(l.lon, "L", "O")}`;
    hudSinal.style.setProperty("--cor", l.cor);
  }
  atualizarHud();

  return { irPara(n) { passo = n; definirAlvo(); atualizarHud(); } };
}
