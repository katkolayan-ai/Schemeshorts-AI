// Server-side TTS bridge for the SchemeShorts prototype.
// Keeping this request server-side avoids browser CORS failures when fetching audio.
export default async (req) => {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const lang = (url.searchParams.get('lang') || 'en').trim();
    if (!q) return new Response(JSON.stringify({error:'Missing text'}), {status:400, headers:{'content-type':'application/json'}});
    if (q.length > 220) return new Response(JSON.stringify({error:'Text chunk too long'}), {status:400, headers:{'content-type':'application/json'}});
    const targets = new Set(['en','hi','mr','gom']);
    const tl = targets.has(lang) ? lang : 'en';
    const hosts = [
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(q)}`,
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(q)}`
    ];
    let last = null;
    for (const target of hosts) {
      try {
        const r = await fetch(target, {headers:{'user-agent':'Mozilla/5.0'}});
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        const data = await r.arrayBuffer();
        if (data.byteLength < 1000) throw new Error('empty audio');
        return new Response(data, {
          status:200,
          headers:{
            'content-type':'audio/mpeg',
            'cache-control':'public, max-age=3600'
          }
        });
      } catch (e) { last = e; }
    }
    return new Response(JSON.stringify({error:'TTS upstream unavailable', detail:String(last?.message || last || '')}), {status:502, headers:{'content-type':'application/json'}});
  } catch (e) {
    return new Response(JSON.stringify({error:'TTS server error', detail:String(e?.message || e)}), {status:500, headers:{'content-type':'application/json'}});
  }
};
