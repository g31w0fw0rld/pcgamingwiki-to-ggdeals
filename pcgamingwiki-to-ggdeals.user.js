// ==UserScript==
// @name         PCGamingWiki to GGDeals Link Generator
// @namespace    https://www.gg.deals/
// @version      1.2.6
// @description  Adds two GG.deals buttons to the Availability section of PCGamingWiki articles: a direct link built from the title, which is fast but can 404, and a title search, which always returns something. Each says which it is in a tooltip drawn with the wiki's own ReferenceTooltips styles, so it looks like the ones on the article's references, and titles are normalised the way GG.deals writes its slugs.
// @icon         data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAATlBMVEU3WJjN1eWbrMxAX5yKncNFZJ+NoMRkfa89XZuWp8ladapzird5j7qUpsg6W5phe66Blr5PbKTDzeBqg7JJZ6G8x920wdmrudRvhrWltNFJFKfyAAABH0lEQVRYhe3X63KDIBAFYBCV2yIQbGre/0UL2tp4yYQs6Uwm9fz2fMNsmMxCyJE/j2oFIVpb3yDKHZcnShkhdZVinOaqz6/b1KZXwBRZQ1A5J/+g31kB41ny2whg2X4U8O5M18kHOvjctB8Cmr360wAJrpXzT4kA2vSFaLyyQeOBKQIH9KwMGGdXO9DBKjRQlQzxTYCahxYNmAEg/rmJyUIAPxeJecWLAJIuEgYwyrMiIMalb0APAQtUYIOpsENc5n8CxnuvS4B0kfgLAd0BvAAgDuB9AXYqBOKWurNn7gLsBhDjN9vmDLAhB4jp4bIF5O+WeBdI4xguK2CZu0CM4PsPjvRygVtDXKWzafWfgXZ88mR2r4zx0RWbOcc+gssXXnUUFMzn1xYAAAAASUVORK5CYII=
// @author       g31w0fw0rld
// @license      MIT
// @match        https://www.pcgamingwiki.com/*
// @downloadURL  https://github.com/g31w0fw0rld/pcgamingwiki-to-ggdeals/raw/main/pcgamingwiki-to-ggdeals.user.js
// @updateURL    https://github.com/g31w0fw0rld/pcgamingwiki-to-ggdeals/raw/main/pcgamingwiki-to-ggdeals.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // CONSTANTES
    // =============================================
    // Tolerante al separador: PCGamingWiki titula " - PCGamingWiki PCGW - bugs...",
    // pero si algún día cambia a "| PCGamingWiki" (o quita los espacios) el recorte
    // seguiría funcionando. El `.*` final ya absorbe toda la cola, así que aquí no
    // hace falta una lista de variantes como en el script hermano.
    const PCGW_TITLE_SUFFIX = /\s*[-|]\s*PCGamingWiki.*$/i;
    // Apóstrofos y puntos de sigla se borran sin dejar hueco, porque los slugs de
    // gg.deals los eliden: "Marvel's Spider-Man" -> marvels-spider-man (no
    // marvel-s-...) y "S.T.A.L.K.E.R. 2" -> stalker-2 (no s-t-a-l-k-e-r-2).
    const ELIDED_CHARS_REGEX = /['’`.]/g;
    // El resto de la puntuación se sustituye por espacio (que luego pasa a "-" o
    // "+"), nunca se borra: borrándola "Tomb Raider IV-VI" quedaba como "IVVI".
    // El guion se conserva tal cual porque ya es el separador del slug.
    const SPECIAL_CHARS_REGEX = /[^\w\s-]/g;
    // Diacríticos combinados, para quitarlos tras normalizar a NFD.
    const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
    const GGDEALS_GAME_URL = 'https://gg.deals/game/';
    const GGDEALS_SEARCH_URL = 'https://gg.deals/games/?title=';
    // Favicon oficial de GG.deals para el icono de los botones. Se carga como <img>
    // remoto; si el CSP de PCGamingWiki lo bloquea, onerror lo oculta.
    const GGDEALS_ICON_URL = 'https://gg.deals/favicon.ico';
    const AVAILABILITY_HEADER_ID = 'Availability';

    const STYLES_ID = 'pg2gg-styles';
    const BTN_CLASS = 'pg2gg-btn';
    const ICON_CLASS = 'pg2gg-ico';
    const LABEL_LONG_CLASS = 'pg2gg-long';
    const LABEL_SHORT_CLASS = 'pg2gg-short';
    // Ancho por debajo del cual el encabezado no da de sí para las dos etiquetas
    // largas. No es el punto de corte de ningún skin de la wiki: es el ancho a
    // partir del cual "Availability" más los dos enlaces dejan de caber en un
    // renglón, así que cubre tanto la vista móvil (Minerva) como una ventana de
    // escritorio estrecha, donde el problema es exactamente el mismo.
    const NARROW_MAX_WIDTH = 720;

    // =============================================
    // FUNCIONES
    // =============================================

    /**
     * Extrae el nombre del juego desde el título de la página,
     * eliminando el sufijo " - PCGamingWiki..." y normalizando la puntuación.
     * Genera dos formatos: kebab-case para URL directa y palabras separadas
     * por '+' para búsqueda.
     * @returns {{ kebab: string, search: string }} URLs formateadas para GGDeals.
     */
    function extractGameTitle() {
        const rawTitle = document.title.replace(PCGW_TITLE_SUFFIX, '').trim();
        const cleanTitle = rawTitle
            // Descomponer y quitar los acentos antes de filtrar: \w es ASCII, asi
            // que SPECIAL_CHARS_REGEX se comía la vocal acentuada entera y
            // "Pokémon" quedaba "Pokmon". gg.deals translitera en sus slugs, de
            // modo que "pokemon" es justo lo que hay que pedirle.
            .normalize('NFD')
            .replace(DIACRITICS_REGEX, '')
            .replace(ELIDED_CHARS_REGEX, '')
            .replace(SPECIAL_CHARS_REGEX, ' ')
            // Colapsar los espacios dobles que dejan los pasos anteriores, para no
            // acabar con "--" en el slug ni "++" en la búsqueda.
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        return {
            kebab: cleanTitle.replace(/\s+/g, '-'),
            search: cleanTitle.replace(/\s+/g, '+')
        };
    }

    // Los dos botones se ven idénticos y su diferencia es invisible: el directo
    // arma el slug ADIVINÁNDOLO desde el título y puede dar 404; el de búsqueda
    // siempre devuelve algo. Sin esta aclaración nadie entiende por qué hay dos.
    // Van en inglés porque las etiquetas ya lo están: este script no lleva i18n
    // a propósito, así que el tooltip no cruza ninguna barrera nueva.
    // Cada texto se usa dos veces: como `title` del enlace y como contenido del
    // tooltip de la wiki (más abajo), que es el que se ve normalmente.
    const DIRECT_TOOLTIP = "Direct link — may 404 if the slug doesn't match";
    const SEARCH_TOOLTIP = 'Title search — always returns something';

    // Cada botón lleva sus DOS etiquetas puestas y es el CSS el que enseña una u
    // otra según el ancho. Se hace así, y no reescribiendo el texto desde JS, para
    // que el cambio siga al girar el teléfono o al reajustar la ventana sin tener
    // que escuchar `resize`. En estrecho el icono ya dice de qué sitio se trata,
    // así que la etiqueta solo tiene que distinguir un botón del otro.
    const DIRECT_LABEL = 'View on GGDeals';
    const DIRECT_LABEL_SHORT = 'View';
    const SEARCH_LABEL = 'Search on GGDeals';
    const SEARCH_LABEL_SHORT = 'Search';

    // =============================================
    // TOOLTIP NATIVO DE LA WIKI (ReferenceTooltips)
    // =============================================
    // El tooltip de las referencias de PCGamingWiki no viene de la extensión Popups
    // —no está instalada, ni TextExtracts ni PageImages—: es ReferenceTooltips, el
    // gadget de la Wikipedia rusa copiado a mano dentro de MediaWiki:Common.js y
    // MediaWiki:Common.css, con sus clases rt-*. Como este script corre en la propia
    // wiki, ese CSS ya está cargado en la página: construyendo el mismo DOM el
    // tooltip sale idéntico al de las referencias sin traer un solo estilo propio.
    //
    // No se reutiliza su JS, y las dos razones están en su código:
    //  - solo engancha `.reference, a[href^="#CITEREF"]`, y no somos ninguno de los
    //    dos: nuestros enlaces salen a gg.deals, así que darles un href de ancla
    //    para que los recogiera sería romperlos;
    //  - su otro modo, el de `abbr[title]`, vive detrás de la preferencia
    //    `tooltipsForComments`, cuyo defecto es `IS_TOUCHSCREEN && IS_MOBILE`:
    //    apagada en escritorio, que es justo el caso normal.
    // Así que se replica su comportamiento y se reusa su hoja de estilos.
    //
    // Va sin engranaje a propósito: el de sus tooltips abre el diálogo de ajustes
    // del gadget, que vive dentro de su closure y no es alcanzable desde aquí. Un
    // engranaje que no hiciera nada sería peor que no ponerlo.

    // Medidas y tiempos copiados de su calculatePosition() y de sus animaciones
    // rt-fade-*; no son estimaciones nuestras.
    const RT_GAP_ABOVE = 7;        // hueco entre tooltip y enlace, por arriba
    const RT_GAP_BELOW = 9;        // ídem por abajo, cuando no cabe arriba
    const RT_EDGE_MARGIN = 6;      // margen que exige al borde de la ventana
    const RT_TAIL_OFFSET = 20;     // la cola queda a 20 px del borde izquierdo
    const RT_FADE_MS = 200;        // duración de las animaciones rt-fade-*
    const RT_HIDE_GRACE_MS = 200;  // margen para llevar el cursor al tooltip
    const RT_DEFAULT_DELAY = 200;  // retardo antes de aparecer
    const RT_SETTINGS_COOKIE = 'RTsettings';

    // Un único tooltip para los dos enlaces, porque nunca hay dos visibles a la vez.
    // `active` recuerda de quién es el que está en pantalla: el `title` hay que
    // devolvérselo a ese enlace y no al otro.
    let tooltipNode = null;
    let active = null;
    let showTimer = null;
    let hideTimer = null;
    let removeTimer = null;

    /**
     * Lee la cookie de ajustes del gadget ("enabled|delay|activatedByClick|
     * tooltipsForComments"). Existe para obedecer su engranaje: si el usuario apagó
     * los tooltips de la wiki desde ahí, los nuestros se apagan también, y si les
     * cambió el retardo, se usa el suyo. Ante una cookie ilegible se asume encendido
     * con el retardo por defecto, que es lo que hace el gadget.
     *
     * Del tercer campo (`activatedByClick`) no se hace caso a propósito. El gadget lo
     * pone a `IS_TOUCHSCREEN` y, en modo clic, se queda el clic con preventDefault()
     * sobre sus anclas internas; aquí eso se comería el primer toque de un enlace
     * cuyo único trabajo es abrirse, así que no se copia. Y como este tooltip solo
     * responde a hover, en modo clic no molesta: en un táctil puro no hay hover que
     * lo dispare, y en un portátil táctil con ratón —donde el gadget se pasa a clic
     * por el mero hecho de que la pantalla lo admita— el tooltip sigue saliendo.
     * @returns {{ enabled: boolean, delay: number }}
     */
    function readRtSettings() {
        const raw = document.cookie
            .split('; ')
            .find((c) => c.startsWith(`${RT_SETTINGS_COOKIE}=`));
        if (!raw) return { enabled: true, delay: RT_DEFAULT_DELAY };

        const parts = decodeURIComponent(raw.slice(RT_SETTINGS_COOKIE.length + 1)).split('|');
        const delay = Number(parts[1]);
        return {
            // Se compara contra '0' en vez de Boolean(Number(…)): un campo ausente o
            // con basura da NaN, y eso apagaría el tooltip por un error de lectura.
            enabled: parts[0] !== '0',
            delay: Number.isFinite(delay) && delay >= 0 ? delay : RT_DEFAULT_DELAY
        };
    }

    /**
     * Construye el DOM del tooltip con la estructura que espera su CSS: la cola es
     * hermana del contenido y va PRIMERO (rt-tooltip-above / rt-tooltip-below la
     * colocan arriba o abajo con transform).
     * @returns {HTMLDivElement} El tooltip, todavía fuera del documento.
     */
    function buildTooltipNode() {
        const box = document.createElement('div');
        box.className = 'rt-tooltip';
        box.setAttribute('role', 'tooltip');

        const tail = document.createElement('div');
        tail.className = 'rt-tooltipTail';
        const content = document.createElement('div');
        content.className = 'rt-tooltipContent';
        box.appendChild(tail);
        box.appendChild(content);

        // Pasar el cursor del enlace al tooltip no lo cierra, igual que en el gadget.
        box.addEventListener('mouseenter', () => {
            clearTimeout(hideTimer);
            clearTimeout(removeTimer);
        });
        box.addEventListener('mouseleave', scheduleHide);
        return box;
    }

    /**
     * Comprueba que el CSS del gadget siga vivo, midiendo el nodo ya construido. Si
     * PCGamingWiki renombrara las clases rt-*, el tooltip saldría como un bloque sin
     * borde ni fondo pisando el texto del artículo; mejor no montarlo y quedarse con
     * el `title` del navegador, que nunca se ve mal.
     * @param {HTMLDivElement} node - El tooltip recién construido.
     * @returns {boolean} true si `.rt-tooltip` sigue teniendo estilos.
     */
    function rtStylesAreLive(node) {
        document.body.appendChild(node);
        const live = getComputedStyle(node).position === 'absolute';
        node.remove();
        return live;
    }

    /**
     * Coloca el tooltip encima del enlace, o debajo si no cabe. Réplica de su
     * calculatePosition(): la cola apunta al CURSOR y no al centro del enlace,
     * porque es lo que hace el gadget con el texto comentado.
     * @param {HTMLAnchorElement} anchor - El enlace al que se ancla.
     * @param {number} cursorPageX - e.pageX del evento que lo disparó.
     */
    function positionTooltip(anchor, cursorPageX) {
        const tail = tooltipNode.querySelector('.rt-tooltipTail');
        tail.style.left = '';
        tooltipNode.style.right = '';
        tooltipNode.classList.remove('rt-tooltip-below', 'rt-fade-in-up');
        tooltipNode.classList.add('rt-tooltip-above', 'rt-fade-in-down');

        const rect = anchor.getBoundingClientRect();
        const anchorPageTop = rect.top + window.scrollY;
        tooltipNode.style.top = `${anchorPageTop - tooltipNode.offsetHeight - RT_GAP_ABOVE}px`;
        tooltipNode.style.left = `${cursorPageX - RT_TAIL_OFFSET}px`;

        // ¿Se sale por la derecha? Se ancla a ese borde, y entonces la cola hay que
        // recolocarla a mano para que siga apuntando al cursor.
        if (tooltipNode.getBoundingClientRect().right > document.documentElement.clientWidth - 1) {
            tooltipNode.style.left = '';
            tooltipNode.style.right = '0';
            const boxPageLeft = tooltipNode.getBoundingClientRect().left + window.scrollX;
            tail.style.left = `${cursorPageX - boxPageLeft - 5}px`;
        }

        // ¿No cabe por arriba? Pasa debajo del enlace y la animación se invierte.
        if (rect.top < tooltipNode.offsetHeight + RT_EDGE_MARGIN) {
            tooltipNode.classList.remove('rt-tooltip-above', 'rt-fade-in-down');
            tooltipNode.classList.add('rt-tooltip-below', 'rt-fade-in-up');
            tooltipNode.style.top = `${anchorPageTop + rect.height + RT_GAP_BELOW}px`;
        }
    }

    /**
     * Muestra el tooltip de un enlace.
     * @param {HTMLAnchorElement} anchor - El enlace hovereado.
     * @param {string} text - Su texto de tooltip.
     * @param {number} cursorPageX - e.pageX del mouseenter.
     */
    function showTooltip(anchor, text, cursorPageX) {
        // Al saltar de un enlace al otro sin que el primero acabara de cerrarse, su
        // cierre se canceló y con él la devolución del title; se devuelve aquí.
        if (active && active.anchor !== anchor) active.anchor.title = active.text;

        tooltipNode.querySelector('.rt-tooltipContent').textContent = text;
        tooltipNode.classList.remove('rt-fade-out-up', 'rt-fade-out-down');
        if (!tooltipNode.isConnected) document.body.appendChild(tooltipNode);

        // Se retira el title mientras el tooltip está arriba para no ver los dos, uno
        // encima del otro; el gadget hace lo mismo con el texto comentado.
        anchor.removeAttribute('title');
        active = { anchor, text };
        positionTooltip(anchor, cursorPageX);
    }

    /** Programa el cierre con el margen del gadget; volver a entrar lo cancela. */
    function scheduleHide() {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        hideTimer = setTimeout(fadeOutTooltip, RT_HIDE_GRACE_MS);
    }

    /** Cierra el tooltip con la animación que corresponda a su posición. */
    function fadeOutTooltip() {
        if (!active) return;
        active.anchor.title = active.text;  // devolver el title del navegador
        active = null;
        if (!tooltipNode || !tooltipNode.isConnected) return;

        const above = tooltipNode.classList.contains('rt-tooltip-above');
        tooltipNode.classList.remove(above ? 'rt-fade-in-down' : 'rt-fade-in-up');
        tooltipNode.classList.add(above ? 'rt-fade-out-up' : 'rt-fade-out-down');
        removeTimer = setTimeout(() => tooltipNode.remove(), RT_FADE_MS);
    }

    /**
     * Cuelga el tooltip de la wiki de los enlaces indicados. Solo por hover: el clic
     * no se toca nunca, para no interponerse en lo único que el enlace tiene que
     * hacer. El `title` de cada uno se deja puesto: es la caída cuando esto no se
     * monta (gadget apagado, clases renombradas) y es lo que se restaura al cerrar.
     * @param {Array<[HTMLAnchorElement, string]>} pairs - Enlace y su texto.
     */
    function attachWikiTooltips(pairs) {
        const settings = readRtSettings();
        // Apagado desde el engranaje: se respeta.
        if (!settings.enabled) return;

        const node = buildTooltipNode();
        if (!rtStylesAreLive(node)) return;
        tooltipNode = node;

        for (const [anchor, text] of pairs) {
            anchor.addEventListener('mouseenter', (e) => {
                clearTimeout(hideTimer);
                clearTimeout(removeTimer);
                const cursorPageX = e.pageX;
                showTimer = setTimeout(
                    () => showTooltip(anchor, text, cursorPageX),
                    settings.delay
                );
            });
            anchor.addEventListener('mouseleave', scheduleHide);
        }
    }

    /**
     * Estilos de los dos botones.
     *
     * Lo que tenían en línea se muda aquí porque un estilo en línea no se puede
     * matizar desde una media query: gana siempre, y el ancho estrecho necesita
     * justo eso, cambiar el margen y el tamaño del icono.
     *
     * En estrecho los enlaces NO salen del encabezado —siguen colgando del <h2>,
     * que es donde el lector los busca—: lo que se recorta es lo que sobra para
     * que quepan en su renglón. Heredan el cuerpo del encabezado, que en Minerva
     * es grande, así que se les fija un tamaño propio; con eso y las etiquetas
     * cortas, "Availability" y los dos botones caben en una línea.
     */
    function injectStyles() {
        if (document.getElementById(STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = STYLES_ID;
        style.textContent = `
            .${BTN_CLASS} { margin-left: 10px; white-space: nowrap; }
            .${ICON_CLASS} { width: 16px; height: 16px; vertical-align: middle; margin-right: 5px; }
            .${LABEL_SHORT_CLASS} { display: none; }
            @media screen and (max-width: ${NARROW_MAX_WIDTH}px) {
                .${BTN_CLASS} { margin-left: 8px; font-size: 14px; }
                .${ICON_CLASS} { width: 14px; height: 14px; margin-right: 4px; }
                .${LABEL_LONG_CLASS} { display: none; }
                .${LABEL_SHORT_CLASS} { display: inline; }
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    /**
     * Crea un enlace con estilo de botón externo para PCGamingWiki.
     * @param {string} text - Texto visible del botón en pantalla ancha.
     * @param {string} shortText - Su versión corta, la que se ve en estrecho.
     * @param {string} url - URL de destino.
     * @param {string} tooltip - Texto del title (explica si el enlace es exacto o no).
     * @returns {HTMLAnchorElement} El enlace/botón creado.
     */
    function createLinkButton(text, shortText, url, tooltip) {
        const a = document.createElement('a');
        a.className = `external text ${BTN_CLASS}`;
        a.href = url;
        a.title = tooltip;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';  // la pestaña destino no recibe window.opener ni el referer

        const img = document.createElement('img');
        img.className = ICON_CLASS;
        img.src = GGDEALS_ICON_URL;
        img.alt = '';
        img.addEventListener('error', () => img.remove());  // sin icono si el CSP lo bloquea
        a.appendChild(img);

        const long = document.createElement('span');
        long.className = LABEL_LONG_CLASS;
        long.textContent = text;
        const short = document.createElement('span');
        short.className = LABEL_SHORT_CLASS;
        short.textContent = shortText;
        a.appendChild(long);
        a.appendChild(short);
        return a;
    }

    /**
     * Punto de entrada: genera los botones de GGDeals (directo + búsqueda)
     * y los inserta junto al encabezado "Availability" de la wiki.
     */
    function init() {
        const { kebab, search } = extractGameTitle();

        const directBtn = createLinkButton(
            DIRECT_LABEL, DIRECT_LABEL_SHORT, `${GGDEALS_GAME_URL}${kebab}`, DIRECT_TOOLTIP);
        const searchBtn = createLinkButton(
            SEARCH_LABEL, SEARCH_LABEL_SHORT, `${GGDEALS_SEARCH_URL}${search}`, SEARCH_TOOLTIP);

        const header = document.getElementById(AVAILABILITY_HEADER_ID);
        if (header) {
            injectStyles();
            header.appendChild(directBtn);
            header.appendChild(searchBtn);
            // Después de insertarlos: la comprobación del CSS mide un nodo dentro del
            // documento, y el posicionamiento necesita que los enlaces ya ocupen sitio.
            attachWikiTooltips([[directBtn, DIRECT_TOOLTIP], [searchBtn, SEARCH_TOOLTIP]]);
        }
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================
    try {
        init();
    } catch (e) {
        console.error('(pcgw2ggdeals): Error al crear los botones GGDeals:', e);
    }
})();
