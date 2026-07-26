# PCGamingWiki to GGDeals Link Generator

Userscript de Tampermonkey que añade botones a GG.deals en las páginas de PCGamingWiki. / Tampermonkey userscript that adds GG.deals buttons to PCGamingWiki pages.

## Español

**Qué hace:** en las páginas de juego de **PCGamingWiki** añade botones hacia **[GG.deals](https://gg.deals/)** para acceso directo y búsqueda por título, y así comparar precios y ofertas del juego que estás consultando.

**Instalación:**
1. Instala [Tampermonkey](https://www.tampermonkey.net/).
2. Abre el instalador: [pcgamingwiki-to-ggdeals.user.js](https://github.com/g31w0fw0rld/pcgamingwiki-to-ggdeals/raw/main/pcgamingwiki-to-ggdeals.user.js) (también en [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) y [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sitio:** `pcgamingwiki.com`

## English

**What it does:** on **PCGamingWiki** game pages it adds buttons to **[GG.deals](https://gg.deals/)** for direct access and search by title, so you can compare prices and deals for the game you are viewing.

**Install:**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the installer: [pcgamingwiki-to-ggdeals.user.js](https://github.com/g31w0fw0rld/pcgamingwiki-to-ggdeals/raw/main/pcgamingwiki-to-ggdeals.user.js) (also on [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) and [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Site:** `pcgamingwiki.com`

## Privacidad / Privacy

**ES:** el script no hace ninguna petición de red ni guarda nada: solo lee el título de la página (`document.title`) para sacar el nombre del juego e inserta los enlaces hacia GG.deals. Declara `@grant none`, así que no tiene acceso a las APIs privilegiadas del gestor de userscripts (almacenamiento, peticiones entre dominios). No se envía nada a terceros ni al autor, y solo visitas GG.deals si haces clic en un botón.

**EN:** the script makes no network requests and stores nothing: it only reads the page title (`document.title`) to get the game name and inserts the GG.deals links. It declares `@grant none`, so it has no access to the userscript manager's privileged APIs (storage, cross-origin requests). Nothing is sent to third parties or to the author, and you only visit GG.deals if you click a button.

## Apoyar / Support

Esto es parte de algo que estoy construyendo para crecer. Si te sirve y quieres apoyar, puedes invitarme un café en **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —solo si quieres—; y si hay una causa que lo necesite más que yo, ayúdala a ella.

This is part of something I'm building to grow. If it helps you and you'd like to support it, you can tip me on **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —only if you want—; and if a cause needs it more than I do, help that one instead.

---
Autor / Author: **g31w0fw0rld** · Licencia / License: **MIT**
