// RutaCoste — formulario de contacto
// El mensaje llega por correo a rutacoste.es@gmail.com mediante FormSubmit (https://formsubmit.co),
// un servicio gratuito que no requiere backend propio.
// IMPORTANTE: la primera vez que se envíe un mensaje, FormSubmit manda un correo de activación
// a esa dirección; hay que pulsar el enlace "Activate Form" una sola vez.

(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const TO = 'rutacoste.es@gmail.com';
  const btn = document.getElementById('contact-btn');
  const msg = document.getElementById('contact-msg');

  function show(type, html) {
    msg.className = 'x-msg ' + type;
    msg.innerHTML = html;
    msg.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.style.display = 'none';

    const data = new FormData(form);
    // Trampa para bots: si el campo oculto tiene contenido, fingimos éxito sin enviar.
    if (data.get('_honey')) { show('ok', 'Gracias, hemos recibido tu mensaje.'); form.reset(); return; }

    const name = (data.get('name') || '').toString().trim();
    const email = (data.get('email') || '').toString().trim();
    const topic = (data.get('topic') || '').toString();
    const message = (data.get('message') || '').toString().trim();

    if (message.length < 10) { show('error', 'Escribe un mensaje algo más largo (mínimo 10 caracteres).'); return; }

    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = 'Enviando…';

    try {
      const res = await fetch('https://formsubmit.co/ajax/' + TO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          _subject: `RutaCoste · ${topic || 'Mensaje'} (${name || 'sin nombre'})`,
          _replyto: email,
          _template: 'table',
          _captcha: 'false',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === 'false' || json.success === false) {
        console.warn('FormSubmit:', res.status, json);
        throw new Error(json.message || 'send');
      }
      show('ok', '<strong>¡Mensaje enviado!</strong> Gracias por escribirnos. Te responderemos por correo lo antes posible.');
      form.reset();
    } catch (err) {
      const subject = encodeURIComponent(`RutaCoste · ${topic || 'Mensaje'}`);
      const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      show('error',
        'No hemos podido enviar el mensaje desde el formulario. ' +
        `Puedes <a href="mailto:${TO}?subject=${subject}&body=${body}">escribirnos directamente por correo</a>.`);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
})();
