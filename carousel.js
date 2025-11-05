// carousel.js
// Busca imágenes en `archives/` (1..20) con extensiones comunes y las rota automáticamente.
// Modo de uso: incluir <script src="carousel.js" defer></script> en el HTML (ya añadido).

(() => {
    const MAX = 20; // número máximo a intentar (1..MAX)
    const EXTS = ['jpg','png','jpeg'];
    const INTERVAL = 5000; // ms (tiempo entre cambios)
    const TRANSITION = 200; // ms (duración de la transición de opacidad, debe coincidir con CSS ~800ms)

    const imgElem = document.querySelector('.carousel-image');
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    const indicators = document.querySelector('.carousel-indicators');
    const carouselRoot = document.querySelector('.carousel');

    if (!imgElem || !carouselRoot) return; // nada que hacer

    function tryLoad(src){
        return new Promise(resolve => {
            const i = new Image();
            i.onload = () => resolve(src);
            i.onerror = () => resolve(null);
            i.src = src;
        });
    }

    async function discoverImages(){
        const attempts = [];
        for(let n=1;n<=MAX;n++){
            for(const ext of EXTS){
                attempts.push( tryLoad(`archives/${n}.${ext}`) );
            }
        }
        const results = await Promise.all(attempts);
        const images = results.filter(Boolean);
        // Deduplicate if any
        return Array.from(new Set(images));
    }

    // Read user-provided images list from data-images attribute (comma separated)
    function readUserImages(){
        if (!carouselRoot) return [];
        const raw = carouselRoot.dataset.images || '';
        if (!raw.trim()) return [];
        // split by comma, trim and filter
        return raw.split(',').map(s => s.trim()).filter(Boolean);
    }

    function createIndicator(i){
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.addEventListener('click', () => {
            showIndex(i);
            restartTimer();
        });
        return btn;
    }

    let images = [];
    let idx = 0;
    let timer = null;

    function updateIndicators(){
        indicators.innerHTML = '';
        images.forEach((_, i) => {
            const btn = createIndicator(i);
            if (i === idx) btn.classList.add('active');
            indicators.appendChild(btn);
        });
    }

    function showIndex(i){
        if (!images.length) return;
        idx = (i + images.length) % images.length;
        const newSrc = images[idx];

        // Preload next image to avoid flash
        const pre = new Image();
        pre.onload = () => {
            // Fade out current image
            imgElem.style.opacity = 0;
            // After fade-out completes, swap src and fade in
            setTimeout(() => {
                imgElem.src = newSrc;
                // small delay to ensure src applied then fade in
                setTimeout(() => { imgElem.style.opacity = 1; }, 60);
            }, TRANSITION);
            // update indicators
            const dots = indicators.querySelectorAll('button');
            dots.forEach((d, j) => d.classList.toggle('active', j === idx));
        };
        pre.onerror = () => {
            // If preload fails, still update indicators but don't change image abruptly
            const dots = indicators.querySelectorAll('button');
            dots.forEach((d, j) => d.classList.toggle('active', j === idx));
        };
        pre.src = newSrc;
    }

    function next(){ showIndex(idx + 1); }
    function prev(){ showIndex(idx - 1); }

    function startTimer(){
        if (timer) return;
        timer = setInterval(next, INTERVAL);
    }
    function stopTimer(){ if (timer){ clearInterval(timer); timer = null; } }
    function restartTimer(){ stopTimer(); startTimer(); }

    // Hook up buttons
    nextBtn && nextBtn.addEventListener('click', () => { next(); restartTimer(); });
    prevBtn && prevBtn.addEventListener('click', () => { prev(); restartTimer(); });

    // Pause on hover
    carouselRoot.addEventListener('mouseenter', stopTimer);
    carouselRoot.addEventListener('mouseleave', startTimer);

    // Initialize
    (async () => {
        const discovered = await discoverImages();
        const userProvided = readUserImages();

        // Merge: keep userProvided first (in that order), then discovered ones not already included
        const combined = [];
        const seen = new Set();
        userProvided.forEach(u => { if (u && !seen.has(u)) { seen.add(u); combined.push(u); } });
        discovered.forEach(d => { if (d && !seen.has(d)) { seen.add(d); combined.push(d); } });

        images = combined.length ? combined : [imgElem.src || 'archives/1.jpg'];

        // show first
        idx = 0;
        imgElem.src = images[0];
        updateIndicators();
        startTimer();
    })();
})();
