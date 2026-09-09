/* The catalog mock's ONE data source, state model and three renderers.

   Why one file for three pages: the row is what the owner is choosing, so the ten rows must be
   identical between the variants. A variant page carries only chrome plus an empty <div id="catalog">;
   everything inside a row comes from here, so a chip order or a button state cannot drift between
   variant-1 and variant-3.

   Loaded AFTER kit/mockup.js, so window.NEST exists. mount() runs on DOMContentLoaded — after the
   kit's own handler has injected the icon sprite — and hands the rendered subtree to NEST.applyI18n.

   Translation is DECLARATIVE, never baked: rows carry data-i18n / data-vars for UI strings,
   data-ru / data-en for wire data, <time data-ts> for dates and [data-bytes] for sizes. That is why
   the RU|EN toggle works with no re-render — the kit re-applies over the whole document. */

(function () {
    "use strict";

    /* ---------------------------------------------------------------- wire data
       The ten listings of the live catalog, copied verbatim from the registry cache
       the public catalog API (schemaVersion 1, generatedAtMs 1788786471240 =
       2026-09-07). Typos, the "sssss" description and the changelog-in-a-description are the real
       values — descriptions are wire data, not authored, and a mock that tidies them would hide the
       density the owner is judging. Every field below is on the public catalog API today. */
    var LISTINGS = [
        {
            id: "algoradar", name: "AlgoRadar", version: "1.0.5", author: "Vazgen",
            firstParty: false, reviewed: true, category: "research",
            tags: ["Анализ тиков", "Поиск торговых роботов-алгоритмов", "Открытие комбо-стаканов"],
            descriptionRu: "Поиск роботов-алгоритмов через глубкоий анализ тиков",
            descriptionEn: "Finding algorithmic robots through deep tick analysis",
            mode: "bundled",
            hash: "bfa1a7336d2b3bf237c8877f51d8de1223ac4a00531703127843a8023a3dddf0",
            sizeBytes: 1827194, surfaces: ["slot", "window"],
            permissions: ["storage", "panels", "marketData"],
            egress: ["*.asterdex.com", "*.binance.com", "*.bitget.com", "*.bybit.com", "*.coinbase.com",
                "*.crypto.com", "*.gateio.ws", "*.kucoin.com", "*.mexc.com", "*.okx.com",
                "api.coingecko.com", "api.htx.com", "api.huobi.pro", "api.hyperliquid.xyz", "api.upbit.com"],
            minApiVersion: 1, embeddedOrigins: [],
            authorTelegramUrl: "https://t.me/+pEcN26DWuMlkNmIy"
        },
        {
            id: "colibri-screener", name: "Colibri Screener", version: "1.1.0", author: "Stepan",
            firstParty: false, reviewed: true, category: "analytics",
            tags: ["Colibri Screened By Stepan"],
            descriptionRu: "sssss", descriptionEn: "sssss",
            mode: "bundled",
            hash: "69552f373a8ce9d02942d630d91401ab912d15cd899dc2d75852c1bf5aad7058",
            sizeBytes: 21524, surfaces: ["slot", "window"],
            permissions: ["marketData", "panels", "notifications", "signalLevels"],
            egress: [], minApiVersion: 1, embeddedOrigins: []
        },
        {
            id: "crypto-market-map", name: "Карта рынка", version: "1.0.0", author: "Aleksandr",
            firstParty: false, reviewed: true, category: "alerts",
            tags: ["market-map", "screener", "volume-spike", "charts", "hyperliquid"],
            descriptionRu: "Сетка из 4, 9 или 16 живых графиков, которая сама наполняется монетами со всплеском объёма — Binance, Bybit, Aster, MEXC и Hyperliquid, десять спот- и фьючерсных рынков, с отсевом по объёму и числу сделок за 24 часа. Клик по монете открывает её панелью в терминале, а уровни и алерты с графика уходят в лесенку.",
            descriptionEn: "A grid of 4, 9 or 16 live charts that fills itself with coins caught by a volume-spike scan across Binance, Bybit, Aster, MEXC and Hyperliquid — ten spot and perp markets, filtered by 24h volume and trade count. Click a coin to open it in a terminal panel; levels and alerts drawn on a chart go to the terminal's ladder.",
            mode: "bundled",
            hash: "136b2ec9ff69e185a25778996c9b8ece819d5a05fe1bbc99b3126d9187cce196",
            sizeBytes: 931758, surfaces: ["slot", "window"],
            permissions: ["panels", "signalLevels", "storage"],
            egress: ["data-api.binance.vision", "data-stream.binance.vision", "fapi.binance.com",
                "fstream.binance.com", "api.bybit.com", "stream.bybit.com", "sapi.asterdex.com",
                "sstream.asterdex.com", "fapi.asterdex.com", "fstream.asterdex.com", "api.mexc.com",
                "api.hyperliquid.xyz", "t.me"],
            minApiVersion: 1, embeddedOrigins: []
        },
        {
            id: "funding-monitor", name: "Фандинг-монитор", version: "1.0.0", author: "Colibri",
            firstParty: true, reviewed: true, category: "analytics",
            tags: ["funding", "screener"],
            descriptionRu: "Ставки финансирования по шести биржам — в годовых, отсортированы по экстремальности, с обратным отсчётом расчёта и алертами по порогу.",
            descriptionEn: "Funding rates across six venues, annualized and sorted by extremity, with settlement countdowns and threshold alerts.",
            mode: "bundled",
            hash: "09a754fdea4375461f6396929059810988bf00d0b22c326cb3f7a8fef29d0244",
            sizeBytes: 72302, surfaces: ["slot", "window"],
            permissions: ["notifications", "signalLevels", "storage"],
            egress: ["fapi.binance.com", "api.bybit.com", "api.gateio.ws", "api-futures.kucoin.com",
                "futures.kraken.com", "api.hyperliquid.xyz"],
            minApiVersion: 1, embeddedOrigins: []
        },
        {
            id: "large-tick-timer", name: "Таймер Крупных Тиков", version: "1.0.6", author: "Exchange Speculator",
            firstParty: false, reviewed: true, category: "analytics",
            tags: ["крупные тики", "таймер тиков"],
            descriptionRu: "Отслеживает в секундах сколько времени проходит до следующиего крупного тика.",
            descriptionEn: "Tracks the time in seconds until the next large tick.",
            mode: "bundled",
            hash: "ccc690e1997d3e32c4179e80e2f63b3b4731d47e61eefb77ec3f99cad3e37400",
            sizeBytes: 221439, surfaces: ["window", "slot"],
            permissions: ["marketData", "panels", "notifications", "signalLevels", "storage"],
            egress: [], minApiVersion: 1, embeddedOrigins: [],
            authorYoutubeUrl: "https://www.youtube.com/@ExchangeSpeculator",
            authorTelegramUrl: "https://t.me/ExchangeSpeculator"
        },
        {
            id: "liquidation-radar", name: "Радар ликвидаций", version: "1.0.0", author: "Colibri",
            firstParty: true, reviewed: true, category: "alerts",
            tags: ["liquidations", "market-wide"],
            descriptionRu: "Живая лента ликвидаций по Binance, OKX, Bitget, Gate и Bybit — по всему рынку, с корзинами по размеру и звуковым порогом.",
            descriptionEn: "Live liquidation feed across Binance, OKX, Bitget, Gate and Bybit — market-wide, with size buckets and a sound threshold.",
            mode: "bundled",
            hash: "875859272d6fbfa5b0bcff9c1ad1978f8ce09456a34fea1f5d628ddd37cb0441",
            sizeBytes: 75162,
            /* slot only — which is why this row is the "installed, nothing to open" state below */
            surfaces: ["slot"],
            permissions: ["notifications", "signalLevels", "storage"],
            egress: ["fstream.binance.com", "ws.okx.com:8443", "www.okx.com", "ws.bitget.com",
                "fx-ws.gateio.ws", "api.gateio.ws", "stream.bybit.com", "api.bybit.com"],
            minApiVersion: 1, embeddedOrigins: []
        },
        {
            id: "oi-monitor", name: "OI Monitor", version: "1.1.3", author: "Michael Khodos",
            firstParty: false, reviewed: true, category: "market-data",
            tags: ["Open interest", "Ticker information"],
            descriptionRu: "Новая версия\nИзмененния: Добавлен поиск открытых инструментов. Добавлены информация о монете и ставка финансирования. Добавлено руководство пользователя ",
            descriptionEn: "New version\nChanges: Added a search for open instruments. Added coin information and funding rate. Added a user guide.",
            mode: "bundled",
            hash: "d897e1d382fde922f7eed162c87be19324962ff0fc4a4323304c9465aad7573b",
            sizeBytes: 46040, surfaces: ["slot", "window"],
            permissions: ["marketData", "panels", "storage"],
            egress: ["fapi.binance.com", "api.bybit.com", "www.okx.com", "api.bitget.com",
                "api.gateio.ws", "contract.mexc.com", "api-futures.kucoin.com", "futures.kraken.com",
                "api.hyperliquid.xyz", "api.hbdm.com", "fapi.asterdex.com", "omni.apex.exchange",
                "mainnet.zklighter.elliot.ai"],
            minApiVersion: 1, embeddedOrigins: []
        },
        {
            id: "scalp-lenta", name: "Pump & Dump / Impulse", version: "1.0.0", author: "Exchange Speculator",
            firstParty: false, reviewed: true, category: "alerts",
            tags: ["impulse", "pumpdump"],
            descriptionRu: "SCALP SCANNER (Binance Fut Impulse) — это высокоскоростной сканер, созданный специально для трейдеров-скальперов. Он в реальном времени отслеживает резкие всплески объемов и импульсные движения (Pump & Dump) на фьючерсах Binance.",
            descriptionEn: "SCALP SCANNER (Binance Fut Impulse) is a high-speed crypto market scanner designed specifically for scalpers. It tracks abnormal market density, and impulse movements (Pump & Dump) on Binance Futures in real time.",
            mode: "bundled",
            hash: "d72fd18bfe39156bfede9a0ae4758304b41d6fc35c369e5d7eebffa3adba36ee",
            sizeBytes: 116894, surfaces: ["slot", "window"],
            permissions: ["marketData", "panels", "notifications", "signalLevels", "storage"],
            egress: ["exchangespeculator.ru", "api.telegram.org"],
            minApiVersion: 1, embeddedOrigins: [],
            authorYoutubeUrl: "https://www.youtube.com/@ExchangeSpeculator",
            authorTelegramUrl: "https://t.me/ExchangeSpeculator"
        },
        {
            id: "scalpy-net", name: "SCALPY.NET", version: "1.0.0", author: "Armen Lalayan",
            firstParty: false, reviewed: true, category: "alerts",
            tags: ["scalpy", "scalper", "trading-dashboard", "price-spike"],
            descriptionRu: "Hosted-версия торгового дашборда SCALPY.NET для скальперов: рыночные инструменты",
            descriptionEn: "Hosted SCALPY.NET trading dashboard for scalpers, including live market tools and the Price Spike scanner.",
            mode: "bundled",
            hash: "fefe61689b52359f680547dbe0bcbdfc7d1faecb8af236f15a8b478ac9d3936b",
            sizeBytes: 139464, surfaces: ["slot", "window"],
            permissions: [],
            egress: ["scalpy.net"],
            minApiVersion: 1,
            /* the only listing that frames a remote site — the amber embeds chip REPLACES the green one */
            embeddedOrigins: ["https://scalpy.net"]
        },
        {
            id: "twap-radar", name: "TWAP-радар", version: "1.0.3", author: "Hayk Kupalyan",
            firstParty: true, reviewed: true, category: "market-data",
            tags: ["hyperliquid", "twap"],
            descriptionRu: "Все активные TWAP-заявки Hyperliquid",
            descriptionEn: "Every active TWAP order on Hyperliquid",
            mode: "bundled",
            hash: "da85e63b51c15fd192eed3a214aab2b14e714c414d4f0c89998b5d0502e8d189",
            sizeBytes: 84746, surfaces: ["slot", "window"],
            permissions: ["notifications", "panels", "storage"],
            egress: ["api.hypurrscan.io", "api.hyperliquid.xyz"],
            minApiVersion: 1, embeddedOrigins: []
        }
    ];

    /* ------------------------------------------------------------- placeholders
       NOTHING in this object is on the wire today. Kept SEPARATE from LISTINGS on purpose, so the
       boundary between "what the registry serves" and "what this mock invents" is visible in the
       source and not only in the README.
         installed / updateAvailable      the desktop's install-store relationship (real concept,
                                          invented values — a mock has no install store)
         installs / active7d              planned registry work (plus the telemetry that feeds 7 d)
         firstListedAt / updatedAt        planned
       colibri-screener deliberately has NO counts and NO dates: absent must render as "—" or as
       nothing at all, never as a zero and never as "listed today". */
    var MOCK = {
        "algoradar":          { installs: 412,  active7d: 138, firstListedAt: 1781222400000, updatedAt: 1787616000000 },
        "colibri-screener":   { /* counts and dates unknown — the never-zero rule, on screen */ },
        "crypto-market-map":  { installs: 96,   active7d: 31,  firstListedAt: 1786665600000, updatedAt: 1786665600000 },
        "funding-monitor":    { installed: true, installs: 1204, active7d: 507, firstListedAt: 1777680000000, updatedAt: 1786924800000 },
        "large-tick-timer":   { installs: 288,  active7d: 74,  firstListedAt: 1780272000000, updatedAt: 1788220800000 },
        "liquidation-radar":  { installed: true, installs: 863, active7d: 402, firstListedAt: 1777680000000, updatedAt: 1785196800000 },
        "oi-monitor":         { installed: true, updateAvailable: true, installs: 351, active7d: 120, firstListedAt: 1776124800000, updatedAt: 1788566400000 },
        "scalp-lenta":        { installs: 177,  active7d: 52,  firstListedAt: 1783382400000, updatedAt: 1783382400000 },
        "scalpy-net":         { installs: 59,   active7d: 12,  firstListedAt: 1787788800000, updatedAt: 1787788800000 },
        "twap-radar":         { installs: 23,   active7d: 9,   firstListedAt: 1788652800000, updatedAt: 1788652800000 }
    };

    /* "today" is PINNED so the NEW badge does not quietly expire and change what the owner reviews.
       The terminal will derive the badge client-side from firstListedAtMs with this window. */
    var NOW = Date.UTC(2026, 8, 9); /* 2026-09-09 */
    var NEW_WINDOW_DAYS = 14; /* the 14-day window the terminal will use */

    var CATEGORY_ORDER = ["alerts", "analytics", "market-data", "research", "trading", "portfolio", "productivity", "other"];
    var SORTS = ["name", "newest", "updated", "installs", "active"];
    var PAGE = 25; /* a page of 25, then a "Показать ещё" tail */

    /* ---------------------------------------------------------------- helpers */
    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/\r\n/g, "&#10;").replace(/\r/g, "&#10;").replace(/\n/g, "&#10;");
    }
    function lang() { return document.documentElement.lang === "en" ? "en" : "ru"; }
    function nameOf(e) { return e.name; }
    function descOf(e) { return lang() === "en" ? (e.descriptionEn || e.descriptionRu || "") : (e.descriptionRu || e.descriptionEn || ""); }
    function hostOf(origin) { try { return new URL(origin).host; } catch (err) { return origin; } }
    function mock(e) { return MOCK[e.id] || {}; }
    function isNew(e) {
        var m = mock(e);
        return typeof m.firstListedAt === "number" && (NOW - m.firstListedAt) < NEW_WINDOW_DAYS * 86400000;
    }
    /* a count that is not on the wire is UNKNOWN — the caller renders "—" or omits the line */
    function fmtCount(v) { return typeof v === "number" ? String(v) : null; }
    function num(v) { return typeof v === "number" ? v : null; }

    /* ------------------------------------------------------- the action cluster
       The desktop's foot rules, in ONE place:
         · the primary is ALWAYS visible and FLIPS with state, an update OUTRANKING the open;
         · an installed slot-only widget has nothing to open and nothing to update, so it renders the
           note and the ⋯ and NO button — never one that would do nothing;
         · showCheck = installed && !opensWindow — so a row carries EXACTLY ONE green element:
           either the green "Открыть в окне" button or the green check, never both. */
    function actionCluster(e) {
        var m = mock(e);
        var windowCapable = e.surfaces.indexOf("window") >= 0;
        var state = m.updateAvailable ? "update" : (m.installed ? "installed" : "none");
        var opensWindow = state === "installed" && windowCapable;
        return {
            state: state,
            primary: state === "update" ? "update" : (opensWindow ? "open" : (state === "installed" ? null : "install")),
            opensWindow: opensWindow,
            showCheck: state !== "none" && !opensWindow,
            slotNote: state === "installed" && !windowCapable,
            menu: state !== "none",
            openAsWindowInMenu: state === "update" && windowCapable
        };
    }

    /* ------------------------------------------------------------ the chip strip
       NestChipBuilder order, verbatim: url-only for a Remote entry; else the mode chip
       (bundled green / hosted amber / embeds amber REPLACING the green one, both when hosted AND
       embedding); then one chip per permission scope (trading red, account:read amber, rest plain);
       then the network chip (green "без сети" when the egress list is empty). */
    function chipsFor(e) {
        var out = [];
        if (e.remote) { out.push({ kind: "mode", cls: "chip-warn", key: "cat.chip.url" }); return out; }
        var embeds = e.embeddedOrigins || [];
        var hosted = e.mode !== "bundled";
        if (hosted) out.push({ kind: "mode", cls: "chip-warn", key: "cat.chip.hosted", icon: "i-warn" });
        if (embeds.length === 1) out.push({ kind: "mode", cls: "chip-warn", key: "cat.chip.embeds", vars: { host: hostOf(embeds[0]) }, icon: "i-warn" });
        else if (embeds.length > 1) out.push({ kind: "mode", cls: "chip-warn", key: "cat.chip.embedsCount", vars: { n: embeds.length }, icon: "i-warn" });
        if (!hosted && embeds.length === 0) out.push({ kind: "mode", cls: "chip-ok", key: "cat.chip.bundled", icon: "i-check" });
        (e.permissions || []).forEach(function (p) {
            out.push({ kind: "scope", cls: p === "trading" ? "chip-danger" : (p === "account:read" ? "chip-warn" : ""), key: "cat.scope." + p });
        });
        if ((e.egress || []).length === 0) out.push({ kind: "net", cls: "chip-ok", key: "cat.chip.noNetwork" });
        else out.push({ kind: "net", cls: "", key: "cat.chip.network", vars: { n: e.egress.length } });
        return out;
    }
    /* cap for a one-line strip. The network chip is NEVER the one hidden — it is the security fact
       a scanning reader is looking for. */
    function capChips(chips, cap) {
        if (chips.length <= cap) return { shown: chips, hidden: 0 };
        var shown = chips.slice(0, cap - 1);
        shown.push(chips[chips.length - 1]);
        return { shown: shown, hidden: chips.length - cap };
    }
    function chipHtml(c) {
        var vars = c.vars ? " data-vars='" + JSON.stringify(c.vars).replace(/'/g, "&#39;") + "'" : "";
        var icon = c.icon ? '<svg class="icon"><use href="#' + c.icon + '" /></svg>' : "";
        return '<span class="chip ' + c.cls + '">' + icon + '<span data-i18n="' + c.key + '"' + vars + "></span></span>";
    }
    function chipsHtml(chips, cap) {
        var r = cap ? capChips(chips, cap) : { shown: chips, hidden: 0 };
        var html = r.shown.map(chipHtml).join("");
        if (r.hidden > 0) html += '<span class="chip chip-dashed" data-i18n="cat.chip.more" data-vars=\'{"n":' + r.hidden + "}\'></span>";
        return html;
    }

    /* ------------------------------------------------------------- row fragments */
    function iconHtml(e, cls) {
        /* No listing in today's catalog ships an iconUrl, so every row falls back to the glyph.
           The glyph and a brand mark never render together. */
        return '<span class="' + cls + '" aria-hidden="true">🧩</span>';
    }
    function verifiedHtml(e) {
        return e.firstParty ? '<span class="chip chip-ok" data-i18n="cat.verified"></span>' : "";
    }
    function newHtml(e) {
        return isNew(e)
            ? '<span class="chip chip-info ph" data-i18n="cat.badge.new" data-i18n-attr="title:cat.badge.new.title"></span>'
            : "";
    }
    function likesHtml() {
        /* Likes are a later rating iteration: a marked slot, nothing designed around it. */
        return '<span class="likes-slot" data-i18n-attr="title:cat.likes.title"><span data-i18n="cat.likes"></span></span>';
    }
    /* bare vendor marks (no label of ours) for the dense/summary rows */
    function brandMarksHtml(e) {
        var out = "";
        if (e.authorYoutubeUrl) {
            out += '<a class="brand-mark" href="' + esc(e.authorYoutubeUrl) + '" title="' + esc(e.authorYoutubeUrl) + '"' +
                ' data-i18n-attr="aria-label:cat.author.youtube" target="_blank" rel="noreferrer">' +
                '<img class="yt on-dark" src="kit/assets/brands/youtube-on-dark.png" alt="" />' +
                '<img class="yt on-light" src="kit/assets/brands/youtube-on-light.png" alt="" /></a>';
        }
        if (e.authorTelegramUrl) {
            out += '<a class="brand-mark" href="' + esc(e.authorTelegramUrl) + '" title="' + esc(e.authorTelegramUrl) + '"' +
                ' data-i18n-attr="aria-label:cat.author.telegram" target="_blank" rel="noreferrer">' +
                '<img class="tg" src="kit/assets/brands/telegram.svg" alt="" /></a>';
        }
        return out;
    }
    /* full brand chips — the listing-hero treatment: the YouTube lockup carries no text of ours
       (it IS the wordmark), Telegram's round mark does. kit/assets/brands/README rules. */
    function brandChipsHtml(e) {
        var out = "";
        if (e.authorYoutubeUrl) {
            out += '<a class="brand-chip" href="' + esc(e.authorYoutubeUrl) + '" title="' + esc(e.authorYoutubeUrl) + '"' +
                ' data-i18n-attr="aria-label:cat.author.youtube" target="_blank" rel="noreferrer">' +
                '<img class="yt on-dark" src="kit/assets/brands/youtube-on-dark.png" alt="" />' +
                '<img class="yt on-light" src="kit/assets/brands/youtube-on-light.png" alt="" /></a>';
        }
        if (e.authorTelegramUrl) {
            out += '<a class="brand-chip" href="' + esc(e.authorTelegramUrl) + '" title="' + esc(e.authorTelegramUrl) + '" target="_blank" rel="noreferrer">' +
                '<img class="tg" src="kit/assets/brands/telegram.svg" alt="" /><span data-i18n="cat.author.telegram"></span></a>';
        }
        return out;
    }
    function actionsHtml(e) {
        var a = actionCluster(e);
        var html = "";
        if (a.showCheck) {
            html += '<span class="installed-mark" data-i18n-attr="title:cat.installed"><svg class="icon"><use href="#i-check" /></svg></span>';
        }
        if (a.slotNote) html += '<span class="slot-note" data-i18n="cat.slotOnly"></span>';
        if (a.primary === "install") html += '<button type="button" class="btn btn-sm btn-primary" data-i18n="cat.install"></button>';
        else if (a.primary === "update") html += '<button type="button" class="btn btn-sm btn-primary" data-i18n="cat.update"></button>';
        else if (a.primary === "open") html += '<button type="button" class="btn btn-sm btn-open" data-i18n="cat.openWindow"></button>';
        if (a.menu) {
            html += '<details class="menu"><summary class="btn btn-sm btn-icon" data-i18n-attr="aria-label:cat.menu.more">···</summary><div class="menu-list">';
            /* the desktop's ⋯ order; "Открыть в окне" appears here only on an update-pending row */
            if (a.openAsWindowInMenu) html += '<button type="button" data-i18n="cat.openWindow"></button>';
            html += '<label class="flag" style="padding:6px 10px"><input type="checkbox" checked /><span data-i18n="cat.menu.notifications"></span></label>';
            if (e.surfaces.indexOf("window") >= 0) html += '<label class="flag" style="padding:6px 10px"><input type="checkbox" /><span data-i18n="cat.menu.pinBookmark"></span></label>';
            html += '<button type="button" data-i18n="cat.menu.proxy"></button>';
            html += "<hr />";
            html += '<button type="button" data-i18n="cat.menu.revoke"></button>';
            html += '<button type="button" class="danger" data-i18n="cat.menu.uninstall"></button>';
            html += "</div></details>";
        }
        return '<div class="cat-actions">' + html + "</div>";
    }
    function nameCellHtml(e, nameCls) {
        return '<span class="' + nameCls + '" data-ru="' + esc(e.name) + '" data-en="' + esc(e.name) + '"></span>' +
            '<span class="mono dim">v' + esc(e.version) + "</span>" + verifiedHtml(e) + newHtml(e);
    }
    function timeHtml(ms) {
        return typeof ms === "number" ? '<time class="ph" data-ts="' + ms + '" data-fmt="date" data-i18n-attr="title:cat.mock.placeholder"></time>' : '<span class="num-unknown" data-i18n="cat.unknown"></span>';
    }

    /* ------------------------------------------------------------ variant 1: dense */
    function renderDense(rows, ctx) {
        var cap = ctx.narrow ? 2 : 3;
        var head =
            '<div class="table-scroll"><table class="data cat-dense">' +
            '<caption class="sr-only" data-i18n="cat.tableCaption"></caption><thead><tr>' +
            '<th scope="col" data-i18n="cat.th.widget"></th>' +
            '<th scope="col" class="num" data-i18n="cat.th.usage"></th>' +
            '<th scope="col" class="dates-cell" data-i18n="cat.th.dates"></th>' +
            '<th scope="col" data-i18n="cat.th.actions"></th>' +
            "</tr></thead><tbody>";
        var body = rows.map(function (e) {
            var m = mock(e);
            var installs = fmtCount(m.installs);
            var active = fmtCount(m.active7d);
            return '<tr' + (e.repeat ? ' class="row-repeat" data-i18n-attr="title:cat.mock.copyTitle"' : "") + ">" +
                '<td class="title-cell"><div class="d-title">' + iconHtml(e, "glyph") + nameCellHtml(e, "d-name") + brandMarksHtml(e) +
                '<span class="dim small">· ' + esc(e.author) + "</span></div>" +
                /* V1 trades the full description for density: one line, the rest in the title. */
                '<div class="d-desc" title="' + esc(descOf(e)) + '" data-ru="' + esc(e.descriptionRu) + '" data-en="' + esc(e.descriptionEn) + '"></div>' +
                '<div class="chips">' + chipsHtml(chipsFor(e), cap) + "</div></td>" +
                '<td class="num">' +
                (installs
                    ? '<span class="ph cat-num" data-i18n-attr="title:cat.mock.placeholder">' + installs + "</span>"
                    : '<span class="num-unknown" data-i18n="cat.unknown" data-i18n-attr="aria-label:cat.unknown.aria"></span>') +
                (active
                    ? '<div class="num-b ph" data-i18n-attr="title:cat.mock.placeholder">' + active + ' <span data-i18n="cat.active7d.short"></span></div>'
                    : '<div class="num-b num-unknown" data-i18n="cat.unknown"></div>') +
                '<div class="num-c">' + timeHtml(m.firstListedAt) + " · " + timeHtml(m.updatedAt) + "</div>" +
                likesHtml() + "</td>" +
                '<td class="dates-cell"><div class="d-dates">' + timeHtml(m.firstListedAt) + timeHtml(m.updatedAt) + "</div></td>" +
                '<td class="actions-cell">' + actionsHtml(e) + "</td></tr>";
        }).join("");
        return head + body + "</tbody></table></div>";
    }

    /* ------------------------------------------------------- variant 2: card rows */
    function renderCards(rows) {
        return '<div class="cat-cards">' + rows.map(function (e) {
            var m = mock(e);
            var chips = chipsFor(e);
            var modeChips = chips.filter(function (c) { return c.kind === "mode"; });
            var scopeChips = chips.filter(function (c) { return c.kind === "scope"; });
            var netChips = chips.filter(function (c) { return c.kind === "net"; });
            var meta = "";
            if (typeof m.installs === "number") meta += '<dt data-i18n="cat.installs"></dt><dd class="ph" data-i18n-attr="title:cat.mock.placeholder">' + m.installs + "</dd>";
            if (typeof m.active7d === "number") meta += '<dt data-i18n="cat.active7d"></dt><dd class="ph" data-i18n-attr="title:cat.mock.placeholder">' + m.active7d + "</dd>";
            if (typeof m.firstListedAt === "number") meta += '<dt data-i18n="cat.firstListed"></dt><dd>' + timeHtml(m.firstListedAt) + "</dd>";
            if (typeof m.updatedAt === "number") meta += '<dt data-i18n="cat.updated"></dt><dd>' + timeHtml(m.updatedAt) + "</dd>";
            meta += '<dt data-i18n="cat.facts.size"></dt><dd data-bytes="' + e.sizeBytes + '"></dd>';
            meta += '<dt data-i18n="cat.facts.hashShort"></dt><dd class="mono">' + esc(e.hash.slice(0, 8)) + "…</dd>";
            var inline = [];
            if (typeof m.installs === "number") inline.push('<span class="ph">' + m.installs + ' <span data-i18n="cat.installs"></span></span>');
            if (typeof m.active7d === "number") inline.push('<span class="ph">' + m.active7d + ' <span data-i18n="cat.active7d.short"></span></span>');
            if (typeof m.firstListedAt === "number") inline.push('<span><span data-i18n="cat.firstListed"></span> ' + timeHtml(m.firstListedAt) + "</span>");
            if (typeof m.updatedAt === "number") inline.push('<span><span data-i18n="cat.updated"></span> ' + timeHtml(m.updatedAt) + "</span>");
            inline.push('<span data-bytes="' + e.sizeBytes + '"></span>');

            return '<article class="card-row' + (e.repeat ? " row-repeat" : "") + '">' +
                '<div class="c-icon">' + iconHtml(e, "") + "</div>" +
                '<div class="c-main">' +
                '<div class="c-name">' + nameCellHtml(e, "") + "</div>" +
                '<div class="c-by"><span>' + esc(e.author) + "</span>" + brandChipsHtml(e) + "</div>" +
                /* the full description, uncapped — the whole point of the roomy variant */
                '<div class="c-desc" data-ru="' + esc(e.descriptionRu) + '" data-en="' + esc(e.descriptionEn) + '"></div>' +
                '<div class="c-chiprow"><span class="lbl" data-i18n="cat.group.mode"></span><div class="chips">' + chipsHtml(modeChips) + "</div>" +
                '<span class="lbl" data-i18n="cat.group.scopes"></span><div class="chips">' + (scopeChips.length ? chipsHtml(scopeChips) : '<span class="dim small" data-i18n="cat.facts.noPermissions"></span>') + "</div>" +
                '<span class="lbl" data-i18n="cat.group.network"></span><div class="chips">' + chipsHtml(netChips) + "</div>" +
                '<span class="lbl" data-i18n="cat.group.tags"></span><div class="chips">' + e.tags.map(function (tg) { return '<span class="chip chip-mono">' + esc(tg) + "</span>"; }).join("") + "</div></div>" +
                '<div class="c-inline-meta">' + inline.join("") + likesHtml() + "</div>" +
                "</div>" +
                '<dl class="c-meta kv">' + meta + "</dl>" +
                '<div class="c-actions">' + actionsHtml(e) + likesHtml() + "</div>" +
                "</article>";
        }).join("") + "</div>";
    }

    /* --------------------------------------------------- variant 3: two-tier rows */
    function renderExpand(rows, ctx) {
        var head =
            '<div class="table-scroll"><table class="data cat-expand">' +
            '<caption class="sr-only" data-i18n="cat.tableCaption"></caption><thead><tr>' +
            '<th scope="col"><span class="sr-only" data-i18n="cat.row.expand"></span></th>' +
            '<th scope="col" data-i18n="cat.th.widget"></th>' +
            '<th scope="col" data-priority="3" data-i18n="cat.th.author"></th>' +
            '<th scope="col" data-i18n="cat.th.package"></th>' +
            '<th scope="col" class="num" data-i18n="cat.th.usage"></th>' +
            '<th scope="col" data-priority="2" data-i18n="cat.firstListed"></th>' +
            '<th scope="col" data-i18n="cat.th.actions"></th>' +
            "</tr></thead><tbody>";
        var body = rows.map(function (e) {
            var m = mock(e);
            var open = ctx.expanded[e.id] === true;
            var chips = chipsFor(e);
            var modeOnly = chips.filter(function (c) { return c.kind === "mode"; });
            var modeChip = chipsHtml(modeOnly) +
                (chips.length > modeOnly.length ? '<span class="chip chip-dashed" data-i18n="cat.chip.more" data-vars=\'{"n":' + (chips.length - modeOnly.length) + "}'></span>" : "");
            var counts = (typeof m.installs === "number")
                ? '<span class="ph cat-num" data-i18n-attr="title:cat.mock.placeholder">' + m.installs + " · " + m.active7d + "</span>"
                : '<span class="num-unknown" data-i18n="cat.unknown" data-i18n-attr="aria-label:cat.unknown.aria"></span>';

            var facts =
                '<dt data-i18n="cat.facts.mode"></dt><dd class="plain"><span class="chip chip-ok" data-i18n="cat.chip.bundled"></span></dd>' +
                '<dt data-i18n="cat.facts.version"></dt><dd>' + esc(e.version) + "</dd>" +
                '<dt data-i18n="cat.facts.size"></dt><dd data-bytes="' + e.sizeBytes + '"></dd>' +
                '<dt data-i18n="cat.facts.hash"></dt><dd class="wrap-any">' + esc(e.hash) + "</dd>" +
                '<dt data-i18n="cat.facts.surfaces"></dt><dd class="plain">' + e.surfaces.map(function (s) { return '<span data-i18n="cat.surface.' + s + '"></span>'; }).join(" · ") + "</dd>" +
                '<dt data-i18n="cat.facts.egress"></dt><dd class="plain">' + (e.egress.length ? e.egress.length : '<span data-i18n="cat.facts.noEgress"></span>') + "</dd>" +
                '<dt data-i18n="cat.facts.embeds"></dt><dd class="plain">' + (e.embeddedOrigins.length ? esc(e.embeddedOrigins.join(", ")) : '<span data-i18n="cat.facts.none"></span>') + "</dd>" +
                '<dt data-i18n="cat.facts.apiVersion"></dt><dd>' + e.minApiVersion + "</dd>" +
                (typeof m.installs === "number" ? '<dt data-i18n="cat.installs"></dt><dd class="ph">' + m.installs + "</dd>" : "") +
                (typeof m.active7d === "number" ? '<dt data-i18n="cat.active7d"></dt><dd class="ph">' + m.active7d + "</dd>" : "") +
                (typeof m.firstListedAt === "number" ? '<dt data-i18n="cat.firstListed"></dt><dd class="plain">' + timeHtml(m.firstListedAt) + "</dd>" : "") +
                (typeof m.updatedAt === "number" ? '<dt data-i18n="cat.updated"></dt><dd class="plain">' + timeHtml(m.updatedAt) + "</dd>" : "");

            return '<tr' + (e.repeat ? ' class="row-repeat"' : "") + ">" +
                '<td><button type="button" class="expander" data-expand="x-' + esc(e.id) + '" aria-expanded="' + (open ? "true" : "false") +
                '" data-i18n-attr="aria-label:cat.row.expand"><svg class="icon"><use href="#i-chevron-right" /></svg></button></td>' +
                '<td class="title-cell"><div class="e-title">' + iconHtml(e, "glyph") + nameCellHtml(e, "e-name") + "</div></td>" +
                '<td data-priority="3"><span class="dim">' + esc(e.author) + "</span> " + brandMarksHtml(e) + "</td>" +
                '<td><div class="chips">' + modeChip + "</div></td>" +
                '<td class="num">' + counts + likesHtml() + "</td>" +
                '<td data-priority="2">' + timeHtml(m.firstListedAt) + "</td>" +
                '<td class="actions-cell">' + actionsHtml(e) + "</td></tr>" +
                '<tr class="expand-row" id="x-' + esc(e.id) + '"' + (open ? "" : " hidden") + '><td colspan="7"><div class="expand-grid"><div>' +
                '<div class="x-desc" data-ru="' + esc(e.descriptionRu) + '" data-en="' + esc(e.descriptionEn) + '"></div>' +
                '<div class="x-group"><span class="lbl" data-i18n="cat.group.scopes"></span><div class="chips">' +
                (e.permissions.length ? chipsHtml(chips.filter(function (c) { return c.kind === "scope"; })) : '<span class="dim small" data-i18n="cat.facts.noPermissions"></span>') + "</div>" +
                '<span class="lbl" data-i18n="cat.group.tags"></span><div class="chips">' + e.tags.map(function (tg) { return '<span class="chip chip-mono">' + esc(tg) + "</span>"; }).join("") + "</div>" +
                '<span class="lbl" data-i18n="cat.group.network"></span><div>' +
                (e.egress.length ? '<ul class="hosts">' + e.egress.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") + "</ul>" : '<span class="chip chip-ok" data-i18n="cat.chip.noNetwork"></span>') +
                "</div></div>" + brandChipsHtml(e) +
                '</div><dl class="x-facts kv">' + facts + "</dl></div></td></tr>";
        }).join("");
        return head + body + "</tbody></table></div>";
    }

    /* -------------------------------------------------------------- sort + paging */
    function sortRows(rows, key) {
        var l = lang();
        var copy = rows.slice();
        if (key === "name") {
            copy.sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b), l); });
            return copy;
        }
        var field = key === "newest" ? "firstListedAt" : key === "updated" ? "updatedAt" : key === "installs" ? "installs" : "active7d";
        copy.sort(function (a, b) {
            var va = num(mock(a)[field]), vb = num(mock(b)[field]);
            /* unknown always sorts LAST — never re-read as a zero */
            if (va === null && vb === null) return 0;
            if (va === null) return 1;
            if (vb === null) return -1;
            return vb - va;
        });
        return copy;
    }

    /* the 28-row state repeats real rows, visibly marked, only to exercise the pager */
    function datasetFor(total) {
        if (total <= LISTINGS.length) return LISTINGS.slice();
        var out = LISTINGS.slice();
        var i = 0;
        while (out.length < total) {
            var src = LISTINGS[i % LISTINGS.length];
            var n = Math.floor(i / LISTINGS.length) + 1;
            var copy = Object.assign({}, src, { id: src.id + "--copy" + n, repeat: true, name: src.name + " " + window.NEST.t("cat.mock.copy", { n: n }) });
            MOCK[copy.id] = MOCK[src.id];
            out.push(copy);
            i++;
        }
        return out;
    }

    /* ------------------------------------------------------------------ the mount */
    var state = {
        variant: "dense",
        sort: "name",
        total: 10,
        page: 1,
        category: null,
        expanded: {},
        root: null
    };

    function activeRows() {
        var rows = datasetFor(state.total);
        if (state.category) rows = rows.filter(function (e) { return e.category === state.category; });
        return sortRows(rows, state.sort);
    }

    function renderRail(rows) {
        var el = document.getElementById("rail-list");
        if (!el) return;
        var all = datasetFor(state.total);
        var counts = {};
        all.forEach(function (e) { counts[e.category] = (counts[e.category] || 0) + 1; });
        var html = '<button type="button" class="rail-cat" data-cat="" aria-pressed="' + (state.category ? "false" : "true") +
            '"><span data-i18n="cat.all"></span><span class="count">' + all.length + "</span></button>";
        CATEGORY_ORDER.forEach(function (c) {
            if (!counts[c]) return;
            html += '<button type="button" class="rail-cat" data-cat="' + c + '" aria-pressed="' + (state.category === c ? "true" : "false") +
                '"><span data-i18n="cat.category.' + c + '"></span><span class="count">' + counts[c] + "</span></button>";
        });
        el.innerHTML = html;
        window.NEST.applyI18n(el);
    }

    function renderTags() {
        var el = document.getElementById("tag-list");
        if (!el) return;
        var seen = {};
        var tags = [];
        LISTINGS.forEach(function (e) { e.tags.forEach(function (tg) { if (!seen[tg]) { seen[tg] = 1; tags.push(tg); } }); });
        /* uploader tags render VERBATIM — user data, never localized */
        el.innerHTML = '<button type="button" class="rail-cat" aria-pressed="true"><span data-i18n="cat.all"></span></button>' +
            tags.map(function (tg) { return '<button type="button" class="rail-cat">' + esc(tg) + "</button>"; }).join("");
        window.NEST.applyI18n(el);
    }

    function renderPager(shown, total) {
        var el = document.getElementById("pager");
        if (!el) return;
        el.innerHTML = '<span data-i18n="cat.shown" data-vars=\'{"shown":' + shown + ',"total":' + total + "}'></span>" +
            (shown < total ? '<button type="button" class="btn btn-sm btn-link" id="show-more" data-i18n="cat.showMore"></button>' : "");
        window.NEST.applyI18n(el);
    }

    function render() {
        var rows = activeRows();
        var total = rows.length;
        var shown = Math.min(total, PAGE * state.page);
        var page = rows.slice(0, shown);
        var ctx = {
            narrow: document.documentElement.getAttribute("data-vw") === "1024",
            expanded: state.expanded
        };
        var html = state.variant === "cards" ? renderCards(page, ctx)
            : state.variant === "expand" ? renderExpand(page, ctx)
                : renderDense(page, ctx);
        state.root.innerHTML = html;
        window.NEST.applyI18n(state.root);
        renderRail(rows);
        renderPager(shown, total);
    }

    function setVw(vw) {
        document.documentElement.setAttribute("data-vw", vw);
        try { localStorage.setItem("nest.catalog.vw", vw); } catch (err) { /* file:// */ }
        document.querySelectorAll("[data-cat-vw]").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute("data-cat-vw") === vw));
        });
        var ruler = document.getElementById("vw-ruler-value");
        if (ruler) ruler.textContent = vw + " px";
        render(); /* the chip cap differs at 1024 */
    }

    function init(opts) {
        state.variant = opts.variant;
        var params = new URLSearchParams(location.search);
        var qsSort = params.get("sort");
        if (SORTS.indexOf(qsSort) >= 0) state.sort = qsSort;
        var qsRows = Number(params.get("rows"));
        if (qsRows === 10 || qsRows === 28) state.total = qsRows;
        if (params.get("likes") === "1") document.documentElement.setAttribute("data-likes", "1");
        /* variant 3 opens one row by default so the two tiers are visible without a click */
        if (state.variant === "expand") state.expanded["algoradar"] = params.get("expand") !== "none";
        if (params.get("expand") === "all") LISTINGS.forEach(function (e) { state.expanded[e.id] = true; });

        document.addEventListener("DOMContentLoaded", function () {
            state.root = document.getElementById("catalog");
            var vw = params.get("vw");
            if (vw !== "1024" && vw !== "1280") {
                try { vw = localStorage.getItem("nest.catalog.vw"); } catch (err) { vw = null; }
            }
            if (vw !== "1024") vw = "1280";
            renderTags();
            setVw(vw); /* renders */

            document.querySelectorAll("[data-cat-sort]").forEach(function (b) {
                b.setAttribute("aria-pressed", String(b.getAttribute("data-cat-sort") === state.sort));
            });

            document.body.addEventListener("click", function (ev) {
                var el = ev.target.closest("[data-cat-vw],[data-cat-rows],[data-cat-sort],[data-cat-likes],[data-cat-expand-all],[data-cat],#show-more");
                if (!el) {
                    /* keep variant 3's expansion across a later re-render */
                    var exp = ev.target.closest("[data-expand]");
                    if (exp) {
                        var id = exp.getAttribute("data-expand").replace(/^x-/, "");
                        state.expanded[id] = exp.getAttribute("aria-expanded") !== "true";
                    }
                    return;
                }
                if (el.hasAttribute("data-cat-vw")) return setVw(el.getAttribute("data-cat-vw"));
                if (el.hasAttribute("data-cat-rows")) {
                    state.total = Number(el.getAttribute("data-cat-rows"));
                    state.page = 1;
                    document.querySelectorAll("[data-cat-rows]").forEach(function (b) {
                        b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-cat-rows")) === state.total));
                    });
                    return render();
                }
                if (el.hasAttribute("data-cat-sort")) {
                    state.sort = el.getAttribute("data-cat-sort");
                    state.page = 1;
                    document.querySelectorAll("[data-cat-sort]").forEach(function (b) {
                        b.setAttribute("aria-pressed", String(b.getAttribute("data-cat-sort") === state.sort));
                    });
                    return render();
                }
                if (el.hasAttribute("data-cat-likes")) {
                    var on = document.documentElement.hasAttribute("data-likes");
                    if (on) document.documentElement.removeAttribute("data-likes");
                    else document.documentElement.setAttribute("data-likes", "1");
                    el.setAttribute("aria-pressed", String(!on));
                    return;
                }
                if (el.hasAttribute("data-cat-expand-all")) {
                    var openAll = el.getAttribute("aria-pressed") !== "true";
                    LISTINGS.forEach(function (e) { state.expanded[e.id] = openAll; });
                    el.setAttribute("aria-pressed", String(openAll));
                    return render();
                }
                if (el.hasAttribute("data-cat")) {
                    var c = el.getAttribute("data-cat");
                    state.category = c === "" ? null : c;
                    state.page = 1;
                    return render();
                }
                if (el.id === "show-more") {
                    state.page += 1;
                    return render();
                }
            });

            /* a language switch re-sorts by name and re-formats the wire data the kit does not own */
            document.querySelectorAll("[data-set-lang]").forEach(function (b) {
                b.addEventListener("click", function () { setTimeout(render, 0); });
            });
        });
    }

    window.NEST_CATALOG = { init: init, LISTINGS: LISTINGS, MOCK: MOCK, actionCluster: actionCluster, chipsFor: chipsFor };
})();
