// ==UserScript==
// @name         PCGamingWiki to GGDeals Link Generator
// @namespace    https://www.gg.deals/
// @version      1.2.4
// @description  Adds two GG.deals buttons to the Availability section of PCGamingWiki articles: a direct link built from the title, which is fast but can 404, and a title search, which always returns something. Each says which it is in its tooltip, and titles are normalised the way GG.deals writes its slugs.
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
    const DIRECT_TOOLTIP = "Direct link — may 404 if the slug doesn't match";
    const SEARCH_TOOLTIP = 'Title search — always returns something';

    /**
     * Crea un enlace con estilo de botón externo para PCGamingWiki.
     * @param {string} text - Texto visible del botón.
     * @param {string} url - URL de destino.
     * @param {string} tooltip - Texto del title (explica si el enlace es exacto o no).
     * @returns {HTMLAnchorElement} El enlace/botón creado.
     */
    function createLinkButton(text, url, tooltip) {
        const a = document.createElement('a');
        a.className = 'external text';
        a.href = url;
        a.title = tooltip;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';  // la pestaña destino no recibe window.opener ni el referer
        a.style.marginLeft = '10px';

        const img = document.createElement('img');
        img.src = GGDEALS_ICON_URL;
        img.alt = '';
        img.style.width = '16px';
        img.style.height = '16px';
        img.style.verticalAlign = 'middle';
        img.style.marginRight = '5px';
        img.addEventListener('error', () => img.remove());  // sin icono si el CSP lo bloquea
        a.appendChild(img);
        a.appendChild(document.createTextNode(text));
        return a;
    }

    /**
     * Punto de entrada: genera los botones de GGDeals (directo + búsqueda)
     * y los inserta junto al encabezado "Availability" de la wiki.
     */
    function init() {
        const { kebab, search } = extractGameTitle();

        const directBtn = createLinkButton('View on GGDeals', `${GGDEALS_GAME_URL}${kebab}`, DIRECT_TOOLTIP);
        const searchBtn = createLinkButton('Search on GGDeals', `${GGDEALS_SEARCH_URL}${search}`, SEARCH_TOOLTIP);

        const header = document.getElementById(AVAILABILITY_HEADER_ID);
        if (header) {
            header.appendChild(directBtn);
            header.appendChild(searchBtn);
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
