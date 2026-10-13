/* Draws the Nest mark (window.NEST_MARK, generated with nest-mark.svg) into replicas of the terminal's
   top bar and the Nest window's title bar. Nothing is fetched; the page works from file://. */
(function () {
    "use strict";

    var T = {
        ru: {
            title: "Nest — свой значок",
            lead: "Механический колибри Colibri в своём гнезде, в синих цветах Colibri. Сверху — полный знак, с двумя птенцами. В терминале значок живёт в 15–16 px, там птенцы превращаются в шум, поэтому кнопка Nest в верхней панели и заголовок окна Nest берут знак без птенцов — один и тот же, в цвете. Пульт внизу переключает масштаб экрана (100, 150, 200 %).",
            toolbar: "Верхняя панель терминала",
            toolbarHint: "Значок в цвете, 15 px, среди одноцветных соседей. «Было» — нынешний значок витрины.",
            titlebar: "Заголовок окна Nest",
            titlebarHint: "Тот же значок, 16 px. Третья полоса — цвет заголовка, выбранный пользователем: в прорезях значка должен быть виден он.",
            loupe: "Под лупой",
            loupeHint: "Значок, отрисованный в настоящий размер (15 и 16 px, при 100 и 200 %), и увеличенный без сглаживания — так его видит глаз на экране.",
            sizes: "Размеры",
            sizesHint: "15 и 16 px — рабочие размеры терминала, знак без птенцов. С 24 px — полный знак с птенцами (сайт Nest, крупные места).",
            before: "Было",
            after: "Стало",
            hover: "при наведении",
            light: "Светлая тема",
            dark: "Тёмная тема",
            custom: "Свой цвет заголовка",
            theme: "Страница:",
            scale: "Масштаб:",
            menu: ["Подключения", "Настройки", "P&L", "Сделки", "Окно"]
        },
        en: {
            title: "Nest — its own mark",
            lead: "Colibri's mechanical hummingbird in its nest, in Colibri's blues. Top: the full mark, with its two chicks. In the terminal the mark lives at 15–16 px, where the chicks turn to noise, so the Nest button in the top bar and the Nest window's title bar take the mark without them — the same one, in colour. The bar at the bottom switches the display scale (100, 150, 200 %).",
            toolbar: "The terminal's top bar",
            toolbarHint: "The mark in colour at 15 px, among one-colour neighbours. “Before” is today's storefront glyph.",
            titlebar: "The Nest window's title bar",
            titlebarHint: "The same mark at 16 px. The third strip is a header colour a user picked: it must show through the mark's cut-outs.",
            loupe: "Under the loupe",
            loupeHint: "The mark rasterised at its real size (15 and 16 px, at 100 and 200 %), then blown up without smoothing — what the eye gets on screen.",
            sizes: "Sizes",
            sizesHint: "15 and 16 px are the terminal's sizes, the mark without chicks. From 24 px up, the full mark with its chicks (the Nest site, large places).",
            before: "Before",
            after: "After",
            hover: "on hover",
            light: "Light theme",
            dark: "Dark theme",
            custom: "A custom header colour",
            theme: "Page:",
            scale: "Scale:",
            menu: ["Connections", "Settings", "P&L", "Trades", "Window"]
        }
    };

    /* Neighbour glyphs: Material Design Icons (Pictogrammers, Apache 2.0), the set the terminal uses. */
    var MDI = {
        lan: "M10,2C8.89,2 8,2.89 8,4V7C8,8.11 8.89,9 10,9H11V11H2V13H6V15H5C3.89,15 3,15.89 3,17V20C3,21.11 3.89,22 5,22H9C10.11,22 11,21.11 11,20V17C11,15.89 10.11,15 9,15H8V13H16V15H15C13.89,15 13,15.89 13,17V20C13,21.11 13.89,22 15,22H19C20.11,22 21,21.11 21,20V17C21,15.89 20.11,15 19,15H18V13H22V11H13V9H14C15.11,9 16,8.11 16,7V4C16,2.89 15.11,2 14,2H10M10,4H14V7H10V4M5,17H9V20H5V17M15,17H19V20H15V17Z",
        cog: "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z",
        trend: "M16,6L18.29,8.29L13.41,13.17L9.41,9.17L2,16.59L3.41,18L9.41,12L13.41,16L19.71,9.71L22,12V6H16Z",
        list: "M7,5H21V7H7V5M7,13V11H21V13H7M4,4.5A1.5,1.5 0 0,1 5.5,6A1.5,1.5 0 0,1 4,7.5A1.5,1.5 0 0,1 2.5,6A1.5,1.5 0 0,1 4,4.5M4,10.5A1.5,1.5 0 0,1 5.5,12A1.5,1.5 0 0,1 4,13.5A1.5,1.5 0 0,1 2.5,12A1.5,1.5 0 0,1 4,10.5M7,19V17H21V19H7M4,16.5A1.5,1.5 0 0,1 5.5,18A1.5,1.5 0 0,1 4,19.5A1.5,1.5 0 0,1 2.5,18A1.5,1.5 0 0,1 4,16.5Z",
        open: "M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z",
        store: "M5.06 3C4.63 3 4.22 3.14 3.84 3.42C3.46 3.7 3.24 4.06 3.14 4.5L2.11 8.91C1.86 10 2.06 10.92 2.69 11.73C2.81 11.85 2.93 11.97 3.04 12.07C3.63 12.64 4.28 13 5.22 13C6.16 13 6.91 12.59 7.47 12.05C8.1 12.67 8.86 13 9.8 13C10.64 13 11.44 12.63 12 12.07C12.68 12.7 13.45 13 14.3 13C15.17 13 15.91 12.67 16.54 12.05C17.11 12.62 17.86 13 18.81 13C19.76 13 20.43 12.65 21 12.06C21.09 11.97 21.18 11.87 21.28 11.77C21.94 10.95 22.14 10 21.89 8.91L20.86 4.5C20.73 4.06 20.5 3.7 20.13 3.42C19.77 3.14 19.38 3 18.94 3M18.89 4.97L19.97 9.38C20.06 9.81 19.97 10.2 19.69 10.55C19.44 10.86 19.13 11 18.75 11C18.44 11 18.17 10.9 17.95 10.66C17.73 10.43 17.61 10.16 17.58 9.84L16.97 5M5.06 5H7.03L6.42 9.84C6.3 10.63 5.91 11 5.25 11C4.84 11 4.53 10.86 4.31 10.55C4.03 10.2 3.94 9.81 4.03 9.38M9.05 5H11V9.7C11 10.05 10.89 10.35 10.64 10.62C10.39 10.88 10.08 11 9.7 11C9.36 11 9.07 10.88 8.84 10.59C8.61 10.3 8.5 10 8.5 9.66V9.5M13 5H14.95L15.5 9.5C15.58 9.92 15.5 10.27 15.21 10.57C14.95 10.87 14.61 11 14.2 11C13.89 11 13.61 10.88 13.36 10.62C13.11 10.35 13 10.05 13 9.7M3 14.03V19C3 20.11 3.89 21 5 21C9.67 21 14.33 21 19 21C20.1 21 21 20.11 21 19V14.05C20.45 14.63 19.75 14.96 19 15C18 15.03 17.25 14.74 16.54 14.05C15.94 14.65 15.14 15 14.3 15C13.4 15 12.6 14.64 12 14.07C11.43 14.64 10.65 15 9.78 15C8.87 15 8.07 14.65 7.47 14.05C6.89 14.64 6.1 15 5.23 15C4.33 15 3.66 14.65 3 14.03Z",
        bullhorn: "M12,8H4A2,2 0 0,0 2,10V14A2,2 0 0,0 4,16H5V20A1,1 0 0,0 6,21H8A1,1 0 0,0 9,20V16H12L17,20V4L12,8M15,15.6L13,14H4V10H13L15,8.4V15.6M21.5,12C21.5,13.71 20.54,15.26 19,16V8C20.53,8.75 21.5,10.3 21.5,12Z",
        min: "M20,14H4V10H20",
        max: "M4,4H20V20H4V4M6,8V18H18V8H6Z",
        close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"
    };

    /* Two drawings of one mark: the small one (no chicks) up to 20 px, the full one (with its chicks) above. */
    function at(size) {
        return size <= 20 ? window.NEST_MARK.small : window.NEST_MARK.full;
    }

    function glyph(d, size) {
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="' + d + '"/></svg>';
    }
    function mono(size) {
        var m = at(size).mono;
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="' + m.rule + '" d="' + m.d + '"/></svg>';
    }
    function brand(size) {
        var paths = at(size).brand
            .map(function (p) {
                return '<path style="fill:var(--nest-' + p.ink + ')" fill-rule="' + p.rule + '" d="' + p.d + '"/>';
            })
            .join("");
        return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
    }

    function topbar(chrome, nestGlyph, hover, t) {
        var items = [MDI.lan, MDI.cog, MDI.trend, MDI.list, MDI.open]
            .map(function (d, i) {
                return '<span class="item">' + glyph(d, 15) + t.menu[i] + "</span>";
            })
            .join("");
        return (
            '<div class="topbar ' + chrome + '"><img class="logo" src="colibri-logo.png" alt="" /><span class="brandname">Colibri</span>' +
            items +
            '<span class="item' + (hover ? " hover" : "") + '">' + nestGlyph + "Nest</span></div>"
        );
    }

    function titlebar(chrome) {
        return (
            '<div class="titlebar ' + chrome + '">' + brand(16) + '<span class="name">Nest</span><span class="grow"></span>' +
            '<span class="cap">' + glyph(MDI.bullhorn, 15) + "</span>" +
            '<span class="cap">' + glyph(MDI.min, 14) + "</span>" +
            '<span class="cap">' + glyph(MDI.max, 14) + "</span>" +
            '<span class="cap">' + glyph(MDI.close, 14) + "</span></div>"
        );
    }

    function strip(chrome, draw) {
        return (
            '<div class="sizes ' + chrome + '">' +
            [15, 16, 24, 32, 48, 64]
                .map(function (s) {
                    return "<figure>" + draw(s) + "<figcaption>" + s + "</figcaption></figure>";
                })
                .join("") +
            "</div>"
        );
    }

    function render(lang) {
        var t = T[lang];
        document.documentElement.lang = lang;
        document.title = t.title;
        document.querySelectorAll("[data-i]").forEach(function (el) {
            el.textContent = t[el.getAttribute("data-i")];
        });
        document.querySelectorAll("[data-mark]").forEach(function (el) {
            var size = +el.getAttribute("data-size");
            el.innerHTML = el.getAttribute("data-mark") === "mono" ? mono(size) : brand(size);
        });

        var tb = "";
        [
            ["chrome-light", t.light],
            ["chrome-dark", t.dark]
        ].forEach(function (c) {
            tb += '<div class="tag">' + c[1] + " · " + t.before + "</div>" + topbar(c[0], glyph(MDI.store, 15), false, t);
            tb += '<div class="tag">' + c[1] + " · " + t.after + "</div>" + topbar(c[0], brand(15), false, t);
            tb += '<div class="tag">' + c[1] + " · " + t.after + ", " + t.hover + "</div>" + topbar(c[0], brand(15), true, t);
        });
        document.getElementById("toolbars").innerHTML = tb;

        document.getElementById("titlebars").innerHTML = [
            ["chrome-light", t.light],
            ["chrome-dark", t.dark],
            ["chrome-custom", t.custom]
        ]
            .map(function (c) {
                return '<div class="tag">' + c[1] + "</div>" + titlebar(c[0]);
            })
            .join("");

        document.getElementById("sizes").innerHTML = strip("chrome-light", brand) + strip("chrome-dark", brand);
    }

    /* The loupe: rasterise at the real pixel size on the chrome's header colour, then show it blown up. */
    var LOUPE_INKS = {
        light: { bg: "#ebf2fa", dim: "#475569", twig: "#117fdb", wing: "#1e7fff", steel: "#1954db", beak: "#117fdb", core: "#5bb0ff", eyes: "#5bb0ff", neon: "#5bb0ff" },
        dark: { bg: "#0e1a2e", dim: "#94a3b8", twig: "#117fdb", wing: "#1e7fff", steel: "#7fb4ff", beak: "#1954db", core: "#5bb0ff", eyes: "#ffffff", neon: "#a8d2ff" }
    };
    function loupe() {
        var host = document.getElementById("loupe");
        host.innerHTML = "";
        [
            ["brand", "light", 15],
            ["brand", "dark", 15],
            ["brand", "light", 16],
            ["brand", "dark", 16],
            ["brand", "light", 32],
            ["brand", "dark", 32]
        ].forEach(function (c) {
            var ink = LOUPE_INKS[c[1]],
                px = c[2];
            var m = at(px);
            var paths =
                c[0] === "mono"
                    ? '<path fill="' + ink.dim + '" fill-rule="' + m.mono.rule + '" d="' + m.mono.d + '"/>'
                    : m.brand
                          .map(function (p) {
                              return '<path fill="' + ink[p.ink] + '" fill-rule="' + p.rule + '" d="' + p.d + '"/>';
                          })
                          .join("");
            var img = new Image();
            img.onload = function () {
                var cv = document.createElement("canvas");
                cv.width = px;
                cv.height = px;
                var g = cv.getContext("2d");
                g.fillStyle = ink.bg;
                g.fillRect(0, 0, px, px);
                g.drawImage(img, 0, 0);
                var fig = document.createElement("figure");
                fig.innerHTML = '<img alt="" src="' + cv.toDataURL() + '" /><figcaption>' + c[0] + " · " + c[1] + " · " + px + " px</figcaption>";
                host.appendChild(fig);
            };
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 24 24">' + paths + "</svg>");
        });
    }

    function pressed(attr, value) {
        document.querySelectorAll("[" + attr + "]").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute(attr) === value));
        });
    }

    var params = new URLSearchParams(location.search);
    var state = {
        lang: params.get("lang") === "en" ? "en" : "ru",
        theme: params.get("theme") === "light" ? "light" : "dark",
        scale: ["1", "1.5", "2"].indexOf(params.get("scale")) >= 0 ? params.get("scale") : "1"
    };
    if (params.get("bare") === "1") document.documentElement.classList.add("bare");

    function apply() {
        document.documentElement.setAttribute("data-theme", state.theme);
        document.documentElement.style.setProperty("--scale", state.scale);
        render(state.lang);
        loupe();
        pressed("data-lang-set", state.lang);
        pressed("data-theme-set", state.theme);
        pressed("data-scale-set", state.scale);
    }

    document.addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.hasAttribute("data-lang-set")) state.lang = b.getAttribute("data-lang-set");
        if (b.hasAttribute("data-theme-set")) state.theme = b.getAttribute("data-theme-set");
        if (b.hasAttribute("data-scale-set")) state.scale = b.getAttribute("data-scale-set");
        apply();
    });

    apply();
})();
