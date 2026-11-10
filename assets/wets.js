/* Wets · carrito y formulario de contraentrega.
 * Mismo motor que las landings de Importaciones JOG (contraentrega/formulario.js),
 * adaptado a un carrito con varios productos.
 *
 * El pedido sale por uno de dos caminos, según datos/config.mjs -> pedidos.endpoint:
 *   - vacío:  se arma el mensaje y se abre WhatsApp.
 *   - URL:    POST JSON al puente (el que crea la orden en Dropi). El puente responde
 *             { ok: true, numero, total } o { ok: false, problemas: ["..."] }.
 */
(function () {
  'use strict';
  const W = window.WETS;
  if (!W || typeof HTMLDialogElement !== 'function') return;
  const CFG = W.cfg, P = W.p;
  const RAIZ = new URL('..', document.currentScript.src).href;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const plata = (n) => '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const escapar = (t) => { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; };
  const descuentoPara = (n) => { for (const e of CFG.escalas) if (n >= e.desde) return e.descuento; return 0; };
  const url = (id) => RAIZ + 'p/' + id + '/';
  const foto = (id) => RAIZ + P[id].i;
  const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const BILLETE = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>';

  function rastrear(evento, datos) {
    try { if (window.fbq) window.fbq('track', evento, datos); } catch (e) {}
    try { if (window.gtag) window.gtag('event', { AddToCart: 'add_to_cart', InitiateCheckout: 'begin_checkout', Purchase: 'purchase' }[evento] || evento, datos); } catch (e) {}
  }

  // ───────────── carrito ─────────────
  const CLAVE = 'wets_carrito';
  let carro = {};
  function leer() {
    carro = {};
    try {
      const guardado = JSON.parse(localStorage.getItem(CLAVE)) || {};
      for (const id in guardado) if (P[id] && guardado[id] > 0) carro[id] = Math.min(20, Math.floor(guardado[id]));
    } catch (e) {}
  }
  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(carro)); } catch (e) {}
    pintarCuenta(true);
  }
  // items: [{id, q}] -> totales con el descuento por cantidad aplicado por unidad, como en JOG.
  function calcular(items) {
    const unidades = items.reduce((a, i) => a + i.q, 0);
    const d = descuentoPara(unidades);
    let subtotal = 0, total = 0;
    const lineas = items.map((i) => {
      const p = P[i.id], unidad = Math.round(p.pr * (1 - d));
      subtotal += p.pr * i.q; total += unidad * i.q;
      return { id: i.id, p: p, q: i.q, unidad: unidad, total: unidad * i.q };
    });
    return { lineas: lineas, unidades: unidades, d: d, subtotal: subtotal, ahorro: subtotal - total, total: total };
  }
  const itemsCarro = () => Object.keys(carro).map((id) => ({ id: id, q: carro[id] }));

  function pintarCuenta(salta) {
    const n = itemsCarro().reduce((a, i) => a + i.q, 0);
    $$('.js-cuenta').forEach((c) => {
      c.textContent = n; c.hidden = !n;
      if (salta && n) { c.classList.remove('salta'); void c.offsetWidth; c.classList.add('salta'); }
    });
  }

  function agregar(id, q) {
    if (!P[id]) return;
    carro[id] = Math.min(20, (carro[id] || 0) + (q || 1));
    guardar();
    rastrear('AddToCart', { currency: 'COP', value: P[id].pr * (q || 1), content_ids: [id], content_type: 'product' });
  }

  const dlgCarro = document.createElement('dialog');
  dlgCarro.className = 'carro';
  dlgCarro.setAttribute('aria-labelledby', 'carro-t');
  dlgCarro.innerHTML = '<header class="carro__cab"><h2 id="carro-t">Carrito de compras</h2><button type="button" class="x" data-acc="cerrar" aria-label="Cerrar el carrito">' + X + '</button></header>'
    + '<div class="carro__cuerpo js-cuerpo"></div><footer class="carro__pie js-pie"></footer>';
  document.body.appendChild(dlgCarro);

  function resumenHtml(c, etiquetaTotal) {
    return '<dl class="resumen"><div><dt>Subtotal</dt><dd>' + plata(c.subtotal) + '</dd></div>'
      + (c.d ? '<div class="ahorro"><dt>Descuento por cantidad (' + Math.round(c.d * 100) + '%)</dt><dd>-' + plata(c.ahorro) + '</dd></div>' : '')
      + '<div><dt>Envío</dt><dd>Gratis</dd></div>'
      + '<div class="total"><dt>' + etiquetaTotal + '</dt><dd>' + plata(c.total) + '</dd></div></dl>';
  }

  function pintarCarro() {
    const items = itemsCarro(), cuerpo = $('.js-cuerpo', dlgCarro), pie = $('.js-pie', dlgCarro);
    if (!items.length) {
      cuerpo.innerHTML = '<div class="carro__vacio"><p>El carrito de compras está vacío.</p><p><button type="button" class="btn btn--tinta" data-acc="cerrar" style="margin-top:16px">Ver productos</button></p></div>';
      pie.hidden = true;
      return;
    }
    const c = calcular(items);
    const siguiente = CFG.escalas.slice().reverse().find((e) => e.desde > c.unidades);
    const tope = Math.max.apply(null, CFG.escalas.map((e) => e.desde));
    const meta = siguiente
      ? '<div class="meta">Agrega ' + (siguiente.desde - c.unidades) + ' producto' + (siguiente.desde - c.unidades > 1 ? 's' : '') + ' más y ahorra ' + Math.round(siguiente.descuento * 100) + '% en todo el pedido<div class="meta__barra"><i style="width:' + Math.round(c.unidades / tope * 100) + '%"></i></div></div>'
      : '<div class="meta meta--ok">Tienes ' + Math.round(c.d * 100) + '% de descuento por cantidad<div class="meta__barra"><i style="width:100%"></i></div></div>';
    const lineas = c.lineas.map((l) =>
      '<div class="item"><a href="' + url(l.id) + '" tabindex="-1"><img src="' + foto(l.id) + '" alt="" width="64" height="64"></a>'
      + '<div><a href="' + url(l.id) + '">' + escapar(l.p.n) + '</a><small>' + escapar(l.p.m + ' · ' + l.p.t) + '</small>'
      + '<div class="cant"><button type="button" data-acc="menos" data-id="' + l.id + '" aria-label="Quitar una unidad">−</button><span>' + l.q + '</span><button type="button" data-acc="mas" data-id="' + l.id + '" aria-label="Agregar una unidad">+</button></div></div>'
      + '<div class="item__der"><span>' + plata(l.total) + '</span><button type="button" class="quitar" data-acc="quitar" data-id="' + l.id + '">Quitar</button></div></div>').join('');
    const sugeridos = [];
    items.forEach((i) => P[i.id].c.forEach((id) => { if (P[id] && !carro[id] && sugeridos.indexOf(id) < 0) sugeridos.push(id); }));
    const suma = sugeridos.length ? '<div class="suma"><h3>Va bien con tu pedido</h3>' + sugeridos.slice(0, 2).map((id) =>
      '<div class="suma__item"><img src="' + foto(id) + '" alt="" width="44" height="44"><span>' + escapar(P[id].n) + '<br><small>' + plata(P[id].pr) + '</small></span><button type="button" data-acc="mas" data-id="' + id + '">+ Agregar</button></div>').join('') + '</div>' : '';
    cuerpo.innerHTML = meta + lineas + suma;
    pie.hidden = false;
    pie.innerHTML = resumenHtml(c, 'Total') + '<button type="button" class="cod" data-acc="pagar">' + BILLETE + '<span>Pagar al recibir · ' + plata(c.total) + '</span></button>'
      + '<button type="button" class="carro__seguir" data-acc="cerrar">Seguir comprando</button>';
  }

  function abrirCarro() {
    pintarCarro();
    if (!dlgCarro.open) dlgCarro.showModal();
  }
  dlgCarro.addEventListener('click', (e) => {
    if (e.target === dlgCarro) return dlgCarro.close();
    const b = e.target.closest('[data-acc]');
    if (!b) return;
    const id = b.dataset.id, acc = b.dataset.acc;
    if (acc === 'cerrar') return dlgCarro.close();
    if (acc === 'pagar') { dlgCarro.close(); return abrirFormulario(null); }
    if (acc === 'mas') agregar(id, 1);
    if (acc === 'menos') { carro[id] -= 1; if (carro[id] < 1) delete carro[id]; guardar(); }
    if (acc === 'quitar') { delete carro[id]; guardar(); }
    pintarCarro();
  });

  // ───────────── formulario de contraentrega ─────────────
  const dlg = document.createElement('dialog');
  dlg.className = 'ce';
  dlg.setAttribute('aria-labelledby', 'ce-t');
  dlg.innerHTML = '<div class="ce__caja">'
    + '<header class="ce__cab"><h2 id="ce-t">Pide y paga al recibir</h2><button type="button" class="x js-ce-cerrar" aria-label="Cerrar">' + X + '</button></header>'
    + '<form class="js-ce-form" novalidate>'
    + '<div class="js-ce-productos"></div>'
    + '<div class="ofertas js-ce-ofertas"><fieldset><legend>Elige cuántas unidades</legend><div class="js-ce-opciones"></div></fieldset></div>'
    + '<div class="js-ce-resumen"></div>'
    + '<h3>Datos de entrega</h3>'
    + '<div class="campo"><label for="ce-nombre">Nombre y apellido</label><input id="ce-nombre" name="nombre" class="control" autocomplete="name" required maxlength="80" placeholder="Ej: Laura Gómez"></div>'
    + '<div class="campo"><label for="ce-telefono">Celular (WhatsApp)</label><input id="ce-telefono" name="telefono" class="control" type="tel" inputmode="numeric" autocomplete="tel-national" required maxlength="14" placeholder="300 123 4567"></div>'
    + '<div class="ce__fila"><div class="campo"><label for="ce-departamento">Departamento</label><select id="ce-departamento" name="departamento" class="control" required><option value="">Cargando…</option></select></div>'
    + '<div class="campo"><label for="ce-ciudad">Ciudad o municipio</label><select id="ce-ciudad" name="ciudad" class="control" required disabled><option value="">Elige el departamento</option></select></div></div>'
    + '<div class="campo"><label for="ce-direccion">Dirección</label><input id="ce-direccion" name="direccion" class="control" autocomplete="address-line1" required maxlength="150" placeholder="Ej: Calle 10 # 43-12"></div>'
    + '<div class="ce__fila"><div class="campo"><label for="ce-barrio">Barrio</label><input id="ce-barrio" name="barrio" class="control" required maxlength="80"></div>'
    + '<div class="campo"><label for="ce-detalles">Apto, casa o torre <span>(opcional)</span></label><input id="ce-detalles" name="detalles" class="control" autocomplete="address-line2" maxlength="100"></div></div>'
    + '<div class="campo"><label for="ce-correo">Correo <span>(opcional)</span></label><input id="ce-correo" name="correo" class="control" type="email" autocomplete="email" maxlength="100"></div>'
    + '<div class="trampa" aria-hidden="true"><label for="ce-sitio">No llenar</label><input id="ce-sitio" name="sitio_web" tabindex="-1" autocomplete="off"></div>'
    + '<div class="js-ce-error ce__error" role="alert" hidden></div>'
    + '<button type="submit" class="cod js-ce-enviar">' + BILLETE + '<span class="js-ce-enviar-texto">Confirmar pedido</span></button>'
    + '<p class="ce__legal">Pagas en efectivo cuando te llegue. Al confirmar aceptas los <a href="' + RAIZ + 'legal/#terminos" target="_blank">términos</a> y el <a href="' + RAIZ + 'legal/#datos" target="_blank">tratamiento de tus datos</a>.</p>'
    + '</form>'
    + '<div class="js-ce-listo ce__listo" hidden tabindex="-1"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="M14 24.5l7 7 13-14"/></svg>'
    + '<h3 class="js-ce-listo-titulo"></h3><p class="js-ce-listo-texto"></p>'
    + '<a class="cod ce__wa js-ce-wa" target="_blank" rel="noopener"></a>'
    + '<button type="button" class="carro__seguir js-ce-cerrar">Seguir viendo la tienda</button></div>'
    + '</div>';
  document.body.appendChild(dlg);

  const form = $('.js-ce-form', dlg), f = form.elements;
  const cajaError = $('.js-ce-error', dlg), botonEnviar = $('.js-ce-enviar', dlg), textoEnviar = $('.js-ce-enviar-texto', dlg);
  let directo = null; // id del producto cuando se abre con "Pedir y pagar al recibir"; null = carrito

  const cantidadDirecta = () => { const r = form.querySelector('input[name="cantidad"]:checked'); return r ? Number(r.value) : 1; };
  const itemsPedido = () => (directo ? [{ id: directo, q: cantidadDirecta() }] : itemsCarro());

  function pintarOpciones(elegida) {
    const p = P[directo];
    $('.js-ce-opciones', dlg).innerHTML = [1, 2, 3].map((n) => {
      const d = descuentoPara(n), unidad = Math.round(p.pr * (1 - d));
      return '<label class="oferta"><input type="radio" name="cantidad" value="' + n + '"' + (n === elegida ? ' checked' : '') + '><span class="oferta__radio"></span>'
        + '<span><b>' + (n === 1 ? '1 unidad' : 'Lleva ' + n) + (d ? ' <span class="tag tag--off">' + Math.round(d * 100) + '% menos</span>' : '') + '</b>'
        + '<small>' + (n === 1 ? 'Precio normal' : plata(unidad) + ' cada uno') + '</small></span>'
        + '<span class="oferta__precio">' + (d ? '<s>' + plata(p.pr * n) + '</s>' : '') + plata(unidad * n) + '</span></label>';
    }).join('');
  }

  function pintarPedido() {
    const c = calcular(itemsPedido());
    $$('.oferta', form).forEach((o) => o.classList.toggle('is-elegida', $('input', o).checked));
    $('.js-ce-productos', dlg).innerHTML = c.lineas.map((l) =>
      '<div class="ce__prod"><img src="' + foto(l.id) + '" alt="" width="52" height="52"><div>' + (directo ? '' : l.q + ' × ') + escapar(l.p.n) + '<br><small>' + escapar(l.p.m + ' · ' + l.p.t) + '</small></div>' + (directo ? '' : '<span>' + plata(l.total) + '</span>') + '</div>').join('');
    $('.js-ce-resumen', dlg).innerHTML = resumenHtml(c, 'Total a pagar al recibir');
    textoEnviar.textContent = 'Confirmar pedido · ' + plata(c.total);
    return c;
  }

  let ciudades = null;
  function cargarCiudades() {
    if (ciudades) return;
    fetch(RAIZ + 'assets/ciudades.json').then((r) => r.json()).then((datos) => {
      ciudades = datos;
      f.departamento.innerHTML = '<option value="">Elige</option>' + Object.keys(datos).map((d) => '<option>' + escapar(d) + '</option>').join('');
    }).catch(() => { f.departamento.innerHTML = '<option value="">No cargó la lista, cierra y vuelve a abrir</option>'; });
  }
  f.departamento.addEventListener('change', () => {
    const lista = (ciudades && ciudades[f.departamento.value]) || [];
    f.ciudad.disabled = !lista.length;
    f.ciudad.innerHTML = '<option value="">' + (lista.length ? 'Elige' : 'Elige el departamento') + '</option>' + lista.map((c) => '<option>' + escapar(c) + '</option>').join('');
    if (lista.length === 1) f.ciudad.value = lista[0];
  });

  function mostrarError(problemas) {
    cajaError.innerHTML = problemas.length > 1 ? '<ul>' + problemas.map((p) => '<li>' + escapar(p) + '</li>').join('') + '</ul>' : escapar(problemas[0]);
    cajaError.hidden = false;
    cajaError.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  const celular = () => f.telefono.value.replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  function validar() {
    const problemas = [];
    const marcar = (campo, malo, mensaje) => { campo.setAttribute('aria-invalid', malo ? 'true' : 'false'); if (malo && mensaje) problemas.push(mensaje); };
    marcar(f.nombre, f.nombre.value.trim().split(/\s+/).filter(Boolean).length < 2, 'Escribe tu nombre y apellido.');
    marcar(f.telefono, !/^3\d{9}$/.test(celular()), 'Escribe un celular de 10 dígitos que empiece por 3.');
    marcar(f.departamento, !f.departamento.value);
    marcar(f.ciudad, !f.ciudad.value, 'Elige el departamento y la ciudad.');
    marcar(f.direccion, f.direccion.value.trim().length < 5, 'Escribe la dirección completa.');
    marcar(f.barrio, f.barrio.value.trim().length < 2, 'Escribe el barrio.');
    const correo = f.correo.value.trim();
    marcar(f.correo, !!correo && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(correo), 'Revisa el correo o déjalo vacío.');
    return problemas;
  }

  function mensajeWhatsApp(c, ref) {
    const v = (campo) => f[campo].value.trim();
    return ['*Pedido contraentrega · ' + CFG.marca + '*', 'Ref: ' + ref, '']
      .concat(c.lineas.map((l) => '• ' + l.q + ' × ' + l.p.n + ' (' + l.p.m + ', ' + l.p.t + ') — ' + plata(l.total)))
      .concat(['', 'Subtotal: ' + plata(c.subtotal)])
      .concat(c.d ? ['Descuento por cantidad (' + Math.round(c.d * 100) + '%): -' + plata(c.ahorro)] : [])
      .concat(['Envío: Gratis', '*Total a pagar al recibir: ' + plata(c.total) + '*', '',
        'Nombre: ' + v('nombre'), 'Celular: ' + celular(),
        'Dirección: ' + v('direccion') + ', barrio ' + v('barrio') + (v('detalles') ? ', ' + v('detalles') : ''),
        'Ciudad: ' + v('ciudad') + ', ' + v('departamento')])
      .concat(v('correo') ? ['Correo: ' + v('correo')] : []).join('\n');
  }

  function terminar(c, titulo, texto, enlace, textoEnlace) {
    rastrear('Purchase', { currency: 'COP', value: c.total, content_ids: c.lineas.map((l) => l.id), content_type: 'product', num_items: c.unidades });
    if (!directo) { carro = {}; guardar(); }
    $('.js-ce-listo-titulo', dlg).textContent = titulo;
    $('.js-ce-listo-texto', dlg).textContent = texto;
    const wa = $('.js-ce-wa', dlg);
    wa.href = enlace; wa.textContent = textoEnlace;
    form.hidden = true;
    const listo = $('.js-ce-listo', dlg);
    listo.hidden = false;
    listo.focus();
  }

  form.addEventListener('change', (e) => { if (e.target.name === 'cantidad') pintarPedido(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    cajaError.hidden = true;
    const problemas = validar();
    if (problemas.length) return mostrarError(problemas);
    if (f.sitio_web.value) return; // trampa para bots
    const c = pintarPedido();
    const nombre = f.nombre.value.trim().split(/\s+/)[0];
    const wa = (texto) => 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(texto);

    if (!CFG.endpoint) {
      const ref = 'W-' + Date.now().toString(36).toUpperCase().slice(-6);
      const enlace = wa(mensajeWhatsApp(c, ref));
      window.open(enlace, '_blank', 'noopener');
      return terminar(c, 'Falta un paso, ' + nombre, 'Tu pedido ' + ref + ' está listo en WhatsApp: toca enviar para que lo recibamos. Pagas ' + plata(c.total) + ' en efectivo cuando te llegue.', enlace, 'Enviar pedido por WhatsApp');
    }

    const datos = {
      productos: c.lineas.map((l) => ({ id: l.id, dropi: l.p.d || null, nombre: l.p.n, cantidad: l.q, precio_unitario: l.unidad })),
      total: c.total, descuento: c.ahorro, pago: 'contraentrega',
      nombre: f.nombre.value.trim(), telefono: celular(), correo: f.correo.value.trim(),
      departamento: f.departamento.value, ciudad: f.ciudad.value,
      direccion: f.direccion.value.trim(), barrio: f.barrio.value.trim(), detalles: f.detalles.value.trim(),
      origen: location.href,
    };
    botonEnviar.disabled = true;
    textoEnviar.textContent = 'Enviando pedido…';
    fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) })
      .then((r) => r.json().catch(() => ({ ok: false })))
      .then((r) => {
        if (!r.ok) throw r;
        terminar(c, 'Pedido #' + r.numero + ' recibido', 'Gracias, ' + nombre + '. Pagas ' + plata(r.total || c.total) + ' en efectivo cuando te llegue. Te escribimos por WhatsApp para confirmar los datos.', wa('Hola, hice el pedido #' + r.numero + ' para pagar al recibir.'), 'Escribirnos por WhatsApp');
      })
      .catch((r) => {
        mostrarError((r && r.problemas) || ['No pudimos enviar el pedido. Revisa tu conexión e intenta de nuevo, o escríbenos por WhatsApp.']);
        pintarPedido();
      })
      .finally(() => { botonEnviar.disabled = false; });
  });

  function abrirFormulario(id, cantidad) {
    directo = id && P[id] ? id : null;
    if (!directo && !itemsCarro().length) return abrirCarro();
    $('.js-ce-ofertas', dlg).hidden = !directo;
    if (directo) pintarOpciones(Math.min(3, cantidad || 1)); else $('.js-ce-opciones', dlg).innerHTML = '';
    cajaError.hidden = true;
    const c = pintarPedido();
    cargarCiudades();
    dlg.showModal();
    rastrear('InitiateCheckout', { currency: 'COP', value: c.total, content_ids: c.lineas.map((l) => l.id), content_type: 'product' });
  }
  dlg.addEventListener('close', () => {
    const listo = $('.js-ce-listo', dlg);
    if (!listo.hidden) { form.reset(); f.ciudad.disabled = true; form.hidden = false; listo.hidden = true; }
  });
  $$('.js-ce-cerrar', dlg).forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  // ───────────── botones de la página ─────────────
  const cantidadDePagina = () => { const r = $('.js-ofertas input[name="cantidad"]:checked'); return r ? Number(r.value) : 1; };
  let avisoT;
  function aviso(texto) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = texto; t.classList.add('vis');
    clearTimeout(avisoT); avisoT = setTimeout(() => t.classList.remove('vis'), 2600);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('.js-agregar, .js-comprar, .js-rutina, .js-abrir-carro');
    if (!b || dlg.contains(b) || dlgCarro.contains(b)) return;
    if (b.matches('.js-abrir-carro')) return abrirCarro();
    if (b.matches('.js-comprar')) return abrirFormulario(b.dataset.id, cantidadDePagina());
    if (b.matches('.js-rutina')) b.dataset.ids.split(',').forEach((id) => { if (!carro[id]) agregar(id, 1); });
    else agregar(b.dataset.id, b.closest('.pp__info') ? cantidadDePagina() : 1);
    const texto = b.textContent;
    b.textContent = '¡Agregado!'; b.classList.add('ok');
    setTimeout(() => { b.textContent = texto; b.classList.remove('ok'); }, 1400);
    abrirCarro();
  });

  $$('.js-ofertas').forEach((o) => o.addEventListener('change', () => {
    $$('.oferta', o).forEach((l) => l.classList.toggle('is-elegida', $('input', l).checked));
  }));

  // ───────────── filtro por objetivo (portada) ─────────────
  function filtrar(obj) {
    $$('.js-obj').forEach((o) => o.classList.toggle('activo', o.dataset.obj === obj));
    $$('.sec[id] .grid').forEach((grid) => {
      const sec = grid.closest('.sec'), filtro = $('.js-filtro', sec);
      if (!filtro) return;
      let visibles = 0;
      $$('.card', grid).forEach((card) => {
        const fuera = !!obj && card.dataset.obj.split(' ').indexOf(obj) < 0;
        card.classList.toggle('fuera', fuera);
        if (!fuera) visibles++;
      });
      sec.hidden = !visibles;
      filtro.hidden = !obj;
      if (obj) filtro.innerHTML = 'Viendo: ' + escapar(W.obj[obj]) + ' (' + visibles + ') <button type="button" class="js-ver-todo">Ver todo</button>';
    });
  }
  document.addEventListener('click', (e) => {
    const o = e.target.closest('.js-obj');
    if (o) {
      e.preventDefault();
      filtrar(o.classList.contains('activo') ? '' : o.dataset.obj);
      const destino = $$('.sec[id]').find((s) => !s.hidden && $('.js-filtro', s));
      if (destino) destino.scrollIntoView();
    } else if (e.target.closest('.js-ver-todo, .cab__nav a, .pie nav a')) filtrar('');
  });

  // ───────────── recomendador (portada) ─────────────
  const quiz = $('.js-quiz');
  if (quiz) {
    const PREGUNTAS = {
      inicio: { t: '¿Qué quieres mejorar primero?', ops: [['Mi piel', 'pielTipo'], ['Mi energía y rendimiento', 'supMeta']] },
      pielTipo: { t: '¿Cómo se siente tu piel al mediodía?', clave: 'tipo', sig: 'pielMeta', ops: [['Tirante o reseca', 'seca'], ['Brilla en frente y nariz', 'mixta'], ['Brilla en toda la cara', 'grasa'], ['Se irrita con facilidad', 'sensible']] },
      pielMeta: { t: '¿Qué te gustaría ver distinto?', clave: 'meta', sig: 'fin', ops: [['Más hidratación', 'hidratacion'], ['Menos brillo y poros visibles', 'grasa'], ['Un tono más parejo', 'manchas'], ['Líneas de expresión', 'antiedad']] },
      supMeta: { t: '¿Cuál es tu objetivo principal?', clave: 'meta', sig: 'supEntreno', ops: [['Ganar músculo y fuerza', 'musculo'], ['Más energía en el día', 'energia'], ['Descansar mejor', 'descanso'], ['Cubrir las vitaminas básicas', 'vitaminas']] },
      supEntreno: { t: '¿Entrenas con pesas o alta intensidad?', clave: 'entreno', sig: 'fin', ops: [['Sí, 3 o más veces por semana', 'si'], ['A veces', 'aveces'], ['No por ahora', 'no']] },
    };
    // Cada recomendación: [id del producto, por qué]. Los ids deben existir en datos/productos.mjs.
    const ID = {
      limpiaH: 'limpiador-hidratante-cerave-473ml', limpiaE: 'limpiador-espumoso-cerave-473ml', ha: 'acido-hialuronico-the-ordinary-30ml',
      nia: 'niacinamida-the-ordinary-30ml', vitc: 'serum-vitamina-c-truskin-30ml', ret: 'retinol-the-ordinary-05-escualano-30ml',
      crema: 'crema-hidratante-cerave-453g', spf: 'protector-solar-la-roche-posay-anthelios-spf60',
      crea: 'creatina-monohidratada-optimum-nutrition-300g', whey: 'gold-standard-whey-optimum-nutrition-2lb', multi: 'multivitaminico-nature-made-130',
      omega: 'omega-3-nordic-naturals-ultimate-omega-60', d3: 'vitamina-d3-k2-sports-research-60', c: 'vitamina-c-1000-now-foods-100',
      mag: 'magnesio-glicinato-doctors-best-240', ash: 'ashwagandha-now-foods-450mg-90',
    };
    function recomendar(r) {
      if (r.tipo) {
        const grasa = r.tipo === 'grasa' || r.tipo === 'mixta';
        const trata = { hidratacion: [ID.ha, 'Sérum hidratante, va antes de la crema'], grasa: [ID.nia, 'El sérum clásico para piel con brillo'], manchas: [ID.vitc, 'Vitamina C para el paso de la mañana'], antiedad: [ID.ret, 'Retinol: de noche, empezando 2 veces por semana'] }[r.meta];
        const cierre = r.meta === 'manchas' || r.meta === 'antiedad' ? [ID.spf, 'Protector solar cada mañana: sin él, lo demás no rinde'] : [ID.crema, 'Hidratante sin fragancia para sellar la rutina'];
        return [[grasa ? ID.limpiaE : ID.limpiaH, grasa ? 'Limpiador en gel para piel mixta o grasa' : 'Limpiador en crema que no reseca'], trata, cierre];
      }
      return {
        musculo: [[ID.crea, '5 g al día, todos los días'], [ID.whey, '24 g de proteína por porción'], [ID.multi, 'Una tableta diaria para cubrir lo básico']],
        energia: [[ID.multi, '23 vitaminas y minerales en una tableta'], [ID.omega, 'Omega-3 concentrado en EPA y DHA'], r.entreno === 'si' ? [ID.crea, 'Si entrenas fuerte, 5 g al día'] : [ID.d3, 'Una cápsula pequeña con el almuerzo']],
        descanso: [[ID.mag, 'Magnesio glicinato, en la noche'], [ID.ash, 'Extracto estandarizado de raíz']],
        vitaminas: [[ID.multi, 'La base: una tableta diaria'], [ID.c, '1000 mg de vitamina C por tableta'], [ID.d3, 'D3 con K2 en una sola cápsula']],
      }[r.meta];
    }

    let resp = {}, paso = 1;
    function preguntar(clave) {
      const q = PREGUNTAS[clave];
      quiz.innerHTML = '<p class="quiz__paso">Pregunta ' + paso + ' de 3</p><h3>' + q.t + '</h3><div class="quiz__ops">'
        + q.ops.map((o, i) => '<button type="button" data-i="' + i + '">' + o[0] + '</button>').join('') + '</div>';
      quiz.onclick = (e) => {
        const b = e.target.closest('button[data-i]');
        if (!b) return;
        const op = q.ops[b.dataset.i];
        paso++;
        if (!q.clave) return preguntar(op[1]);
        resp[q.clave] = op[1];
        q.sig === 'fin' ? resultado() : preguntar(q.sig);
      };
    }
    function resultado() {
      const picks = (recomendar(resp) || []).filter((x) => x && P[x[0]]);
      if (!picks.length) return reiniciar();
      const c = calcular(picks.map((x) => ({ id: x[0], q: 1 })));
      quiz.innerHTML = '<p class="quiz__paso">Tu rutina recomendada</p><h3>' + picks.length + ' productos, en este orden</h3><div class="quiz__res">'
        + picks.map((x, i) => '<div class="quiz__item"><img src="' + foto(x[0]) + '" alt="" width="56" height="56"><div><a href="' + url(x[0]) + '">' + (i + 1) + '. ' + escapar(P[x[0]].n) + '</a><small>' + escapar(x[1]) + '</small></div><b>' + plata(P[x[0]].pr) + '</b></div>').join('')
        + '</div><p class="quiz__total"><span>Rutina completa' + (c.d ? ' con ' + Math.round(c.d * 100) + '% de descuento' : '') + '</span><span class="precio"><b>' + plata(c.total) + '</b>' + (c.d ? ' <s>' + plata(c.subtotal) + '</s>' : '') + '</span></p>'
        + '<button type="button" class="cod js-rutina" style="width:100%" data-ids="' + picks.map((x) => x[0]).join(',') + '">Agregar mi rutina</button>'
        + '<button type="button" class="quiz__otra" data-otra>Empezar de nuevo</button>';
      quiz.onclick = (e) => { if (e.target.closest('[data-otra]')) reiniciar(); };
    }
    function reiniciar() { resp = {}; paso = 1; preguntar('inicio'); }
    reiniciar();
  }

  // ───────────── aparición al hacer scroll ─────────────
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add('vis');
        io.unobserve(el);
        // Al terminar se limpia para no retrasar el hover de las tarjetas.
        setTimeout(() => { el.classList.remove('rev', 'vis'); el.style.transitionDelay = ''; }, 1300);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.sec__cab, .card, .obj, .rut, .orig__lista li, .pasos li, .quiz').forEach((el) => {
      const hermanos = Array.from(el.parentNode.children);
      el.style.transitionDelay = Math.min(hermanos.indexOf(el), 7) * 55 + 'ms';
      el.classList.add('rev');
      io.observe(el);
    });
  }

  leer();
  pintarCuenta(false);
  window.addEventListener('storage', (e) => { if (e.key === CLAVE) { leer(); pintarCuenta(false); if (dlgCarro.open) pintarCarro(); } });
  window.wets = { abrirCarro: abrirCarro, pedir: abrirFormulario };
})();
