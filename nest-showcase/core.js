/* The showcase mock's shared core: state, filtering, sorting and every fragment the five variants
   have in common — icon, badges, the action cluster, the trust summary, the numbers.

   Why one core for five pages: the reviewer is choosing a LAYOUT. If the install button, the
   partner badge or the "absent renders as nothing" rule were drawn five times, they would drift and
   the comparison would be about the drift. A variant file only arranges these fragments.

   Strings are rendered with NEST.t() and the window is re-rendered on a language switch, so a
   variant never has to declare data-i18n attributes. Loaded after kit/mockup.js and data.js. */
(function () {
    "use strict";

    var DATA = window.NEST_DATA;
    var LISTINGS = DATA.listings;
    var MOCK = DATA.mock;
    var DAY = 86400000;
    var PAGE = 25;
    var SORT_DEFAULT_DIR = { name: 1, newest: -1, updated: -1, installs: -1, active: -1 };

    /* ------------------------------------------------------------------ helpers */
    function T(k, v) {
        return window.NEST.t(k, v);
    }
    function lang() {
        return document.documentElement.lang === "en" ? "en" : "ru";
    }
    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    function byId(id) {
        for (var i = 0; i < LISTINGS.length; i++) if (LISTINGS[i].id === id) return LISTINGS[i];
        return null;
    }
    function mockOf(e) {
        return MOCK[e.id] || {};
    }
    function num(v) {
        return typeof v === "number" ? v : null;
    }

    /* the reader's language, falling back to the other; the fallback is flagged so CSS can mark it */
    function pickLang(ru, en) {
        var want = lang() === "en" ? en : ru;
        var other = lang() === "en" ? ru : en;
        if (want) return { text: want, fallback: false };
        if (other) return { text: other, fallback: true };
        return null;
    }
    function descOf(e) {
        return pickLang(e.descriptionRu, e.descriptionEn);
    }
    function notesOf(e) {
        return pickLang(e.releaseNotesRu, e.releaseNotesEn);
    }
    function descHtml(e, cls) {
        var d = descOf(e);
        if (!d) return "";
        return '<p class="' + (cls || "desc") + (d.fallback ? " is-fallback" : "") + '">' + esc(d.text) + "</p>";
    }

    /* ------------------------------------------------------------- derived facts */
    function isNew(e) {
        return typeof e.firstListedAtMs === "number" && DATA.now - e.firstListedAtMs < DATA.newWindowDays * DAY;
    }
    /* «Обновлён»: a NEW version went live within the window. NEW and «Обновлён» never show together. */
    function isUpdated(e) {
        return (
            !isNew(e) &&
            typeof e.listedAtMs === "number" &&
            e.listedAtMs !== e.firstListedAtMs &&
            DATA.now - e.listedAtMs < DATA.newWindowDays * DAY
        );
    }
    function keepShare(e) {
        if (!num(e.installs) || num(e.activeInstalls) === null) return null;
        return Math.round((e.activeInstalls / e.installs) * 100);
    }
    function hostOf(origin) {
        try {
            return new URL(origin).host;
        } catch (err) {
            return origin;
        }
    }
    function windowCapable(e) {
        return (e.surfaces || []).indexOf("window") >= 0;
    }

    /* ---------------------------------------------------------------- formatting */
    function fmtNum(n) {
        return typeof n === "number" ? new Intl.NumberFormat(lang()).format(n) : "";
    }
    function pad(n) {
        return (n < 10 ? "0" : "") + n;
    }
    /* the terminal's date format, dd.MM.yyyy, in both languages */
    function fmtDate(ms) {
        if (typeof ms !== "number") return "";
        var d = new Date(ms);
        return pad(d.getUTCDate()) + "." + pad(d.getUTCMonth() + 1) + "." + d.getUTCFullYear();
    }
    function fmtShortDate(ms) {
        if (typeof ms !== "number") return "";
        return new Intl.DateTimeFormat(lang(), { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(ms));
    }
    function fmtRel(ms) {
        if (typeof ms !== "number") return "";
        var days = Math.floor((DATA.now - ms) / DAY);
        var rtf = new Intl.RelativeTimeFormat(lang(), { numeric: "auto" });
        if (days <= 0) return T("rel.today");
        if (days < 31) return rtf.format(-days, "day");
        return rtf.format(-Math.round(days / 30), "month");
    }
    /* for a number-sized slot: «сегодня», «вчера», «10 дн. назад» */
    function fmtRelShort(ms) {
        if (typeof ms !== "number") return "";
        var days = Math.floor((DATA.now - ms) / DAY);
        if (days <= 0) return T("rel.today");
        if (days === 1) return T("rel.yesterday");
        return T("rel.days", { n: days });
    }
    function fmtBytes(n) {
        if (typeof n !== "number") return "";
        var units = [T("unit.b"), T("unit.kb"), T("unit.mb")];
        var i = 0;
        var v = n;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        return new Intl.NumberFormat(lang(), { maximumFractionDigits: i === 0 ? 0 : 1 }).format(v) + " " + units[i];
    }
    function countWidgets(n) {
        return T("count.widgets", { n: n });
    }

    /* ------------------------------------------------------------------- colours */
    function hashHue(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return h % 360;
    }
    /* the icon's own colour (computed offline), or a stable hue from the id for an icon-less listing */
    function tintOf(e) {
        return e.tint || "hsl(" + hashHue(e.id) + " 38% 46%)";
    }

    /* -------------------------------------------------------------- the sprite
       Icons the kit does not carry. Paths from Lucide (ISC licence), inlined so nothing is
       fetched. Injected beside the kit's own sprite. */
    var SPRITE =
        '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">' +
        '<symbol id="x-handshake" viewBox="0 0 24 24"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></symbol>' +
        '<symbol id="x-download" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></symbol>' +
        '<symbol id="x-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>' +
        '<symbol id="x-activity" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></symbol>' +
        '<symbol id="x-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></symbol>' +
        '<symbol id="x-chevron-left" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></symbol>' +
        '<symbol id="x-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>' +
        '<symbol id="x-play" viewBox="0 0 24 24"><path d="M6 3 20 12 6 21Z"/></symbol>' +
        '<symbol id="x-sparkles" viewBox="0 0 24 24"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v4"/><path d="M21 5h-4"/></symbol>' +
        '<symbol id="x-more" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></symbol>' +
        '<symbol id="x-tag" viewBox="0 0 24 24"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/></symbol>' +
        '<symbol id="x-sort" viewBox="0 0 24 24"><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></symbol>' +
        '<symbol id="x-trophy" viewBox="0 0 24 24"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></symbol>' +
        '<symbol id="x-megaphone" viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></symbol>' +
        '<symbol id="x-home" viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></symbol>' +
        '<symbol id="x-layers" viewBox="0 0 24 24"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></symbol>' +
        '<symbol id="x-bell" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></symbol>' +
        '<symbol id="x-chart" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></symbol>' +
        '<symbol id="x-candles" viewBox="0 0 24 24"><path d="M9 5v4"/><rect width="4" height="6" x="7" y="9" rx="1"/><path d="M9 15v2"/><path d="M17 3v2"/><rect width="4" height="8" x="15" y="5" rx="1"/><path d="M17 13v3"/><path d="M3 3v18h18"/></symbol>' +
        '<symbol id="x-microscope" viewBox="0 0 24 24"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></symbol>' +
        '<symbol id="x-swap" viewBox="0 0 24 24"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></symbol>' +
        '<symbol id="x-briefcase" viewBox="0 0 24 24"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></symbol>' +
        '<symbol id="x-zap" viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></symbol>' +
        '<symbol id="x-window" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/></symbol>' +
        "</svg>";

    var CAT_ICON = {
        alerts: "x-bell",
        analytics: "x-chart",
        "market-data": "x-candles",
        research: "x-microscope",
        trading: "x-swap",
        portfolio: "x-briefcase",
        productivity: "x-zap",
        other: "i-puzzle"
    };
    function svg(id, cls) {
        return '<svg class="icon' + (cls ? " " + cls : "") + '"><use href="#' + id + '"/></svg>';
    }
    function catIcon(key) {
        return svg(CAT_ICON[key] || "i-puzzle");
    }

    /* ------------------------------------------------------------------ fragments */

    /* the listing icon; an icon-less listing gets a monogram tile in its own stable colour */
    function iconHtml(e, size, extra) {
        var style = ' style="--sz:' + size + "px;--tint:" + tintOf(e) + '"';
        var cls = "wi" + (extra ? " " + extra : "");
        if (e.icon) return '<span class="' + cls + '"' + style + '><img src="' + esc(e.icon) + '" alt="" /></span>';
        var letter = (e.name || e.id).trim().charAt(0).toUpperCase();
        return '<span class="' + cls + ' wi-mono"' + style + ' aria-hidden="true">' + esc(letter) + "</span>";
    }

    function partnerBadge(big) {
        return (
            '<span class="badge badge-partner' + (big ? " big" : "") + '" title="' + esc(T("badge.partner.title")) + '">' +
            svg("x-handshake") +
            "<span>" + esc(big ? T("partners.ribbon") : T("badge.partner")) + "</span></span>"
        );
    }
    /* order: deprecated · partner · NEW · «Обновлён», as the terminal draws them */
    function badgesHtml(e, opts) {
        opts = opts || {};
        var out = "";
        if (e.firstParty) out += '<span class="badge badge-verified">' + esc(T("badge.verified")) + "</span>";
        if (e.partner && !opts.noPartner) out += partnerBadge(false);
        if (isNew(e)) out += '<span class="badge badge-new" title="' + esc(T("badge.new.title", { n: DATA.newWindowDays })) + '">' + esc(T("badge.new")) + "</span>";
        else if (isUpdated(e) && !opts.noUpdated) out += '<span class="badge badge-updated" title="' + esc(T("badge.updated.title", { n: DATA.newWindowDays })) + '">' + esc(T("badge.updated")) + "</span>";
        return out;
    }

    /* the author is a filter, as in the terminal; the channels are bare marks with the URL as title */
    function authorHtml(e, opts) {
        opts = opts || {};
        if (!e.author) return "";
        var html =
            '<button type="button" class="author-link" data-author="' + esc(e.author) + '" title="' + esc(T("author.filter")) + '">' +
            esc(e.author) +
            "</button>";
        if (opts.channels !== false) html += channelsHtml(e);
        return html;
    }
    function channelsHtml(e, big) {
        var out = "";
        if (e.authorYoutubeUrl)
            out +=
                '<a class="chan' + (big ? " big" : "") + '" href="' + esc(e.authorYoutubeUrl) + '" title="' + esc(e.authorYoutubeUrl) + '" target="_blank" rel="noreferrer">' +
                '<img class="yt on-dark" src="kit/assets/brands/youtube-on-dark.png" alt="YouTube" />' +
                '<img class="yt on-light" src="kit/assets/brands/youtube-on-light.png" alt="YouTube" /></a>';
        if (e.authorTelegramUrl)
            out +=
                '<a class="chan' + (big ? " big" : "") + '" href="' + esc(e.authorTelegramUrl) + '" title="' + esc(e.authorTelegramUrl) + '" target="_blank" rel="noreferrer">' +
                '<img class="tg" src="kit/assets/brands/telegram.svg" alt="Telegram" />' +
                (big ? "<span>Telegram</span>" : "") +
                "</a>";
        return out;
    }

    function catLabel(key) {
        var k = "cat." + key;
        var v = T(k);
        return v.indexOf("⟦") === 0 ? key : v;
    }

    /* ---------------------------------------------------------- the action cluster
       The terminal's rules, in ONE place:
         · the orange button fetches bytes (Установить / ↑ Обновить) and shows whenever the widget
           is not simply installed;
         · the green «Открыть в окне» shows for an installed window-capable widget, in any state;
           a compact layout moves it into ⋯ while an update is pending, so a row keeps one button;
         · an installed slot-only widget has nothing to open: a green check and «только в панели»;
         · so a row carries at most ONE green element. */
    function stateOf(e) {
        var m = mockOf(e);
        if (m.needsColibri) return "blocked";
        if (m.update) return "update";
        if (m.installed) return "installed";
        return "none";
    }
    function menuHtml(e, withOpen) {
        return (
            '<details class="menu act-menu"><summary class="btn btn-sm btn-icon" title="' + esc(T("act.more")) + '" aria-label="' + esc(T("act.more")) + '">' +
            svg("x-more") +
            '</summary><div class="menu-list">' +
            (withOpen ? '<button type="button" data-act="open" data-id="' + esc(e.id) + '">' + svg("x-window") + esc(T("act.open")) + "</button><hr />" : "") +
            '<label class="flag"><input type="checkbox" checked /><span>' + esc(T("menu.notifications")) + "</span></label>" +
            (windowCapable(e) ? '<label class="flag"><input type="checkbox" /><span>' + esc(T("menu.pin")) + "</span></label>" : "") +
            '<button type="button" data-act="menu">' + esc(T("menu.proxy")) + "</button><hr />" +
            '<button type="button" data-act="menu">' + esc(T("menu.revoke")) + "</button>" +
            '<button type="button" class="danger" data-act="menu">' + esc(T("menu.uninstall")) + "</button>" +
            "</div></details>"
        );
    }
    /* the ⋯ alone, for a layout that parks it apart from the button (installed widgets only) */
    function menuFor(e) {
        var st = stateOf(e);
        return st === "installed" || st === "update" ? menuHtml(e, st === "update" && windowCapable(e)) : "";
    }
    /* opts.size: "sm" | "md" | "lg"; opts.compact: one button only; opts.menu: false drops ⋯ */
    function actionsHtml(e, opts) {
        opts = opts || {};
        var size = opts.size === "lg" ? " btn-lg" : opts.size === "md" ? "" : " btn-sm";
        var st = stateOf(e);
        var id = esc(e.id);
        var win = windowCapable(e);
        var html = "";
        var withMenu = opts.menu !== false && (st === "installed" || st === "update");
        if (st === "none") html += '<button type="button" class="btn btn-primary' + size + '" data-act="install" data-id="' + id + '">' + esc(T("act.install")) + "</button>";
        else if (st === "blocked") {
            html +=
                '<span class="act-note warn">' + esc(T("act.needs", { v: mockOf(e).needsColibri })) + "</span>" +
                '<button type="button" class="btn' + size + '" disabled title="' + esc(T("act.needs", { v: mockOf(e).needsColibri })) + '">' + esc(T("act.install")) + "</button>";
        } else if (st === "update") {
            html += '<button type="button" class="btn btn-primary' + size + '" data-act="update" data-id="' + id + '">' + esc(T("act.update")) + "</button>";
            if (win && !opts.compact) html += '<button type="button" class="btn btn-open' + size + '" data-act="open" data-id="' + id + '">' + esc(T("act.open")) + "</button>";
        } else if (st === "installed") {
            if (win) html += '<button type="button" class="btn btn-open' + size + '" data-act="open" data-id="' + id + '">' + esc(T("act.open")) + "</button>";
            else html += '<span class="act-installed">' + svg("i-check") + "<span>" + esc(T("act.installed")) + '</span><span class="dim">· ' + esc(T("act.slotOnly")) + "</span></span>";
        }
        if (withMenu) html += menuHtml(e, st === "update" && win && opts.compact);
        var invented = st !== "none";
        return '<div class="acts' + (invented ? " ph-state" : "") + '"' + (invented ? ' title="' + esc(T("mock.invented")) + '"' : "") + ">" + html + "</div>";
    }

    /* «Что нового в {v}:» replaces the description while an update is pending and notes exist */
    function updateNotesHtml(e, cls) {
        if (stateOf(e) !== "update") return "";
        var n = notesOf(e);
        if (!n) return "";
        return '<p class="' + (cls || "notes-line") + '"><b>' + esc(T("notes.lead", { v: e.version })) + "</b> " + esc(n.text) + "</p>";
    }

    /* ------------------------------------------------------------- trust facts */
    function packageFact(e) {
        var emb = e.embeddedOrigins || [];
        if (e.mode !== "bundled") return { cls: "warn", chip: T("chip.hosted"), tip: T("trust.package.hosted") };
        if (emb.length) return { cls: "warn", chip: T("chip.embeds", { host: hostOf(emb[0]) }), tip: T("trust.package.embeds", { host: hostOf(emb[0]) }) };
        return { cls: "ok", chip: T("chip.bundled"), tip: T("trust.package.bundled") };
    }
    function scopeCls(p) {
        return p === "trading" ? "danger" : p === "account:read" ? "warn" : "";
    }
    function scopesCls(e) {
        var p = e.permissions || [];
        return p.indexOf("trading") >= 0 ? "danger" : p.indexOf("account:read") >= 0 ? "warn" : "";
    }
    function scopesTip(e) {
        var p = e.permissions || [];
        if (!p.length) return T("trust.scopes.none");
        return T("trust.scopes.n", { n: p.length }) + "\n" + p.map(function (s) { return "· " + T("scope." + s); }).join("\n");
    }
    function netTip(e) {
        var g = e.egress || [];
        if (!g.length) return T("trust.network.none");
        return T("trust.network.n", { n: g.length }) + "\n" + g.slice(0, 12).join("\n") + (g.length > 12 ? "\n" + T("net.more", { n: g.length - 12 }) : "");
    }
    /* three icon-sized facts — package, network, permissions — each with the detail in its title */
    function trustIconsHtml(e, opts) {
        opts = opts || {};
        var pk = packageFact(e);
        var g = e.egress || [];
        var p = e.permissions || [];
        return (
            '<span class="trust' + (opts.labels ? " with-labels" : "") + '">' +
            '<span class="tf ' + pk.cls + '" title="' + esc(pk.tip) + '">' + svg("i-package") + (opts.labels ? "<span>" + esc(pk.chip) + "</span>" : pk.cls === "ok" ? svg("i-check", "tf-check") : "<span>" + (e.mode !== "bundled" ? "hosted" : "embeds") + "</span>") + "</span>" +
            '<span class="tf ' + (g.length ? "" : "ok") + '" title="' + esc(netTip(e)) + '">' + svg("i-globe") + "<span>" + (g.length ? g.length : esc(T("chip.noNetwork"))) + "</span></span>" +
            '<span class="tf ' + scopesCls(e) + '" title="' + esc(scopesTip(e)) + '">' + svg("x-key") + "<span>" + (opts.labels && !p.length ? esc(T("chip.none")) : p.length) + "</span></span>" +
            "</span>"
        );
    }
    /* the terminal's labelled chip groups, for the roomy places (inspector, expanded row) */
    function chipGroupsHtml(e, opts) {
        opts = opts || {};
        var pk = packageFact(e);
        var p = e.permissions || [];
        var g = e.egress || [];
        var tags = e.tags || [];
        var row = function (label, body) {
            return '<div class="cg-row"><span class="cg-label">' + esc(label) + '</span><div class="chips">' + body + "</div></div>";
        };
        var html = row(T("grp.package"), '<span class="chip chip-' + pk.cls + '" title="' + esc(pk.tip) + '">' + esc(pk.chip) + "</span>");
        html += row(
            T("grp.scopes"),
            p.length
                ? p.map(function (s) { return '<span class="chip' + (scopeCls(s) ? " chip-" + scopeCls(s) : "") + '" title="' + esc(T("scope." + s)) + '">' + esc(opts.longScopes ? T("scope." + s) : T("scopeShort." + s)) + "</span>"; }).join("")
                : '<span class="dim small">' + esc(T("chip.none")) + "</span>"
        );
        html += row(T("grp.network"), g.length ? '<span class="chip" title="' + esc(netTip(e)) + '">' + esc(T("chip.network", { n: g.length })) + "</span>" : '<span class="chip chip-ok">' + esc(T("chip.noNetwork")) + "</span>");
        if (tags.length && opts.tags !== false) html += row(T("grp.tags"), tags.map(function (t) { return '<button type="button" class="chip chip-tag" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join(""));
        return '<div class="cg">' + html + "</div>";
    }
    function tagChipsHtml(e, max) {
        var tags = e.tags || [];
        var shown = max ? tags.slice(0, max) : tags;
        var html = shown.map(function (t) { return '<button type="button" class="chip chip-tag" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("");
        if (max && tags.length > max) html += '<span class="chip chip-dashed" title="' + esc(tags.slice(max).join(", ")) + '">+' + (tags.length - max) + "</span>";
        return html;
    }
    function hostsHtml(e, max) {
        var g = e.egress || [];
        if (!g.length) return '<span class="chip chip-ok">' + esc(T("chip.noNetwork")) + "</span>";
        var shown = g.slice(0, max || g.length);
        return (
            '<ul class="host-list">' +
            shown.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("") +
            (g.length > shown.length ? '<li class="more" title="' + esc(g.slice(shown.length).join("\n")) + '">' + esc(T("net.more", { n: g.length - shown.length })) + "</li>" : "") +
            "</ul>"
        );
    }

    /* ---------------------------------------------------------------- numbers
       Absent renders as NOTHING — never a zero, never "today". */
    function statInline(e, which) {
        var out = [];
        (which || ["installs", "week"]).forEach(function (w) {
            if (w === "installs" && num(e.installs) !== null) out.push('<span class="si" title="' + esc(T("stat.installs")) + '">' + svg("x-download") + fmtNum(e.installs) + "</span>");
            if (w === "active" && num(e.activeInstalls) !== null) out.push('<span class="si" title="' + esc(T("stat.active")) + '">' + svg("x-users") + fmtNum(e.activeInstalls) + "</span>");
            if (w === "week" && num(e.activeUsers7d) !== null) out.push('<span class="si" title="' + esc(T("stat.week")) + '">' + svg("x-activity") + fmtNum(e.activeUsers7d) + '<span class="u"> ' + esc(T("stat.week.short")) + "</span></span>");
            if (w === "updated" && num(e.updatedAtMs) !== null) out.push('<span class="si" title="' + esc(T("stat.updated") + " " + fmtDate(e.updatedAtMs)) + '">' + svg("i-refresh") + esc(fmtRel(e.updatedAtMs)) + "</span>");
        });
        return out.join("");
    }
    function maxOf(field) {
        var m = 0;
        LISTINGS.forEach(function (e) { if (num(e[field]) !== null && e[field] > m) m = e[field]; });
        return m || 1;
    }
    function barHtml(e, field, cls) {
        var v = num(e[field]);
        if (v === null) return "";
        return '<span class="bar' + (cls ? " " + cls : "") + '"><i style="width:' + Math.max(3, Math.round((v / maxOf(field)) * 100)) + '%"></i></span>';
    }

    /* the poster: the partner's banner. A cover when the author uploaded one (none has yet), else
       the icon's own colour in a gradient with the icon large. Never empty. */
    function posterHtml(e, opts) {
        opts = opts || {};
        return (
            '<div class="poster' + (opts.cls ? " " + opts.cls : "") + '" style="--tint:' + tintOf(e) + '">' +
            '<span class="poster-glow"></span>' +
            iconHtml(e, opts.icon || 64, "poster-icon") +
            (opts.name ? '<span class="poster-name">' + esc(e.name) + "</span>" : "") +
            (opts.coverNote ? '<span class="poster-note ph">' + esc(T("cover.placeholder")) + "</span>" : "") +
            "</div>"
        );
    }

    /* --------------------------------------------------------- the announcement
       The feed is empty today: one neutral placeholder tied to a partner widget. */
    function announcement() {
        var a = DATA.announcement;
        if (!a) return null;
        var e = byId(a.widgetId);
        return e ? { a: a, e: e } : null;
    }
    function announcementHtml(opts) {
        opts = opts || {};
        var x = announcement();
        if (!x) return "";
        var e = x.e;
        return (
            '<article class="ann ph-block' + (opts.cls ? " " + opts.cls : "") + '" title="' + esc(T("mock.invented")) + '" style="--tint:' + tintOf(e) + '">' +
            '<div class="ann-pic"><span class="ann-pic-inner">' + iconHtml(e, 44) + "<span>" + esc(T("ann.image")) + "</span></span></div>" +
            '<div class="ann-body">' +
            '<div class="ann-kicker">' + svg("x-megaphone") + "<span>" + esc(T("ann.label")) + '</span><span class="dim">· ' + esc(fmtShortDate(x.a.publishedAtMs)) + " · " + esc(T("ann.until", { date: fmtShortDate(x.a.endsAtMs) })) + "</span></div>" +
            '<h3 class="ann-title">' + esc(T("ann.title")) + "</h3>" +
            '<p class="ann-text">' + esc(T("ann.text")) + "</p>" +
            '<div class="ann-foot">' +
            '<button type="button" class="ann-widget" data-act="page" data-id="' + esc(e.id) + '">' + iconHtml(e, 20) + "<b>" + esc(e.name) + '</b><span class="dim">· ' + esc(e.author) + "</span></button>" +
            (x.a.hasLink ? '<button type="button" class="btn btn-sm btn-stream" data-act="stream">' + svg("x-play") + esc(T("ann.stream")) + "</button>" : "") +
            "</div></div></article>"
        );
    }

    /* ------------------------------------------------------------------ state */
    var params = new URLSearchParams(location.search);
    var S = {
        section: "all",
        q: "",
        tag: null,
        author: null,
        sort: { key: "newest", dir: -1 },
        page: 1,
        selected: null,
        expanded: {},
        pinPartners: true,
        vw: "1000",
        vh: "720"
    };
    var V = null; /* the registered variant */
    var app = null;

    function sectionCounts() {
        var c = { all: LISTINGS.length, new: 0, partners: 0, cats: {} };
        LISTINGS.forEach(function (e) {
            if (isNew(e)) c.new++;
            if (e.partner) c.partners++;
            if (e.category) c.cats[e.category] = (c.cats[e.category] || 0) + 1;
        });
        return c;
    }
    function categoriesPresent() {
        var c = sectionCounts().cats;
        return DATA.categories.filter(function (k) { return c[k]; }).concat(Object.keys(c).filter(function (k) { return DATA.categories.indexOf(k) < 0; }));
    }

    function matches(e) {
        if (S.q) {
            var q = S.q.toLowerCase();
            var d = descOf(e);
            if ((e.name || "").toLowerCase().indexOf(q) < 0 && e.id.indexOf(q) < 0 && (!d || d.text.toLowerCase().indexOf(q) < 0)) return false;
        }
        if (S.tag && (e.tags || []).indexOf(S.tag) < 0) return false;
        if (S.author && (e.author || "").toLowerCase() !== S.author.toLowerCase()) return false;
        return true;
    }
    function inSection(e, sec) {
        if (sec === "new") return isNew(e);
        if (sec === "partners") return !!e.partner;
        if (sec.indexOf("cat:") === 0) return e.category === sec.slice(4);
        return true;
    }
    var SORT_FIELD = { newest: "firstListedAtMs", updated: "updatedAtMs", installs: "installs", active: "activeUsers7d" };
    function sortRows(rows, sort) {
        sort = sort || S.sort;
        var copy = rows.slice();
        copy.sort(function (a, b) {
            if (!!a.deprecated !== !!b.deprecated) return a.deprecated ? 1 : -1;
            if (sort.key !== "name") {
                var f = SORT_FIELD[sort.key];
                var va = num(a[f]),
                    vb = num(b[f]);
                /* unknown sorts LAST in both directions — never re-read as a zero */
                if (va === null && vb !== null) return 1;
                if (vb === null && va !== null) return -1;
                if (va !== null && vb !== null && va !== vb) return (va - vb) * sort.dir;
            } else {
                var c = a.name.localeCompare(b.name, lang()) * sort.dir;
                if (c) return c;
            }
            return a.name.localeCompare(b.name, lang()) || a.id.localeCompare(b.id);
        });
        return copy;
    }
    function filtered(sec) {
        return sortRows(LISTINGS.filter(function (e) { return inSection(e, sec || S.section) && matches(e); }));
    }
    function anyFilter() {
        return !!(S.q || S.tag || S.author);
    }
    function allTags() {
        var seen = {};
        var out = [];
        LISTINGS.forEach(function (e) { (e.tags || []).forEach(function (t) { if (!seen[t]) { seen[t] = 1; out.push(t); } }); });
        return out.sort(function (a, b) { return a.localeCompare(b, lang()); });
    }

    /* ------------------------------------------------------------- toolbar bits */
    function searchHtml(cls) {
        return (
            '<label class="search' + (cls ? " " + cls : "") + '">' + svg("i-search") +
            '<input id="q" class="input" type="search" autocomplete="off" placeholder="' + esc(T("search.placeholder")) + '" value="' + esc(S.q) + '" /></label>'
        );
    }
    function authorChipHtml() {
        if (!S.author) return "";
        return (
            '<span class="author-chip">' + svg("i-user") + "<span>" + esc(T("author.chip", { name: S.author })) + "</span>" +
            '<button type="button" data-clear-author title="' + esc(T("author.clear")) + '" aria-label="' + esc(T("author.clear")) + '">' + svg("i-x") + "</button></span>"
        );
    }
    function tagMenuHtml(iconOnly) {
        var tags = allTags();
        return (
            '<details class="menu tag-menu"><summary class="btn btn-sm' + (S.tag ? " is-on" : "") + '" title="' + esc(T("tags.button")) + '">' + svg("x-tag") +
            (iconOnly ? "" : "<span>" + esc(S.tag || T("tags.button")) + "</span>") +
            (S.tag ? '<span class="dot-on"></span>' : "") +
            '</summary><div class="menu-list tag-list">' +
            '<input class="input input-sm" type="search" data-tag-filter placeholder="' + esc(T("tags.filter")) + '" />' +
            '<div class="tag-scroll"><button type="button" data-tag="" aria-pressed="' + (!S.tag) + '">' + esc(T("tags.all")) + "</button>" +
            tags.map(function (t) { return '<button type="button" data-tag="' + esc(t) + '" aria-pressed="' + (S.tag === t) + '">' + esc(t) + "</button>"; }).join("") +
            "</div></div></details>"
        );
    }
    function sortMenuHtml(keys) {
        keys = keys || ["name", "newest", "updated", "installs", "active"];
        var arrow = S.sort.dir > 0 ? " ↑" : " ↓";
        return (
            '<details class="menu sort-menu"><summary class="btn btn-sm">' + svg("x-sort") + "<span>" + esc(T("sort.label", { label: T("sort." + S.sort.key) })) + arrow + "</span></summary>" +
            '<div class="menu-list">' +
            keys.map(function (k) {
                var on = S.sort.key === k;
                return '<button type="button" data-sort="' + k + '" aria-pressed="' + on + '"' + (on ? ' title="' + esc(T("sort.again")) + '"' : "") + ">" + esc(T("sort." + k)) + (on ? '<span class="dim">' + arrow + "</span>" : "") + "</button>";
            }).join("") +
            "</div></details>"
        );
    }
    function pagerHtml(shown, total) {
        return '<div class="pager-line"><span>' + esc(T("pager.shown", { shown: shown, total: total })) + "</span>" + (shown < total ? '<button type="button" class="btn btn-sm btn-link" data-more>' + esc(T("pager.more")) + "</button>" : "") + "</div>";
    }
    function emptyHtml() {
        return '<div class="empty">' + svg("i-search", "lg") + "<b>" + esc(T("empty.title")) + "</b><span>" + esc(T("empty.body")) + '</span><button type="button" class="btn btn-sm" data-reset>' + esc(T("empty.reset")) + "</button></div>";
    }
    function page(rows) {
        var shown = Math.min(rows.length, PAGE * S.page);
        return { rows: rows.slice(0, shown), shown: shown, total: rows.length };
    }

    /* the rail the terminal ships: «Новые», «Партнёры», «Все», then categories, counts on the right */
    function railHtml(opts) {
        opts = opts || {};
        var c = sectionCounts();
        var item = function (sec, icon, label, count, cls) {
            return (
                '<button type="button" class="rail-item' + (cls ? " " + cls : "") + '" data-sec="' + sec + '" aria-pressed="' + (S.section === sec) + '">' +
                svg(icon) + '<span class="rl">' + esc(label) + '</span><span class="rc">' + count + "</span></button>"
            );
        };
        var html = "";
        if (opts.home) html += item("home", "x-home", T("sec.home"), "", "rail-home");
        html += item("new", "x-sparkles", T("sec.new"), c.new, "rail-new");
        html += item("partners", "x-handshake", T("sec.partners"), c.partners, "rail-partners");
        html += item("all", "x-layers", T("sec.all"), c.all, "");
        html += '<div class="rail-sep">' + esc(T("sec.categories")) + "</div>";
        categoriesPresent().forEach(function (k) {
            html += item("cat:" + k, CAT_ICON[k] || "i-puzzle", catLabel(k), c.cats[k], "");
        });
        return '<nav class="rail">' + html + "</nav>";
    }
    /* the same sections as one row of pills */
    function sectionPillsHtml(opts) {
        opts = opts || {};
        var c = sectionCounts();
        var pill = function (sec, icon, label, count, cls) {
            return (
                '<button type="button" class="pill' + (cls ? " " + cls : "") + '" data-sec="' + sec + '" aria-pressed="' + (S.section === sec) + '">' +
                (icon ? svg(icon) : "") + "<span>" + esc(label) + "</span>" + (count !== "" ? '<span class="pc">' + count + "</span>" : "") + "</button>"
            );
        };
        var html = "";
        if (opts.home) html += pill("home", "x-home", T("sec.home"), "", "");
        html += pill("new", "x-sparkles", T("sec.new"), c.new, "pill-new");
        html += pill("partners", "x-handshake", T("sec.partners"), c.partners, "pill-partners");
        html += pill("all", "", T("sec.all"), c.all, "");
        if (opts.categories !== false) {
            html += '<span class="pill-sep"></span>';
            categoriesPresent().forEach(function (k) { html += pill("cat:" + k, CAT_ICON[k], catLabel(k), c.cats[k], "pill-cat"); });
        }
        return '<div class="pills">' + html + "</div>";
    }
    function categoryMenuHtml() {
        var c = sectionCounts();
        var cur = S.section.indexOf("cat:") === 0 ? S.section.slice(4) : null;
        return (
            '<details class="menu cat-menu"><summary class="btn btn-sm' + (cur ? " is-on" : "") + '">' + (cur ? catIcon(cur) : svg("x-layers")) + "<span>" + esc(cur ? catLabel(cur) : T("sec.category")) + '</span><span aria-hidden="true">▾</span></summary>' +
            '<div class="menu-list"><button type="button" data-sec="all" aria-pressed="' + !cur + '">' + esc(T("sec.anyCategory")) + "</button>" +
            categoriesPresent().map(function (k) { return '<button type="button" data-sec="cat:' + k + '" aria-pressed="' + (cur === k) + '">' + catIcon(k) + "<span>" + esc(catLabel(k)) + '</span><span class="dim mlauto">' + c.cats[k] + "</span></button>"; }).join("") +
            "</div></details>"
        );
    }

    /* ------------------------------------------------------------------- render */
    function chrome(inner) {
        return (
            '<div class="win-title"><span class="win-name">' + svg("i-puzzle") + esc(T("win.title")) + '</span><span class="win-caps" aria-hidden="true"><span>—</span><span>▢</span><span>✕</span></span></div>' +
            '<nav class="win-tabs"><button type="button" aria-current="page">' + esc(T("tab.catalog")) + "</button><button type=\"button\">" + esc(T("tab.myWidgets")) + "</button><button type=\"button\">" + esc(T("tab.author")) + "</button><button type=\"button\">" + esc(T("tab.settings")) + "</button></nav>" +
            '<div class="win-body v-' + V.id + '">' + inner + "</div>"
        );
    }
    function ctx() {
        var view = S.section === "home" ? (anyFilter() ? "list" : "home") : S.section === "partners" ? "partners" : "list";
        var rows = filtered(S.section === "home" ? "all" : S.section);
        return { view: view, rows: rows, page: page(rows), counts: sectionCounts(), narrow: S.vw === "780", wide: S.vw === "1280" };
    }
    function render(keepScroll) {
        if (!app || !V) return;
        var scrolls = {};
        if (keepScroll) app.querySelectorAll("[data-scroll]").forEach(function (el) { scrolls[el.getAttribute("data-scroll")] = el.scrollTop; });
        var focusQ = document.activeElement && document.activeElement.id === "q";
        var caret = focusQ ? document.activeElement.selectionStart : 0;
        app.innerHTML = chrome(V.render(ctx(), S));
        if (keepScroll) app.querySelectorAll("[data-scroll]").forEach(function (el) { var v = scrolls[el.getAttribute("data-scroll")]; if (v) el.scrollTop = v; });
        if (focusQ) {
            var q = document.getElementById("q");
            if (q) {
                q.focus();
                q.setSelectionRange(caret, caret);
            }
        }
        if (V.after) V.after(app, S);
        syncMockBar();
    }

    function syncMockBar() {
        document.querySelectorAll("[data-vw]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-vw") === S.vw)); });
        document.querySelectorAll("[data-vh]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-vh") === S.vh)); });
        document.querySelectorAll("[data-jump]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-jump") === S.section)); });
        var r = document.getElementById("vw-ruler-value");
        if (r) r.textContent = S.vw + " × " + S.vh;
        if (app) {
            app.style.setProperty("--ww", S.vw + "px");
            app.style.setProperty("--wh", S.vh + "px");
        }
    }

    function setSection(sec) {
        S.section = sec;
        S.page = 1;
        S.expanded = {};
        render(false);
    }

    /* ------------------------------------------------------------------ events */
    function onClick(ev) {
        var t = ev.target;
        var el;
        if ((el = t.closest("button[data-vw]"))) {
            S.vw = el.getAttribute("data-vw");
            try { localStorage.setItem("nest.showcase.vw", S.vw); } catch (err) { /* file:// */ }
            return render(true);
        }
        if ((el = t.closest("button[data-vh]"))) {
            S.vh = el.getAttribute("data-vh");
            try { localStorage.setItem("nest.showcase.vh", S.vh); } catch (err) { /* file:// */ }
            return render(true);
        }
        if ((el = t.closest("button[data-jump]"))) return setSection(el.getAttribute("data-jump"));
        if (!app || !app.contains(t)) return;

        if ((el = t.closest("[data-act]"))) {
            ev.preventDefault();
            var act = el.getAttribute("data-act");
            var e = byId(el.getAttribute("data-id"));
            if (act === "install" && e) {
                MOCK[e.id] = Object.assign({}, mockOf(e), { installed: true });
                window.NEST.toast(T("toast.installed", { name: e.name }));
                return render(true);
            }
            if (act === "update" && e) {
                MOCK[e.id] = Object.assign({}, mockOf(e), { update: false, installed: true });
                window.NEST.toast(T("toast.updated", { name: e.name }));
                return render(true);
            }
            if (act === "open" && e) return window.NEST.toast(T("toast.open", { name: e.name }));
            if (act === "page") return window.NEST.toast(T("toast.page"));
            if (act === "stream") return window.NEST.toast(T("toast.stream"));
            if (act === "menu") return window.NEST.toast(T("toast.menu"));
            return;
        }
        if (t.closest("a.chan")) return; /* channel marks open the browser */
        if ((el = t.closest("[data-sec]"))) return setSection(el.getAttribute("data-sec"));
        if ((el = t.closest("[data-author]"))) {
            S.author = el.getAttribute("data-author");
            if (S.section === "home") S.section = "all";
            S.page = 1;
            return render(false);
        }
        if (t.closest("[data-clear-author]")) {
            S.author = null;
            return render(false);
        }
        if ((el = t.closest("[data-tag]"))) {
            S.tag = el.getAttribute("data-tag") || null;
            if (S.section === "home" && S.tag) S.section = "all";
            S.page = 1;
            return render(false);
        }
        if ((el = t.closest("[data-sort]"))) {
            var k = el.getAttribute("data-sort");
            if (S.sort.key === k) S.sort.dir = -S.sort.dir;
            else S.sort = { key: k, dir: SORT_DEFAULT_DIR[k] };
            return render(true);
        }
        if (t.closest("[data-reset]")) {
            S.q = "";
            S.tag = null;
            S.author = null;
            return render(false);
        }
        if (t.closest("[data-more]")) {
            S.page++;
            return render(true);
        }
        if (t.closest("[data-pin]")) {
            S.pinPartners = !S.pinPartners;
            return render(true);
        }
        if ((el = t.closest("[data-shelf]"))) {
            var track = el.closest(".shelf").querySelector(".shelf-track");
            if (track) track.scrollBy({ left: (el.getAttribute("data-shelf") === "next" ? 1 : -1) * track.clientWidth * 0.8, behavior: "smooth" });
            return;
        }
        if ((el = t.closest("[data-row-toggle]"))) {
            if (t.closest("a, button, details, input, label")) return;
            var id = el.getAttribute("data-row-toggle");
            S.expanded[id] = !S.expanded[id];
            return render(true);
        }
        if ((el = t.closest("[data-select]"))) {
            if (t.closest("a, button, details, input, label")) return;
            S.selected = el.getAttribute("data-select");
            return render(true);
        }
    }
    function onInput(ev) {
        if (ev.target.id === "q") {
            S.q = ev.target.value;
            S.page = 1;
            render(false);
            return;
        }
        if (ev.target.hasAttribute("data-tag-filter")) {
            var q = ev.target.value.toLowerCase();
            ev.target.closest(".tag-list").querySelectorAll("[data-tag]").forEach(function (b) {
                var v = b.getAttribute("data-tag");
                b.hidden = !!v && v.toLowerCase().indexOf(q) < 0 && v !== S.tag;
            });
        }
    }

    /* ------------------------------------------------------------------ boot */
    function register(variant) {
        V = variant;
        S.section = variant.defaultSection || "all";
        var qs = params.get("section");
        if (qs) S.section = qs;
        var vw = params.get("vw");
        if (["780", "1000", "1280"].indexOf(vw) < 0) {
            try { vw = localStorage.getItem("nest.showcase.vw"); } catch (err) { vw = null; }
        }
        S.vw = ["780", "1000", "1280"].indexOf(vw) >= 0 ? vw : "1000";
        var vh = params.get("vh");
        if (["560", "720", "900"].indexOf(vh) < 0) {
            try { vh = localStorage.getItem("nest.showcase.vh"); } catch (err) { vh = null; }
        }
        S.vh = ["560", "720", "900"].indexOf(vh) >= 0 ? vh : "720";
        if (params.get("sort") && SORT_DEFAULT_DIR[params.get("sort")]) S.sort = { key: params.get("sort"), dir: SORT_DEFAULT_DIR[params.get("sort")] };
        if (variant.init) variant.init(S);

        document.addEventListener("DOMContentLoaded", function () {
            var holder = document.createElement("div");
            holder.innerHTML = SPRITE;
            document.body.insertBefore(holder.firstChild, document.body.firstChild);
            app = document.getElementById("app");
            document.addEventListener("click", onClick);
            document.addEventListener("input", onInput);
            /* the kit switches the language first; the window re-renders after it */
            document.querySelectorAll("[data-set-lang]").forEach(function (b) {
                b.addEventListener("click", function () { setTimeout(function () { render(true); }, 0); });
            });
            render(false);
        });
    }

    window.SHOW = {
        register: register,
        T: T,
        esc: esc,
        svg: svg,
        lang: lang,
        byId: byId,
        listings: LISTINGS,
        data: DATA,
        state: S,
        isNew: isNew,
        isUpdated: isUpdated,
        stateOf: stateOf,
        keepShare: keepShare,
        windowCapable: windowCapable,
        tintOf: tintOf,
        descOf: descOf,
        descHtml: descHtml,
        notesOf: notesOf,
        updateNotesHtml: updateNotesHtml,
        fmtNum: fmtNum,
        fmtDate: fmtDate,
        fmtShortDate: fmtShortDate,
        fmtRel: fmtRel,
        fmtRelShort: fmtRelShort,
        fmtBytes: fmtBytes,
        countWidgets: countWidgets,
        catLabel: catLabel,
        catIcon: catIcon,
        categoriesPresent: categoriesPresent,
        sectionCounts: sectionCounts,
        iconHtml: iconHtml,
        partnerBadge: partnerBadge,
        badgesHtml: badgesHtml,
        authorHtml: authorHtml,
        channelsHtml: channelsHtml,
        actionsHtml: actionsHtml,
        menuFor: menuFor,
        packageFact: packageFact,
        trustIconsHtml: trustIconsHtml,
        chipGroupsHtml: chipGroupsHtml,
        tagChipsHtml: tagChipsHtml,
        hostsHtml: hostsHtml,
        statInline: statInline,
        barHtml: barHtml,
        maxOf: maxOf,
        posterHtml: posterHtml,
        announcement: announcement,
        announcementHtml: announcementHtml,
        sortRows: sortRows,
        filtered: filtered,
        anyFilter: anyFilter,
        searchHtml: searchHtml,
        authorChipHtml: authorChipHtml,
        tagMenuHtml: tagMenuHtml,
        sortMenuHtml: sortMenuHtml,
        categoryMenuHtml: categoryMenuHtml,
        pagerHtml: pagerHtml,
        emptyHtml: emptyHtml,
        railHtml: railHtml,
        sectionPillsHtml: sectionPillsHtml,
        render: render
    };
})();
