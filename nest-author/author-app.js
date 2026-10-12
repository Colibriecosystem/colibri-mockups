/* The Author-tab prototype: a hash router, the renderers, the release wizard and every click.
   One module draws every screen from AUTHOR_DATA, so a widget's state reads the same in the rail,
   the summary, its page and the wizard. State lives in memory: a reload starts over.

   Routes (each screen is linkable in a review comment):
     #/                      summary of all my widgets
     #/w/<id>/<section>      a widget page: overview · versions · listing · code · access · stats · announce
     #/w/<id>/<section>/release   the same page with the release wizard open
     #/local/<key>           a dev folder Nest has never heard of ("code first")
     #/profile               profile, this author's keys, recovery, co-maintainers and announcements
   Mock-bar params: ?author=none|empty|yes|maintainer|unreadable|offline  ?scope=first|full  ?vw=800|1024|1280
                    ?starters=ok|offline|none|newer|exists|taken  (the «Из шаблона» cases)
                    ?partner=none|widget|author|older  (which partner mark is set; «older» is a Nest that has none)
   "maintainer" is the same author seen from a co-maintainer's PC: owner-only actions are disabled. */
(function () {
    "use strict";

    var D = window.AUTHOR_DATA;
    var html = document.documentElement;
    var params = new URLSearchParams(location.search);
    var AUTHOR_STATES = ["none", "empty", "yes", "maintainer", "unreadable", "offline"];
    var S = {
        author: AUTHOR_STATES.indexOf(params.get("author")) >= 0 ? params.get("author") : "yes",
        scope: params.get("scope") === "first" ? "first" : "full",
        vw: ["800", "1024", "1280"].indexOf(params.get("vw")) >= 0 ? params.get("vw") : "1024",
        tab: "author",
        open: {}, /* expanded version rows: "<id>@<v>" → true */
        editing: null, /* "<id>@<v>" whose notes are being edited */
        bell: false,
        bellSeen: false /* the bell was opened: the registry's read marker is at the newest event */,
        bellNew: 0 /* rows that were new when the bell opened; they keep their dot until it closes */,
        keyShown: false,
        created: null, /* id of a widget created a moment ago — the page greets it once */
        wiz: null,
        dlg: null,
        uvCase: "one", /* the user's side: one version after theirs, or the three-version example */
        uvUpdated: false,
        uvHistory: false,
        uvLife: "deprecated", /* the user's side of a widget's end of life: which case is drawn */
        succ: null, /* the successor picker: { id, pick, q } */
        trPreview: false /* the receiving author has typed a valid code and sees what they would get */,
        code: null, /* the code dialog on screen: { kind, code, until } */
        redeem: { value: "", error: null, emailSent: false }, /* the «ключ или код» box */
        recoveryUsed: false /* the author just came back with the recovery code */,
        ld: null /* the Listing form's unsaved draft: one widget's at a time */,
        lpErr: null /* why the last picture was refused */,
        pg: { shot: 0, aboutOpen: false } /* the widget page: which picture is large, the long text open */,
        pgFor: null /* the page dialog: { id, draft } */,
        starters: ["ok", "offline", "none", "newer", "exists", "taken"].indexOf(params.get("starters")) >= 0 ? params.get("starters") : "ok",
        st: null /* the «Из шаблона» form: { id, key, idValue, parent, steps, busy, canCancel, error } */,
        stDone: null /* a project created a moment ago: { id, path, edit, node } */,
        partner: ["none", "widget", "author", "older"].indexOf(params.get("partner")) >= 0 ? params.get("partner") : "author",
        an: {} /* unsaved announcement drafts: "author" or a widget id → { titleRu, titleEn, textRu, textEn, days } */
    };
    var emptyWidgets = [];

    /* a co-maintainer's PC: the author is the same, owner-only actions are not theirs */
    function isMaint() {
        return S.author === "maintainer";
    }
    function ownerOnlyAttrs() {
        return ' disabled title="' + esc(T("au.ownerOnly")) + '"';
    }
    /* the key this PC holds: the owner's work PC, or Анна's */
    function thisKeyId() {
        if (isMaint()) return "k3";
        return S.thisKey || "k1";
    }
    function keyById(id) {
        return D.author.keys.filter(function (k) {
            return k.id === id;
        })[0];
    }
    function memberById(id) {
        return D.author.members.filter(function (m) {
            return m.id === id;
        })[0];
    }
    function liveKeys() {
        return D.author.keys.filter(function (k) {
            return !k.revoked && (!isMaint() || k.member === "m1");
        });
    }
    function liveOwnerKeys() {
        return D.author.keys.filter(function (k) {
            return !k.revoked && !k.member;
        });
    }
    function memberName(id) {
        var m = D.author.members.filter(function (x) {
            return x.id === id;
        })[0];
        return m ? m.name : "";
    }
    function mmss(ms) {
        var s = Math.max(0, Math.round(ms / 1000));
        return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
    }

    function T(key, vars) {
        return window.NEST.t(key, vars);
    }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function icon(id, cls) {
        return '<svg class="icon' + (cls ? " " + cls : "") + '"><use href="#i-' + id + '"/></svg>';
    }
    function ph(text, invented) {
        return invented ? '<span class="ph">' + esc(text) + "</span>" : esc(text);
    }
    function later() {
        return ' <span class="later-chip">' + esc(T("au.later")) + "</span>";
    }
    var dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Yerevan" });
    var timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Yerevan" });
    function fmtDate(ms) {
        return dateFmt.format(new Date(ms));
    }
    function fmtDT(ms) {
        return fmtDate(ms) + ", " + timeFmt.format(new Date(ms));
    }
    function fmtNum(n) {
        return new Intl.NumberFormat("ru-RU").format(n);
    }
    function fmtBytes(n) {
        return n >= 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " МБ" : Math.round(n / 1024) + " КБ";
    }
    function fakeHash(seed) {
        var h = 2166136261;
        var out = "";
        for (var round = 0; round < 8; round++) {
            for (var i = 0; i < seed.length; i++) {
                h ^= seed.charCodeAt(i) + round;
                h = Math.imul(h, 16777619) >>> 0;
            }
            out += ("00000000" + h.toString(16)).slice(-8);
        }
        return out;
    }

    /* ---------- versions ---------- */
    function parseV(v) {
        var m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v || "").trim());
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    }
    /* Why a typed number cannot be published: a suffix (there is no pre-release channel), or not three
       plain numbers (a letter, a missing part, a leading zero). Null when it can. */
    function versionProblem(v) {
        var s = String(v || "").trim();
        if (/^\d+\.\d+\.\d+-/.test(s)) return "prerelease";
        if (!parseV(s) || /(^|\.)0\d/.test(s)) return "badFormat";
        return null;
    }
    /* Whether users must ACT on the folder's version — agree to new access, or update Colibri — which is
       when the wizard recommends a major number. */
    function mustAct(w) {
        if (!w.everApproved || !w.code) return null;
        var live = w.live || { permissions: [], egress: [] };
        var more = w.code.permissions.some(function (p) {
            return live.permissions.indexOf(p) < 0;
        }) || w.code.egress.some(function (h) {
            return live.egress.indexOf(h) < 0;
        });
        if (more) return "consent";
        if (w.code.minColibri && w.code.minColibri !== live.minColibri) return "colibri";
        return null;
    }
    function cmpV(a, b) {
        var x = parseV(a);
        var y = parseV(b);
        for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
        return 0;
    }
    function bump(v, kind) {
        var p = parseV(v);
        if (kind === "major") return p[0] + 1 + ".0.0";
        if (kind === "minor") return p[0] + "." + (p[1] + 1) + ".0";
        return p[0] + "." + p[1] + "." + (p[2] + 1);
    }
    function addWorkingDays(ms, n) {
        var d = new Date(ms);
        while (n > 0) {
            d = new Date(d.getTime() + D.DAY);
            var wd = d.getUTCDay();
            if (wd !== 0 && wd !== 6) n--;
        }
        return d.getTime();
    }

    /* ---------- derived widget facts ---------- */
    function widgets() {
        return S.author === "empty" ? emptyWidgets : D.widgets;
    }
    function find(id) {
        var list = widgets();
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return null;
    }
    function latest(w) {
        return w.versions[0] || null;
    }
    function current(w) {
        for (var i = 0; i < w.versions.length; i++) if (w.versions[i].current) return w.versions[i];
        return null;
    }
    function pendingOf(w) {
        for (var i = 0; i < w.versions.length; i++) if (w.versions[i].state === "pending" || w.versions[i].state === "checking") return w.versions[i];
        return null;
    }
    function highest(w) {
        var best = null;
        w.versions.forEach(function (x) {
            if (!best || cmpV(x.v, best.v) > 0) best = x;
        });
        return best;
    }
    function linked(w) {
        return !!(w.code && w.code.manifestId === w.id);
    }
    function mismatch(w) {
        return !!(w.code && w.code.manifestId !== w.id);
    }
    /* What the folder's widget.json still says about the widget's name, icon or author. Those live on
       the widget in Nest now; nothing reads them from the file, so this warns and never blocks. */
    function legacyFields(w) {
        return w.code && w.code.legacyFields && w.code.legacyFields.length ? w.code.legacyFields : null;
    }
    function legacyRemoveBtn(w) {
        return '<button class="btn btn-sm" data-act="remove-legacy" data-id="' + esc(w.id) + '">' + esc(T("au.code.legacy.remove")) + "</button>";
    }
    /* the one-line form, for the release wizard */
    function legacyLine(w) {
        var f = legacyFields(w);
        return f ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body">' + esc(T("au.wiz.legacy", { fields: f.join(", ") })) + "</div>" + legacyRemoveBtn(w) + "</div>" : "";
    }
    function phaseOf(w) {
        if (w.state === "takendown") return "takendown";
        if (w.state === "withdrawn") return "withdrawn";
        var l = latest(w);
        /* an approved widget keeps its standing while an update is checked; the update shows beside it */
        if (l && l.state === "checking" && !w.everApproved) return "checking";
        if (!w.everApproved) {
            if (!l || l.state === "withdrawn") return "draft";
            if (l.state === "refused") return "refused";
            if (l.state === "rejected") return "declined";
            return "inReview";
        }
        return w.visibility === "link" ? "link" : "live";
    }
    var CHIP = {
        draft: ["au.state.draft", "chip-dashed"],
        checking: ["au.state.checking", "chip-info"],
        inReview: ["au.state.inReview", "chip-warn"],
        declined: ["au.state.declined", "chip-danger"],
        refused: ["au.state.refused", "chip-danger"],
        live: ["au.state.live", "chip-ok"],
        link: ["au.state.link", "chip-info"],
        withdrawn: ["au.state.withdrawn", ""],
        takendown: ["au.state.takendown", "chip-danger"]
    };
    function stateChip(w) {
        var c = CHIP[phaseOf(w)];
        return '<span class="chip ' + c[1] + '">' + esc(T(c[0])) + "</span>";
    }
    /* beside the state, never instead of it: out of date, and a transfer waiting for its code */
    function lifeChips(w) {
        var out = "";
        if (w.deprecated) out += ' <span class="chip chip-warn" title="' + esc(w.successor ? T("au.dep.withSuccessor", { name: successorName(w.successor) }) : T("au.dep.noSuccessor")) + '">' + esc(T("au.dep.chip")) + "</span>";
        if (w.transfer) out += ' <span class="chip chip-info">' + icon("transfer", "sm") + esc(T("au.tr.chip")) + "</span>";
        return out;
    }
    function attention(w) {
        var p = phaseOf(w);
        if (p === "declined" || p === "refused" || p === "takendown") return "danger";
        var pend = pendingOf(w);
        if (pend && pend.overdue) return "warn";
        return null;
    }
    /* The first version's checklist. `rec` items are advice: they show and tick like the rest, but the
       count leaves them out and nothing waits on them — a release is never held. */
    function readiness(w) {
        var p = pageOf(w);
        return [
            { key: "au.ready.name", done: !!w.name, sec: "listing" },
            { key: "au.ready.icon", done: !!w.iconSet, sec: "listing" },
            { key: "au.ready.category", done: !!w.category, sec: "listing" },
            { key: "au.ready.description", done: !!(w.descRu || w.descEn), sec: "listing" },
            { key: "au.ready.code", done: linked(w), sec: "code" },
            { key: "au.ready.about", done: !!(p.aboutRu || p.aboutEn), sec: "listing", rec: true },
            { key: "au.ready.shots", done: p.shots.length > 0, sec: "listing", rec: true },
            { key: "au.ready.links", done: LINKS.some(function (k) {
                return !!p.links[k];
            }), sec: "listing", rec: true }
        ];
    }
    /* the listing page beyond the card; a widget that never had one reads as empty, never as missing */
    var LINKS = ["website", "docs", "support", "terms", "telegram", "youtube"];
    function pageOf(w) {
        if (!w.page) w.page = {};
        var p = w.page;
        p.features = p.features || [];
        p.shots = p.shots || [];
        p.links = p.links || {};
        p.languages = p.languages || [];
        return p;
    }
    function editorialMissing(w) {
        return !w.everApproved && (!w.category || !(w.descRu || w.descEn));
    }
    function wicon(w, lg) {
        if (!w.iconSet) return '<span class="wicon none' + (lg ? " lg" : "") + '">' + icon("puzzle", lg ? "lg" : "sm") + "</span>";
        return '<span class="wicon' + (lg ? " lg" : "") + '" style="background:' + w.color + '" aria-hidden="true">' + esc(w.letter) + "</span>";
    }
    function wname(w) {
        return ph(w.name, w.ph);
    }
    function shareUrl(w) {
        return D.registry + "/w/" + w.id + "?t=" + w.share;
    }
    function catLabel(key) {
        return key ? T("au.cat." + key) : "";
    }
    function scopeLabel(p) {
        return T("au.scope." + p);
    }

    /* ---------- router ---------- */
    function route() {
        var h = location.hash.replace(/^#\/?/, "").split("/");
        if (h[0] === "w" && h[1])
            return {
                kind: "widget",
                id: decodeURIComponent(h[1]),
                sec: h[2] || "overview",
                release: h[3] === "release",
                rollback: h[3] === "rollback" && h[4] ? decodeURIComponent(h[4]) : null
            };
        if (h[0] === "local" && h[1]) return { kind: "local", key: decodeURIComponent(h[1]) };
        if (h[0] === "profile") return { kind: "profile" };
        return { kind: "summary" };
    }
    function go(hash) {
        if (location.hash === hash) render();
        else location.hash = hash;
    }

    /* ================================================================== render */
    var root;
    function render() {
        html.setAttribute("data-scope", S.scope);
        html.setAttribute("data-vw", S.vw);
        html.lang = "ru";
        var ruler = document.getElementById("vw-ruler-value");
        if (ruler) ruler.textContent = S.vw + " px";
        document.querySelectorAll(".win-tabs [data-tab]").forEach(function (b) {
            if (b.getAttribute("data-tab") === S.tab) b.setAttribute("aria-current", "page");
            else b.removeAttribute("aria-current");
        });
        syncBar();
        syncTabBadge();
        /* the review bar is fixed over the page's foot; a sticky save bar sits just above it */
        var mb = document.querySelector(".mock-bar");
        html.style.setProperty("--mockbar", mb && !mb.hidden ? mb.offsetHeight + "px" : "0px");
        var r = route();
        if (S.tab === "catalog") root.innerHTML = renderUserView();
        else if (S.tab !== "author") root.innerHTML = '<div class="placeholder-tab">' + esc(T("au.otherTab")) + "</div>";
        else root.innerHTML = renderAuthor(r);
        /* the wizard follows the route, so a link to it opens it */
        if (S.tab === "author" && r.kind === "widget" && (r.release || r.rollback) && find(r.id) && S.author !== "none" && S.author !== "unreadable") {
            /* an open wizard is left alone, so a background re-render never eats what is being typed */
            if (!S.wiz || S.wiz.id !== r.id || S.wiz.from !== r.rollback) {
                startWizard(r.id, r.rollback);
                renderWizard();
            } else if (!dlg.open) renderWizard();
        } else if (S.wiz) {
            S.wiz = null;
            closeDialog();
        }
    }

    function renderAuthor(r) {
        if (S.author === "none") return renderOnboarding();
        if (S.author === "unreadable") return renderUnreadable();
        var page;
        if (r.kind === "widget" && find(r.id)) page = renderWidget(find(r.id), r.sec);
        else if (r.kind === "local") page = renderLocal(r.key);
        else if (r.kind === "profile") page = renderProfile();
        else page = renderSummary();
        return '<div class="ws">' + renderBar() + renderRail(r) + '<div class="page-a">' + offlineBanner() + page + "</div></div>";
    }

    function offlineBanner() {
        if (S.author !== "offline") return "";
        return '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body">' + esc(T("au.offline")) + "</div></div>";
    }

    function renderBar() {
        var a = D.author;
        var unread = bellUnread();
        var bell =
            '<div class="bell">' +
            '<button class="btn btn-icon" data-act="bell" title="' + esc(T("au.bell.title")) + '" aria-label="' + esc(T("au.bell.title")) + '" aria-expanded="' + S.bell + '">' + icon("bell") + "</button>" +
            (unread ? '<span class="badge">' + badgeText(unread) + "</span>" : "") +
            (S.bell ? renderBellPop() : "") +
            "</div>";
        return (
            '<div class="ws-bar">' +
            '<span class="avatar">' + esc(a.name.charAt(0)) + "</span>" +
            '<div class="who"><b>' + esc(a.name) + (isMaint() ? ' <span class="chip chip-info">' + esc(T("au.maint.badge")) + "</span>" : "") + "</b><span>" + esc(isMaint() ? T("au.maint.who", { name: memberName("m1") }) : T("au.bar.idHere")) + "</span></div>" +
            '<span class="grow"></span>' +
            '<button class="btn btn-primary btn-sm" data-act="new-widget">' + icon("plus") + esc(T("au.newWidget")) + "</button>" +
            bell +
            '<a class="btn btn-sm" href="#/profile">' + icon("user") + esc(T("au.profile")) + "</a>" +
            "</div>"
        );
    }
    /* ---------- the bell: the author's feed ---------- */
    /* Unread is a per-person marker on the registry: opening the bell moves it to the newest event, so
       the badge here and on the «Автор» tab both clear. The rows that were new keep their dot until the
       list closes, so the author still sees which ones they were. */
    function bellEvents() {
        /* a widget handed to someone else is no longer the author's, so its row carries its own name */
        return D.events.filter(function (n) {
            return n.kind === "notice" || n.kind === "widget.transferred" || (n.kind === "announcement.removed" && !n.widget) || find(n.widget);
        });
    }
    function bellUnread() {
        if (S.bellSeen || S.author === "none" || S.author === "unreadable") return 0;
        return Math.min(D.unread, bellEvents().length);
    }
    function badgeText(n) {
        return n > 99 ? "99+" : String(n);
    }
    function eventText(n) {
        var w = find(n.widget);
        var name = w ? w.name : "";
        var reason = n.reason && n.reason.indexOf("review.") === 0 ? (n.reason === "review.other" ? "" : T("au.code." + n.reason + ".title")) : n.reason || "";
        switch (n.kind) {
            case "version.approved":
                return T("au.ev.approved", { w: name, v: n.v });
            case "version.declined":
                return reason ? T("au.ev.declined", { w: name, v: n.v, reason: reason }) : T("au.ev.declinedBare", { w: name, v: n.v });
            case "version.unapproved":
                return T("au.ev.unapproved", { w: name, v: n.v });
            case "version.revoked":
                return reason ? T("au.ev.revoked", { w: name, v: n.v, reason: reason }) : T("au.ev.revokedBare", { w: name, v: n.v });
            case "version.reinstated":
                return T("au.ev.versionReinstated", { w: name, v: n.v });
            case "widget.taken-down":
                return reason ? T("au.ev.takenDown", { w: name, reason: reason }) : T("au.ev.takenDownBare", { w: name });
            case "widget.reinstated":
                return T("au.ev.reinstated", { w: name });
            case "review.reply":
                return T("au.ev.reply", { w: name, v: n.v });
            case "notice":
                return n.title;
            case "listing.moderated":
                return T("au.ev.listingModerated", { w: name, parts: n.parts, reason: n.reason });
            case "catalog.approved":
                return T("au.ev.catalogApproved", { w: name });
            case "catalog.declined":
                return reason ? T("au.ev.catalogDeclined", { w: name, reason: reason }) : T("au.ev.catalogDeclinedBare", { w: name });
            case "successor.cleared":
                return reason ? T("au.ev.successorCleared", { w: name, reason: reason }) : T("au.ev.successorClearedBare", { w: name });
            case "widget.transferred":
                return T("au.ev.transferred", { w: n.name, to: n.to });
            case "transfer.voided":
                return T("au.ev.transferVoided", { w: name });
            /* the author's own announcement has no widget to name */
            case "announcement.removed":
                return n.widget ? T("au.ev.announceRemoved", { w: name, reason: n.reason }) : T("au.ev.announceRemovedAuthor", { reason: n.reason });
            default:
                return T("au.ev.unknown", { w: name });
        }
    }
    function eventColor(kind) {
        if (kind === "version.approved" || kind === "version.reinstated" || kind === "widget.reinstated" || kind === "catalog.approved") return "var(--ok)";
        if (kind === "review.reply" || kind === "notice" || kind === "widget.transferred") return "var(--info)";
        return "var(--danger)";
    }
    function renderBellPop() {
        var evs = bellEvents();
        var rows = evs
            .map(function (n, i) {
                var isNew = i < S.bellNew;
                var dot = '<span class="status-dot" style="color:' + eventColor(n.kind) + '"></span>';
                var text = '<span><span class="' + (n.ph ? "ph" : "") + '">' + esc(eventText(n)) + "</span><small>" + fmtDT(n.at) + (isNew ? ' · <b class="note-new">' + esc(T("au.bell.new")) + "</b>" : "") + "</small></span>";
                if (n.kind === "notice") return '<a class="note-row' + (isNew ? " is-new" : "") + '" href="' + esc(n.url) + '" target="_blank" rel="noopener" data-act="bell-close">' + dot + text + "</a>";
                if (n.kind === "widget.transferred") return '<a class="note-row' + (isNew ? " is-new" : "") + '" href="#/" data-act="bell-close">' + dot + text + "</a>";
                if (n.kind === "announcement.removed" && !n.widget) return '<a class="note-row' + (isNew ? " is-new" : "") + '" href="#/profile" data-act="bell-close">' + dot + text + "</a>";
                var id = encodeURIComponent(n.widget);
                var versionKind = n.kind.indexOf("version.") === 0 || n.kind === "review.reply";
                var accessKind = n.kind.indexOf("catalog.") === 0 || n.kind === "successor.cleared" || n.kind === "transfer.voided";
                var href = "#/w/" + id + (versionKind ? "/versions" : n.kind === "listing.moderated" ? "/listing" : n.kind === "announcement.removed" ? "/announce" : accessKind ? "/access" : "/overview");
                /* a version's row opens expanded; its conversation is open there whenever it has messages */
                var open = versionKind ? ' data-open-row="' + esc(n.widget + "@" + n.v) + '"' : "";
                return '<a class="note-row' + (isNew ? " is-new" : "") + '" href="' + href + '"' + open + ' data-act="bell-close">' + dot + text + "</a>";
            })
            .join("");
        if (!evs.length) rows = '<p class="hint" style="padding:6px 8px">' + esc(T("au.bell.empty")) + "</p>";
        return '<div class="bell-pop"><h3>' + esc(T("au.bell.title")) + "</h3>" + rows + '<p class="hint" style="padding:6px 8px 2px">' + esc(T("au.bell.hint")) + "</p></div>";
    }
    /* The «Автор» tab carries the same count, so it is seen from the catalog side too. */
    function syncTabBadge() {
        var b = document.getElementById("tab-badge-author");
        if (!b) return;
        var n = bellUnread();
        b.hidden = !n;
        b.textContent = n ? badgeText(n) : "";
    }

    function renderRail(r) {
        var items = widgets()
            .map(function (w) {
                var cur = r.kind === "widget" && r.id === w.id;
                var at = attention(w);
                var sub = T(CHIP[phaseOf(w)][0]);
                var c = current(w);
                if (c) sub += " · " + c.v;
                var pend = pendingOf(w);
                if (pend && w.everApproved) sub += " · " + T("au.rail.pending", { v: pend.v });
                return (
                    '<a class="rail-item" href="#/w/' + encodeURIComponent(w.id) + '/overview"' + (cur ? ' aria-current="page"' : "") + ">" +
                    wicon(w) +
                    '<span style="min-width:0"><span class="nm">' + wname(w) + '</span><span class="st">' + esc(sub) + "</span></span>" +
                    (at ? '<span class="attn ' + at + '" title="' + esc(T("au.rail.attention")) + '"></span>' : "<span></span>") +
                    "</a>"
                );
            })
            .join("");
        var locals = D.local
            .map(function (l) {
                var cur = r.kind === "local" && r.key === l.key;
                return (
                    '<a class="rail-item" href="#/local/' + encodeURIComponent(l.key) + '"' + (cur ? ' aria-current="page"' : "") + ">" +
                    '<span class="wicon folder">' + icon("folder", "sm") + "</span>" +
                    '<span style="min-width:0"><span class="nm ph">' + esc(l.key) + '</span><span class="st">' + esc(T("au.local.sub")) + "</span></span><span></span></a>"
                );
            })
            .join("");
        return (
            '<nav class="rail-a" aria-label="' + esc(T("au.rail.label")) + '">' +
            '<a class="rail-item" href="#/"' + (r.kind === "summary" ? ' aria-current="page"' : "") + ">" + '<span class="wicon folder">' + icon("grid", "sm") + '</span><span class="nm">' + esc(T("au.summary")) + "</span><span></span></a>" +
            '<div class="group">' + esc(T("au.rail.mine")) + "</div>" +
            (items || '<p class="hint" style="padding:4px 8px">' + esc(T("au.rail.none")) + "</p>") +
            '<div class="group">' + esc(T("au.rail.local")) + "</div>" +
            locals +
            '<span class="spacer"></span>' +
            '<a class="rail-item" href="#/profile"' + (r.kind === "profile" ? ' aria-current="page"' : "") + ">" + '<span class="wicon folder">' + icon("key", "sm") + '</span><span class="nm">' + esc(T("au.rail.profile")) + "</span><span></span></a>" +
            "</nav>"
        );
    }

    /* ---------- summary (all my widgets) ---------- */
    function renderSummary() {
        var list = widgets();
        if (!list.length) {
            return (
                '<div class="empty-state" style="margin-top:20px">' + icon("package") +
                "<h1>" + esc(T("au.empty.title")) + "</h1>" +
                '<p class="lede" style="margin:0 auto 14px">' + esc(T("au.empty.body")) + "</p>" +
                '<button class="btn btn-primary" data-act="new-widget">' + icon("plus") + esc(T("au.newWidget")) + "</button>" +
                '<p class="hint" style="margin-top:14px">' + esc(T("au.empty.codeFirst")) + "</p></div>"
            );
        }
        var rows = list
            .map(function (w) {
                var c = current(w);
                var pend = pendingOf(w);
                var ver = c ? '<span class="mono">' + esc(c.v) + "</span>" : '<span class="faint">—</span>';
                if (pend && w.everApproved) ver += ' <span class="dim small">→ <span class="mono">' + esc(pend.v) + "</span></span>";
                var nx = nextOf(w);
                var installs = w.stats ? '<span class="ph">' + fmtNum(w.stats.installs) + "</span>" : "";
                return (
                    "<tr>" +
                    '<td><div class="w">' + wicon(w) + '<a href="#/w/' + encodeURIComponent(w.id) + '/overview">' + wname(w) + "</a></div></td>" +
                    "<td>" + stateChip(w) + lifeChips(w) + "</td>" +
                    "<td>" + ver + "</td>" +
                    '<td class="dim small">' + esc(nx.short) + "</td>" +
                    '<td class="num col-wide later">' + installs + "</td>" +
                    "</tr>"
                );
            })
            .join("");
        return (
            '<div class="page-head" style="margin-bottom:12px"><div><h1 style="font-size:var(--fs-xl)">' + esc(T("au.summary.title")) + '</h1><p class="lede">' + esc(T("au.summary.lede")) + "</p></div></div>" +
            '<div class="table-scroll"><table class="data dash"><thead><tr>' +
            "<th>" + esc(T("au.col.widget")) + "</th><th>" + esc(T("au.col.state")) + "</th><th>" + esc(T("au.col.version")) + "</th><th>" + esc(T("au.col.next")) + '</th><th class="num col-wide later">' + esc(T("au.col.installs")) + "</th>" +
            "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.summary.hint")) + "</p>"
        );
    }

    /* «Что дальше»: one sentence and at most one main action, from the widget's state */
    function nextOf(w) {
        var p = phaseOf(w);
        var l = latest(w);
        var pend = pendingOf(w);
        var id = encodeURIComponent(w.id);
        var n = { tone: "", title: "", body: "", actions: "", short: "" };
        if (p === "takendown") {
            n.tone = "danger";
            n.title = T("au.next.takendown.title");
            n.body = ""; /* the block below carries the reason and what it means */
            n.short = T("au.next.takendown.short");
            return n;
        }
        if (p === "withdrawn") {
            n.title = T("au.next.withdrawn.title");
            n.body = T("au.next.withdrawn.body");
            n.actions = '<button class="btn" data-act="restore" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + esc(T("au.restore")) + "</button>";
            n.short = T("au.next.withdrawn.short");
            return n;
        }
        if (p === "checking") {
            n.tone = "info";
            n.title = T("au.feedback.checking", { v: l.v });
            n.body = T("au.next.checking.body");
            n.short = T("au.next.checking.short");
            return n;
        }
        if (p === "declined") {
            n.tone = "danger";
            n.title = T("au.feedback.declined", { v: l.v, reason: T("au.code." + l.rejection.code + ".title") });
            n.body = T("au.code." + l.rejection.code + ".hint");
            n.actions = releaseBtn(w, T("au.resubmit"), true) + ' <a class="btn" href="#/w/' + id + '/versions" data-open-row="' + esc(w.id + "@" + l.v) + '">' + icon("message") + esc(T("au.next.conversation")) + "</a>";
            n.short = T("au.next.declined.short");
            return n;
        }
        if (p === "refused") {
            n.tone = "danger";
            n.title = T("au.feedback.refused", { v: l.v, check: T("au.check." + l.rejection.check) });
            n.body = T("au.code." + l.rejection.code + ".title") + ". " + T("au.code." + l.rejection.code + ".hint");
            n.actions = releaseBtn(w, T("au.resubmit"), true);
            n.short = T("au.next.refused.short");
            return n;
        }
        if (pend && pend.state === "checking") {
            n.tone = "info";
            n.title = T("au.feedback.checking", { v: pend.v });
            n.body = T("au.next.checking.body");
            n.short = T("au.next.checking.short");
            return n;
        }
        if (pend && pend.state === "pending") {
            n.tone = pend.overdue ? "warn" : "info";
            n.title = pend.overdue ? T("au.feedback.overdue", { v: pend.v, date: fmtDate(pend.due) }) : T("au.feedback.waiting", { v: pend.v, date: fmtDate(pend.due) });
            n.body = w.everApproved ? T("au.next.pendingUpdate.body", { v: current(w).v }) : T("au.next.pendingFirst.body");
            n.actions = '<a class="btn" href="#/w/' + id + '/versions" data-open-row="' + esc(w.id + "@" + pend.v) + '">' + icon("message") + esc(T("au.next.writeModerator")) + "</a>";
            n.short = pend.overdue ? T("au.next.overdue.short") : T("au.next.pending.short");
            return n;
        }
        if (p === "draft") {
            if (!linked(w)) {
                n.title = mismatch(w) ? T("au.next.mismatch.title") : T("au.next.noCode.title");
                n.body = T("au.next.noCode.body");
                n.actions = '<a class="btn btn-primary" href="#/w/' + id + '/code">' + icon("folder") + esc(T("au.next.noCode.action")) + "</a>";
                n.short = T("au.next.noCode.short");
                return n;
            }
            var missing = readiness(w).filter(function (x) {
                return !x.done;
            });
            if (missing.length) {
                n.title = T("au.next.listing.title");
                n.body = T("au.next.listing.body", {
                    list: missing
                        .map(function (x) {
                            return T(x.key).toLowerCase();
                        })
                        .join(", ")
                });
                n.actions = '<a class="btn btn-primary" href="#/w/' + id + '/listing">' + esc(T("au.next.listing.action")) + "</a>";
                n.short = T("au.next.listing.short");
                return n;
            }
            n.tone = "ok";
            n.title = T("au.next.ready.title");
            n.body = T("au.next.ready.body");
            n.actions = releaseBtn(w, T("au.releaseFirst"), true);
            n.short = T("au.next.ready.short");
            return n;
        }
        var c = current(w);
        n.tone = "ok";
        n.title = p === "link" ? T("au.next.link.title", { v: c.v }) : T("au.next.live.title", { v: c.v, date: fmtDate(c.decided) });
        n.body = p === "link" ? T("au.next.link.body") : T("au.next.live.body");
        n.actions = releaseBtn(w, T("au.release"), true);
        n.short = T("au.next.live.short");
        return n;
    }
    function releaseBtn(w, label, primary) {
        return '<a class="btn' + (primary ? " btn-primary" : "") + '" href="#/w/' + encodeURIComponent(w.id) + "/" + (route().sec || "overview") + '/release">' + icon("upload") + esc(label) + "</a>";
    }

    /* ---------- widget page ---------- */
    var SECTIONS = [
        ["overview", "au.sec.overview", false],
        ["versions", "au.sec.versions", false],
        ["listing", "au.sec.listing", false],
        ["code", "au.sec.code", false],
        ["access", "au.sec.access", false],
        ["stats", "au.sec.stats", false],
        /* only on a widget its author may announce for (canAnnounce) */
        ["announce", "au.sec.announce", false]
    ];
    function renderWidget(w, sec) {
        var id = encodeURIComponent(w.id);
        var c = current(w);
        var pend = pendingOf(w);
        var meta = stateChip(w);
        if (pend && w.everApproved && pend.state === "pending") meta += ' <span class="chip chip-warn">' + esc(T("au.pendingVersion", { v: pend.v })) + "</span>";
        if (pend && w.everApproved && pend.state === "checking") meta += ' <span class="chip chip-info"><span class="status-dot pulse"></span>' + esc(T("au.feedback.checking", { v: pend.v })) + "</span>";
        if (w.catalogRequested && w.visibility !== "catalog") meta += ' <span class="chip chip-info">' + esc(T("au.chip.catalogRequested")) + "</span>";
        meta += lifeChips(w);
        if (w.pendingName) meta += ' <span class="chip chip-warn">' + esc(T("au.pendingName", { name: w.pendingName })) + "</span>";
        meta += ' <span class="idline">ID ' + esc(w.id) + ' <button data-act="copy" data-text="' + esc(w.id) + '" title="' + esc(T("au.copyId")) + '">' + icon("copy", "sm") + "</button></span>";
        var canRelease = w.state !== "takendown" && w.state !== "withdrawn" && !(pend && pend.state === "checking");
        var menu =
            '<details class="menu"><summary class="btn btn-icon" aria-label="' + esc(T("au.more")) + '">' + icon("more") + '</summary><div class="menu-list">' +
            (linked(w) ? '<button data-toast="au.toast.openedPanel">' + icon("panel") + esc(T("au.openPanel")) + '</button><button data-toast="au.toast.openedWindow">' + icon("window") + esc(T("au.openWindow")) + "</button><hr/>" : "") +
            (w.state === "withdrawn" ? '<button data-act="restore" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("undo") + esc(T("au.restore")) + "</button>" : w.state !== "takendown" && w.state !== "draft" ? '<button data-act="withdraw" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("archive") + esc(T("au.withdraw")) + "</button>" : "") +
            (!w.everApproved ? '<button class="danger" data-act="delete" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("trash") + esc(T("au.delete")) + "</button>" : "") +
            "</div></details>";
        var head =
            '<a class="btn btn-link btn-sm back-link" href="#/">' + icon("arrow-left") + esc(T("au.back")) + "</a>" +
            '<div class="wp-head">' + wicon(w, true) +
            '<div style="min-width:0"><h1>' + wname(w) + '</h1><div class="meta">' + meta + "</div></div>" +
            '<div class="actions">' +
            (canRelease ? releaseBtn(w, w.everApproved || w.versions.length ? T("au.release") : T("au.releaseFirst"), true) : "") +
            (w.share ? '<button class="btn" data-act="copy" data-text="' + esc(shareUrl(w)) + '">' + icon("link") + esc(T("au.copyLink")) + "</button>" : "") +
            menu + "</div></div>";
        var tabs =
            '<nav class="tabs">' +
            SECTIONS.filter(function (s) {
                return s[0] !== "announce" || canAnnounce(w);
            }).map(function (s) {
                var count = s[0] === "versions" && w.versions.length ? ' <span class="tab-count">' + w.versions.length + "</span>" : "";
                return '<a class="tab' + (s[2] ? " later" : "") + '" href="#/w/' + id + "/" + s[0] + '"' + (sec === s[0] ? ' aria-current="page"' : "") + ">" + esc(T(s[1])) + count + (s[2] ? later() : "") + "</a>";
            }).join("") +
            "</nav>";
        var body;
        if (sec === "versions") body = renderVersions(w);
        else if (sec === "listing") body = renderListing(w);
        else if (sec === "code") body = renderCode(w);
        else if (sec === "access") body = renderAccess(w);
        else if (sec === "stats") body = renderStats(w);
        else if (sec === "announce" && canAnnounce(w)) body = renderAnnounceSection(w);
        else body = renderOverview(w);
        var greet = "";
        if (S.created === w.id) {
            greet = '<div class="banner banner-success">' + icon("check") + '<div class="banner-body">' + T("au.created", { id: '<span class="mono">' + esc(w.id) + "</span>" }) + "</div></div>";
            S.created = null;
        }
        return head + greet + tabs + body;
    }

    function renderOverview(w) {
        var n = nextOf(w);
        var out =
            '<div class="card next ' + n.tone + '"><div><div class="k">' + esc(T("au.next.k")) + "</div><h3>" + esc(n.title) + "</h3>" + (n.body ? "<p>" + esc(n.body) + "</p>" : "") + "</div>" +
            '<div class="go">' + n.actions + "</div></div>";
        var l = latest(w);
        /* the card above already says what happened and offers the fix; below it, only the
           specifics: the registry's detail, the rule, the conversation */
        if (l && (l.state === "rejected" || l.state === "refused")) out += '<div class="card">' + renderStatusBlock(w, l, true) + "</div>";
        if (w.state === "takendown") out += '<div class="card">' + takedownBlock(w) + "</div>";
        var left = "";
        if (!w.everApproved) {
            var items = readiness(w);
            var required = items.filter(function (x) {
                return !x.rec;
            });
            var done = required.filter(function (x) {
                return x.done;
            }).length;
            left +=
                '<div class="card"><h2 class="sec">' + esc(T("au.ready.title")) + ' <span class="dim small">' + done + " / " + required.length + "</span></h2>" +
                '<div class="progress"><i style="width:' + Math.round((done / required.length) * 100) + '%"></i></div>' +
                '<ul class="checklist">' +
                items
                    .map(function (x) {
                        var rec = x.rec ? ' <span class="rec-chip">' + esc(T("au.ready.recommended")) + "</span>" : "";
                        return '<li class="' + (x.done ? "done" : "") + (x.rec ? " rec" : "") + '"><span class="mark">' + icon("check", "sm") + '</span><span class="lbl">' + esc(T(x.key)) + rec + "</span>" + (x.done ? "<span></span>" : '<a class="btn btn-link btn-sm" href="#/w/' + encodeURIComponent(w.id) + "/" + x.sec + '">' + esc(T("au.ready.fill")) + "</a>") + "</li>";
                    })
                    .join("") +
                '</ul><p class="hint" style="margin-top:6px">' + esc(T("au.ready.hint")) + "</p></div>";
        }
        var c = current(w);
        var pend = pendingOf(w);
        var strip =
            '<div class="card"><h2 class="sec">' + esc(T("au.sec.versions")) + '</h2><div class="vstrip">' +
            '<div><span class="k">' + esc(T("au.strip.current")) + "</span><b>" + (c ? esc(c.v) : "—") + "</b></div>" +
            (pend ? '<div><span class="k">' + esc(pend.state === "checking" ? T("au.strip.checking") : T("au.strip.pending")) + "</span><b>" + esc(pend.v) + "</b></div>" : "") +
            (linked(w) ? '<div><span class="k">' + esc(T("au.strip.inFolder")) + "</span><b>" + esc(w.code.manifestVersion) + "</b></div>" : "") +
            '</div><p style="margin-top:8px"><a href="#/w/' + encodeURIComponent(w.id) + '/versions">' + esc(T("au.strip.all")) + "</a></p></div>";
        var right = strip;
        var statsCard = "";
        if (w.stats) {
            statsCard =
                '<div class="card"><h2 class="sec">' + esc(T("au.sec.stats")) + '</h2><div class="nums">' +
                '<div class="stat"><b class="ph">' + fmtNum(w.stats.installs) + "</b><span>" + esc(T("au.stats.installs")) + "</span></div>" +
                '<div class="stat"><b class="ph">' + fmtNum(w.stats.active7) + "</b><span>" + esc(T("au.stats.active7")) + "</span></div></div></div>";
        }
        out += left
            ? '<div class="grid-2" style="margin-top:10px"><div class="stack">' + left + '</div><div class="stack">' + right + statsCard + "</div></div>"
            : '<div class="grid-2 even" style="margin-top:10px">' + right + statsCard + "</div>";
        return out;
    }

    /* the status block: what became of an upload, why, what to do, and the conversation */
    function renderStatusBlock(w, v, specificsOnly) {
        if (specificsOnly) {
            var spec = "";
            if (v.state === "refused") spec += '<details class="more" open><summary>' + icon("chevron-right", "sm") + esc(T("au.feedback.details")) + '</summary><div class="detail">' + esc(v.rejection.detail) + "</div></details>";
            spec += '<p style="margin-top:6px"><a href="#" data-toast="au.toast.rule">' + esc(T("au.feedback.rule")) + "</a></p>";
            if (v.state === "rejected") spec += renderThread(w, v);
            return spec;
        }
        var cls = "status";
        var line = "";
        var why = "";
        if (v.state === "checking") line = '<span class="status-dot pulse" style="color:var(--info)"></span><b>' + esc(T("au.feedback.checking", { v: v.v })) + "</b>";
        else if (v.state === "pending") {
            cls += v.overdue ? " warn" : "";
            line = "<b>" + esc(v.overdue ? T("au.feedback.overdue", { v: v.v, date: fmtDate(v.due) }) : T("au.feedback.waiting", { v: v.v, date: fmtDate(v.due) })) + "</b>";
        } else if (v.state === "rejected") {
            cls += " danger";
            line = "<b>" + esc(T("au.feedback.declined", { v: v.v, reason: T("au.code." + v.rejection.code + ".title") })) + "</b>";
            why = '<div class="why"><p>' + esc(T("au.code." + v.rejection.code + ".hint")) + '</p><a href="#" data-toast="au.toast.rule">' + esc(T("au.feedback.rule")) + "</a></div>";
        } else if (v.state === "refused") {
            cls += " danger";
            line = "<b>" + esc(T("au.feedback.refused", { v: v.v, check: T("au.check." + v.rejection.check) })) + "</b>";
            why =
                '<div class="why"><b>' + esc(T("au.code." + v.rejection.code + ".title")) + "</b><p>" + esc(T("au.code." + v.rejection.code + ".hint")) + "</p>" +
                '<details class="more"><summary>' + icon("chevron-right", "sm") + esc(T("au.feedback.details")) + '</summary><div class="detail">' + esc(v.rejection.detail) + "</div></details>" +
                '<a href="#" data-toast="au.toast.rule">' + esc(T("au.feedback.rule")) + "</a></div>";
        } else if (v.state === "withdrawn") line = "<b>" + esc(T("au.feedback.withdrawn", { v: v.v })) + "</b>";
        else if (v.state === "approved") line = "<b>" + esc(T("au.feedback.approved", { v: v.v })) + "</b>";
        var actions = "";
        if ((v.state === "rejected" || v.state === "refused") && v === latest(w)) {
            actions = '<div class="row-actions">' + releaseBtn(w, T("au.resubmit"), false) + '<span class="hint">' + esc(T("au.resubmit.tip")) + "</span></div>";
        }
        var thread = "";
        var hasThread = v.state === "pending" || v.state === "rejected" || (v.thread && v.thread.length);
        if (hasThread) thread = renderThread(w, v);
        return '<div class="' + cls + '"><div class="line">' + line + "</div>" + why + actions + thread + "</div>";
    }
    function renderThread(w, v) {
        var open = v.state === "pending" || v.state === "rejected";
        var msgs = (v.thread || [])
            .map(function (m) {
                var me = m.from === "author";
                return '<div class="msg' + (me ? " me" : "") + '"><div class="who"><b>' + esc(me ? T("au.thread.you") : T("au.thread.moderator")) + "</b><span>" + fmtDT(m.at) + '</span></div><div class="ph">' + esc(m.body) + "</div></div>";
            })
            .join("");
        var key = w.id + "@" + v.v;
        return (
            '<details class="more" style="margin-top:8px"' + (v.thread && v.thread.length ? " open" : "") + "><summary>" + icon("chevron-right", "sm") + esc(T("au.thread.heading", { n: (v.thread || []).length })) + "</summary>" +
            '<div class="thread">' + (msgs || '<p class="hint">' + esc(T("au.thread.empty")) + "</p>") + "</div>" +
            (open
                ? '<div class="reply"><textarea class="textarea" id="reply-' + esc(key) + '" placeholder="' + esc(T("au.thread.placeholder")) + '" maxlength="2000"></textarea><button class="btn" data-act="reply" data-key="' + esc(key) + '">' + icon("send") + esc(T("au.thread.send")) + "</button></div>"
                : '<p class="hint" style="margin-top:6px">' + esc(T("au.thread.closed")) + "</p>") +
            "</details>"
        );
    }
    function takedownBlock(w) {
        return (
            '<div class="status danger"><div class="line"><b>' + esc(T("au.takedown.title", { date: fmtDate(w.takedown.at) })) + "</b></div>" +
            '<div class="why"><p class="ph">' + esc(w.takedown.reason) + "</p><p>" + esc(T("au.takedown.body")) + '</p><a href="#" data-toast="au.toast.rule">' + esc(T("au.takedown.rules")) + "</a></div></div>"
        );
    }

    /* ---------- versions ---------- */
    var RUNGS = ["size", "archive", "manifest", "scopes", "hash", "consistency", "content", "egress-code", "egress-ws", "secrets", "csp", "embed", "av", "malware", "egress", "origin", "ownership", "editorial"];
    var GATES = { size: 1, archive: 1, manifest: 1, hash: 1, "egress-ws": 1, embed: 1, malware: 1, egress: 1, origin: 1, ownership: 1, editorial: 1 };
    function ladder(v) {
        return (
            '<span class="ladder">' +
            RUNGS.map(function (name, i) {
                var n = i + 1;
                var cls = "rung" + (GATES[name] ? " gate" : "");
                if (v.state === "checking") cls += n <= (v.progress || 0) ? " rung-pass" : " rung-off";
                else if (v.state === "refused") cls += n < v.failAt ? " rung-pass" : n === v.failAt ? " rung-fail" : " rung-off";
                else if (name === "csp" || name === "origin") cls += " rung-skip";
                else cls += " rung-pass";
                return '<span class="' + cls + '" title="' + esc(T("au.check." + name)) + '"></span>';
            }).join("") +
            "</span>"
        );
    }
    function versionChip(w, v) {
        if (v.state === "checking") return '<span class="chip chip-info"><span class="status-dot pulse"></span>' + esc(T("au.v.checking")) + "</span>";
        if (v.state === "pending") return v.overdue ? '<span class="chip chip-warn">' + esc(T("au.v.overdue")) + "</span>" : '<span class="chip chip-warn">' + esc(T("au.v.pending")) + "</span>";
        if (v.state === "approved") return v.current ? '<span class="chip chip-ok">' + esc(T("au.v.current")) + "</span>" : '<span class="chip">' + esc(T("au.v.approved")) + "</span>";
        if (v.state === "rejected") return '<span class="chip chip-danger">' + esc(T("au.v.declined")) + "</span>";
        if (v.state === "refused") return '<span class="chip chip-danger">' + esc(T("au.v.refused")) + "</span>";
        return '<span class="chip chip-dashed">' + esc(T("au.v.withdrawn")) + "</span>";
    }
    function decidedText(v) {
        if (v.state === "pending") return T("au.v.dueBy", { date: fmtDate(v.due) });
        if (v.state === "checking") return "";
        return v.decided ? fmtDate(v.decided) : "";
    }
    function renderVersions(w) {
        if (!w.versions.length) {
            return (
                '<div class="empty-state">' + icon("history") + "<h1>" + esc(T("au.versions.none.title")) + '</h1><p class="lede" style="margin:0 auto 12px">' + esc(T("au.versions.none.body")) + "</p>" +
                (w.state !== "takendown" ? releaseBtn(w, T("au.releaseFirst"), true) : "") + "</div>"
            );
        }
        var rows = w.versions
            .map(function (v, i) {
                var key = w.id + "@" + v.v;
                var open = !!S.open[key];
                var note = v.notesRu || v.notesEn || "";
                var firstLine = note.split("\n")[0];
                var menu =
                    '<details class="menu"><summary class="btn btn-icon btn-sm" aria-label="' + esc(T("au.more")) + '">' + icon("more", "sm") + '</summary><div class="menu-list">' +
                    '<button data-act="edit-notes" data-key="' + esc(key) + '">' + icon("pencil") + esc(T("au.v.editNotes")) + "</button>" +
                    (v.state === "pending" ? '<button data-act="withdraw-version" data-key="' + esc(key) + '">' + icon("x") + esc(T("au.v.withdraw")) + "</button>" : "") +
                    (v.state === "approved" && !v.current && w.state !== "takendown" && w.state !== "withdrawn"
                        ? '<button data-act="rollback" data-key="' + esc(key) + '">' + icon("undo") + esc(T("au.v.rollback")) + "</button>"
                        : "") +
                    "</div></details>";
                var main =
                    "<tr>" +
                    '<td style="width:28px"><button class="expander" data-act="toggle-row" data-key="' + esc(key) + '" aria-expanded="' + open + '" aria-label="' + esc(T("au.v.expand")) + '">' + icon("chevron-right") + "</button></td>" +
                    '<td class="vno">' + esc(v.v) + "</td>" +
                    "<td>" + versionChip(w, v) + "</td>" +
                    '<td class="when">' + (v.submitted ? ph(fmtDate(v.submitted), v.ph) : "") + "</td>" +
                    '<td class="when">' + ph(decidedText(v), v.ph) + "</td>" +
                    '<td class="col-notes"><div class="notes-1">' + (firstLine ? ph(firstLine, v.ph) : '<span class="faint">' + esc(T("au.v.noNotes")) + "</span>") + "</div></td>" +
                    '<td style="width:40px;text-align:right">' + menu + "</td>" +
                    "</tr>";
                var expand = open ? '<tr class="expand-row"><td colspan="7">' + renderVersionDetail(w, v, i) + "</td></tr>" : "";
                return main + expand;
            })
            .join("");
        return (
            '<div class="row-actions" style="margin-bottom:10px;justify-content:space-between"><p class="lede">' + esc(T("au.versions.lede")) + "</p>" +
            (w.state !== "takendown" && w.state !== "withdrawn" ? releaseBtn(w, T("au.release"), true) : "") + "</div>" +
            '<div class="table-scroll vt-wrap"><table class="data vt"><colgroup><col class="c-exp"/><col class="c-ver"/><col class="c-state"/><col class="c-sent"/><col class="c-dec"/><col class="c-notes"/><col class="c-menu"/></colgroup><thead><tr><th></th><th>' + esc(T("au.col.version")) + "</th><th>" + esc(T("au.col.state")) + "</th><th>" + esc(T("au.col.sent")) + "</th><th>" + esc(T("au.col.decided")) + '</th><th class="col-notes">' + esc(T("au.col.notes")) + "</th><th></th></tr></thead><tbody>" +
            rows + "</tbody></table></div>" +
            '<div class="ladder-legend" style="margin-top:8px"><span><span class="rung rung-pass"></span>' + esc(T("au.legend.pass")) + '</span><span><span class="rung rung-fail"></span>' + esc(T("au.legend.fail")) + '</span><span><span class="rung rung-skip"></span>' + esc(T("au.legend.skip")) + '</span><span><span class="rung gate"></span>' + esc(T("au.legend.gate")) + "</span></div>"
        );
    }
    function renderVersionDetail(w, v, i) {
        var key = w.id + "@" + v.v;
        var notes;
        if (S.editing === key) {
            notes =
                '<div class="stack"><label class="field"><span>' + esc(T("au.wiz.notes.ru")) + '</span><textarea class="textarea" id="edit-ru" maxlength="1000">' + esc(v.notesRu) + "</textarea></label>" +
                '<label class="field"><span>' + esc(T("au.wiz.notes.en")) + '</span><textarea class="textarea" id="edit-en" maxlength="1000">' + esc(v.notesEn) + "</textarea></label>" +
                '<div class="row-actions"><button class="btn btn-primary btn-sm" data-act="save-notes" data-key="' + esc(key) + '">' + esc(T("au.save")) + '</button><button class="btn btn-sm" data-act="cancel-notes">' + esc(T("au.cancel")) + '</button><span class="hint">' + esc(T("au.v.notesNoReview")) + "</span></div></div>";
        } else {
            notes =
                (v.notesRu || v.notesEn
                    ? (v.notesRu ? '<div class="notes"><span class="lang">RU</span>' + ph(v.notesRu, v.ph) + "</div>" : "") + (v.notesEn ? '<div class="notes" style="margin-top:4px"><span class="lang">EN</span>' + ph(v.notesEn, v.ph) + "</div>" : "")
                    : '<p class="faint">' + esc(T("au.v.noNotes")) + "</p>") +
                '<button class="btn btn-link btn-sm" style="margin-top:4px;padding-left:0" data-act="edit-notes" data-key="' + esc(key) + '">' + icon("pencil", "sm") + esc(T("au.v.editNotes")) + "</button>";
        }
        var prev = w.versions[i + 1];
        var changes = renderChanges(w, v, prev);
        var status = v.state === "approved" && !v.thread.length ? "" : '<div style="grid-column:1/-1">' + renderStatusBlock(w, v) + "</div>";
        return (
            (v.rereleaseOf ? '<p class="dim small" style="margin-bottom:6px">' + icon("undo", "sm") + " " + esc(T("au.v.rereleaseOf", { v: v.rereleaseOf })) + "</p>" : "") +
            '<div class="vx"><div><h4>' + esc(T("au.col.notes")) + "</h4>" + notes + "</div>" +
            "<div><h4>" + esc(T("au.v.checks")) + '</h4><div class="ladder-row">' + ladder(v) + "</div>" +
            '<h4 style="margin-top:10px">' + esc(T("au.v.changes")) + "</h4>" + changes + "</div>" +
            status + "</div>"
        );
    }
    function renderChanges(w, v, prev) {
        var items = [];
        if (!prev && !w.everApproved) items.push('<li><span class="dim">' + esc(T("au.v.firstVersion")) + "</span></li>");
        if (v.added && v.added.egress)
            v.added.egress.forEach(function (h) {
                items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.host")) + ' <span class="mono ph">' + esc(h) + "</span></span></li>");
            });
        if (v.removed && v.removed.egress)
            v.removed.egress.forEach(function (h) {
                items.push('<li><span class="minus">−</span><span>' + esc(T("au.diff.hostRemoved")) + ' <span class="mono">' + esc(h) + "</span></span></li>");
            });
        if (v.permissions && v.permissions.indexOf("trading") >= 0) items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.perm")) + " «" + esc(scopeLabel("trading")) + "»</span></li>");
        if (v.minColibri && (!prev || prev.minColibri !== v.minColibri)) items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.minColibri", { v: v.minColibri })) + "</span></li>");
        if (!items.length) items.push('<li><span class="same">' + icon("check", "sm") + "</span><span>" + esc(T("au.diff.codeOnly")) + "</span></li>");
        return '<ul class="chg">' + items.join("") + "</ul>";
    }

    /* ---------- listing ---------- */
    /* The form's unsaved text lives in a draft, so a re-render — a feature added, a picture uploaded —
       never eats what is being typed. Pictures are not part of it: each upload, removal or move applies
       at once, the way the icon does, and the draft stays as it was. */
    var LANGS = ["ru", "en", "uk", "kk", "tr", "zh", "es", "de"];
    var ARTS = ["table", "alert", "window", "chart"];
    function freshDraft(w) {
        var p = pageOf(w);
        return {
            id: w.id,
            name: w.name,
            category: w.category || "",
            tags: w.tags.join(", "),
            descRu: w.descRu || "",
            descEn: w.descEn || "",
            aboutRu: p.aboutRu || "",
            aboutEn: p.aboutEn || "",
            features: p.features.map(function (f) {
                return { titleRu: f.titleRu || "", titleEn: f.titleEn || "", bodyRu: f.bodyRu || "", bodyEn: f.bodyEn || "" };
            }),
            video: p.video || "",
            links: LINKS.reduce(function (o, k) {
                o[k] = p.links[k] || "";
                return o;
            }, {}),
            languages: p.languages.slice()
        };
    }
    function draftOf(w) {
        if (!S.ld || S.ld.id !== w.id) S.ld = freshDraft(w);
        return S.ld;
    }
    function draftDirty(w) {
        return !!S.ld && S.ld.id === w.id && JSON.stringify(S.ld) !== JSON.stringify(freshDraft(w));
    }
    function syncDirty(w) {
        var el = document.getElementById("lp-dirty");
        if (el && w) el.hidden = !draftDirty(w);
    }
    function splitTags(s) {
        return String(s || "")
            .split(",")
            .map(function (t) {
                return t.trim();
            })
            .filter(Boolean);
    }
    /* the registry's link rule, said as the author types: https, no credentials, short, and the two
       channels pinned to their hosts */
    var LINK_HOSTS = { telegram: /^(t\.me|telegram\.me)$/, youtube: /^((www\.|m\.)?youtube\.com|youtu\.be)$/ };
    function linkProblem(kind, v) {
        if (!v) return null;
        var u;
        try {
            u = new URL(v);
        } catch (e) {
            return T("au.lp.err.url");
        }
        if (u.protocol !== "https:") return T("au.lp.err.https");
        if (u.username || u.password) return T("au.lp.err.creds");
        if (v.length > 200) return T("au.lp.err.long");
        if (LINK_HOSTS[kind] && !LINK_HOSTS[kind].test(u.hostname)) return T("au.lp.err.host." + kind);
        return null;
    }
    function videoProblem(v) {
        if (!v) return null;
        return linkProblem("video", v) || (/^https:\/\/((www\.|m\.)?youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{11}([?&#].*)?$/.test(v) ? null : T("au.lp.err.video"));
    }
    function hostOf(url) {
        try {
            return new URL(url).hostname.replace(/^www\./, "");
        } catch (e) {
            return url;
        }
    }
    /* The long text's whole grammar: headings, bullets and paragraphs. Nothing else is markup — a link
       or an image in it is shown as the text it is. */
    function mdBlocks(text) {
        var out = [];
        var list = null;
        String(text || "")
            .split("\n")
            .forEach(function (raw) {
                var line = raw.trim();
                var m;
                if (!line) list = null;
                else if ((m = /^#{1,3}\s+(.*)$/.exec(line))) {
                    list = null;
                    out.push({ k: "h", t: m[1] });
                } else if ((m = /^[-*]\s+(.*)$/.exec(line))) {
                    if (!list) out.push((list = { k: "ul", items: [] }));
                    list.items.push(m[1]);
                } else {
                    list = null;
                    out.push({ k: "p", t: line });
                }
            });
        return out;
    }
    function mdHtml(text) {
        return mdBlocks(text)
            .map(function (b) {
                if (b.k === "h") return "<h4>" + esc(b.t) + "</h4>";
                if (b.k === "ul")
                    return "<ul>" + b.items.map(function (i) {
                        return "<li>" + esc(i) + "</li>";
                    }).join("") + "</ul>";
                return "<p>" + esc(b.t) + "</p>";
            })
            .join("");
    }
    /* pictures are drawn, not files: a reviewer sees where they go and how they sit, not a real widget */
    function shotArt(art) {
        var rows = "";
        for (var i = 0; i < 6; i++) rows += '<i class="r"><b></b><b class="' + (i % 3 === 1 ? "neg" : "pos") + '" style="width:' + (72 - i * 9) + '%"></b></i>';
        if (art === "alert") return '<div class="art art-table art-dim">' + rows + '<div class="art-pop">' + icon("bell", "sm") + "<i></i><i></i></div></div>";
        if (art === "window") return '<div class="art art-window"><div class="art-bar"><i></i><i></i><i></i></div><div class="art-table">' + rows + "</div></div>";
        if (art === "chart") {
            var bars = "";
            for (var j = 0; j < 12; j++) bars += '<i style="height:' + (18 + ((j * 37) % 72)) + '%"></i>';
            return '<div class="art art-chart">' + bars + "</div>";
        }
        return '<div class="art art-table">' + rows + "</div>";
    }
    function coverArt(w, name) {
        return '<div class="cover-art" style="--c:' + esc(w.color || "#4a6b8a") + '">' + wicon(w, true) + "<b>" + esc(name || w.name) + "</b></div>";
    }
    function cardPreview(w, d) {
        return (
            '<div class="preview-row">' + wicon(w) +
            '<div style="min-width:0"><div class="t">' + esc(d.name || w.name) + ' <span class="dim small" style="font-weight:400">' + esc(D.author.name) + '</span></div><div class="d">' + esc(d.descRu || T("au.listing.noDesc")) + "</div></div>" +
            '<span class="btn btn-sm btn-fetch">' + esc(T("au.install")) + "</span></div>"
        );
    }
    function featureRow(w, f, i) {
        var data = ' data-id="' + esc(w.id) + '" data-i="' + i + '"';
        return (
            '<div class="lp-feature"><span class="lp-feature-no">' + (i + 1) + '</span><div class="lp-feature-grid">' +
            '<input class="input" data-ldf="' + i + ':titleRu" maxlength="60" placeholder="' + esc(T("au.lp.featureTitle", { lang: "RU" })) + '" value="' + esc(f.titleRu) + '"/>' +
            '<input class="input" data-ldf="' + i + ':titleEn" maxlength="60" placeholder="' + esc(T("au.lp.featureTitle", { lang: "EN" })) + '" value="' + esc(f.titleEn) + '"/>' +
            '<textarea class="textarea" data-ldf="' + i + ':bodyRu" maxlength="280" placeholder="' + esc(T("au.lp.featureBody", { lang: "RU" })) + '">' + esc(f.bodyRu) + "</textarea>" +
            '<textarea class="textarea" data-ldf="' + i + ':bodyEn" maxlength="280" placeholder="' + esc(T("au.lp.featureBody", { lang: "EN" })) + '">' + esc(f.bodyEn) + "</textarea>" +
            '</div><div class="lp-tools lp-tools-col">' +
            '<button class="btn btn-icon btn-sm" data-act="lp-feature-up"' + data + (i === 0 ? " disabled" : "") + ' title="' + esc(T("au.lp.featureUp")) + '">' + icon("arrow-up", "sm") + "</button>" +
            '<button class="btn btn-icon btn-sm" data-act="lp-feature-remove"' + data + ' title="' + esc(T("au.lp.featureRemove")) + '">' + icon("x", "sm") + "</button>" +
            "</div></div>"
        );
    }
    function packageCard(w) {
        var c = current(w);
        var live = w.live || (w.code ? { permissions: w.code.permissions, egress: w.code.egress } : null);
        return (
            '<div class="card"><h2 class="sec">' + esc(T("au.lp.package")) + '</h2><dl class="summary-kv lp-kv">' +
            "<dt>" + esc(T("au.lp.pkg.version")) + "</dt><dd>" + (c ? '<span class="mono">' + esc(c.v) + "</span>" : "—") + "</dd>" +
            (w.sizeBytes ? "<dt>" + esc(T("au.lp.pkg.size")) + "</dt><dd>" + esc(fmtBytes(w.sizeBytes)) + "</dd>" : "") +
            "<dt>" + esc(T("au.lp.pkg.perms")) + "</dt><dd>" + (live && live.permissions.length ? live.permissions.map(function (p) {
                return esc(scopeLabel(p));
            }).join("<br/>") : "—") + "</dd>" +
            "<dt>" + esc(T("au.lp.pkg.hosts")) + '</dt><dd class="mono small">' + (live && live.egress.length ? live.egress.map(esc).join("<br/>") : "—") + "</dd>" +
            '</dl><p class="hint" style="margin-top:6px">' + esc(T("au.lp.pkgHint")) + "</p></div>"
        );
    }
    function renderListing(w) {
        var d = draftOf(w);
        var p = pageOf(w);
        var idAttr = ' data-id="' + esc(w.id) + '"';
        var catalogStanding = w.everApproved && w.visibility === "catalog";
        var cats = ["", "alerts", "analytics", "market-data", "trading", "portfolio", "research", "productivity", "other"];
        var c = current(w);
        var basics =
            '<div class="card"><h2 class="sec"><span class="lp-no">01</span>' + esc(T("au.lp.basics")) + '</h2><div class="form-grid">' +
            "<label>" + esc(T("au.listing.name")) + '</label><div class="ctl"><input class="input" data-ld="name" value="' + esc(d.name) + '" maxlength="80"/>' + (catalogStanding ? '<span class="hint">' + esc(T("au.listing.nameReview")) + "</span>" : "") + "</div>" +
            "<label>" + esc(T("au.listing.icon")) + '</label><div class="ctl"><div class="row-actions">' + wicon(w) + '<button class="btn btn-sm" data-act="choose-icon"' + idAttr + ">" + esc(T("au.listing.chooseIcon")) + '</button><span class="hint">' + esc(T("au.listing.iconHint")) + "</span></div></div>" +
            "<label>" + esc(T("au.lp.version")) + '</label><div class="ctl"><div class="ro">' + (c ? '<span class="mono">' + esc(c.v) + "</span>" : "—") + ' <span class="hint">' + esc(T("au.lp.versionHint")) + "</span></div></div>" +
            "<label>" + esc(T("au.listing.category")) + '</label><div class="ctl"><select class="select" data-ld="category">' +
            cats
                .map(function (k) {
                    return '<option value="' + k + '"' + (d.category === k ? " selected" : "") + ">" + esc(k ? catLabel(k) : T("au.listing.chooseLater")) + "</option>";
                })
                .join("") +
            "</select></div>" +
            "<label>" + esc(T("au.listing.tags")) + '</label><div class="ctl"><input class="input" data-ld="tags" value="' + esc(d.tags) + '"/><span class="hint">' + esc(T("au.listing.tagsHint")) + "</span></div>" +
            "<label>" + esc(T("au.lp.languages")) + '</label><div class="ctl"><div class="lp-langs">' +
            LANGS.map(function (l) {
                return '<button type="button" class="lang-chip" data-act="lp-lang"' + idAttr + ' data-v="' + l + '" aria-pressed="' + (d.languages.indexOf(l) >= 0) + '">' + l.toUpperCase() + "</button>";
            }).join("") +
            '</div><span class="hint">' + esc(T("au.lp.languagesHint")) + "</span></div>" +
            "<label>" + esc(T("au.listing.descRu")) + '</label><div class="ctl"><textarea class="textarea" data-ld="descRu" maxlength="400" data-count="400">' + esc(d.descRu) + '</textarea><span class="counter">' + d.descRu.length + " / 400</span></div>" +
            "<label>" + esc(T("au.listing.descEn")) + '</label><div class="ctl"><textarea class="textarea" data-ld="descEn" maxlength="400" data-count="400">' + esc(d.descEn) + '</textarea><span class="counter">' + d.descEn.length + " / 400</span></div>" +
            '<span></span><span class="hint">' + esc(T("au.lp.shortHint")) + "</span>" +
            "</div></div>";
        var about =
            '<div class="card"><h2 class="sec"><span class="lp-no">02</span>' + esc(T("au.lp.about")) + "</h2>" +
            '<p class="hint" style="margin-bottom:8px">' + esc(T("au.lp.aboutHint")) + "</p>" +
            '<label class="field"><span>' + esc(T("au.lp.aboutRu")) + '</span><textarea class="textarea lp-long" data-ld="aboutRu" maxlength="4000" data-count="4000">' + esc(d.aboutRu) + '</textarea><span class="counter">' + d.aboutRu.length + " / 4000</span></label>" +
            '<label class="field" style="margin-top:8px"><span>' + esc(T("au.lp.aboutEn")) + '</span><textarea class="textarea lp-long" data-ld="aboutEn" maxlength="4000" data-count="4000">' + esc(d.aboutEn) + '</textarea><span class="counter">' + d.aboutEn.length + " / 4000</span></label>" +
            '<h3 class="lp-sub">' + esc(T("au.lp.features")) + ' <span class="dim small">' + d.features.length + " / 6</span></h3>" +
            '<p class="hint" style="margin-bottom:6px">' + esc(T("au.lp.featuresHint")) + "</p>" +
            d.features.map(function (f, i) {
                return featureRow(w, f, i);
            }).join("") +
            (d.features.length < 6 ? '<button class="btn btn-sm" data-act="lp-feature-add"' + idAttr + ">" + icon("plus", "sm") + esc(T("au.lp.featureAdd")) + "</button>" : '<p class="hint">' + esc(T("au.lp.featuresFull")) + "</p>") +
            "</div>";
        var shots = p.shots
            .map(function (s, i) {
                var data = idAttr + ' data-i="' + i + '"';
                return (
                    '<div class="lp-shot"><div class="shot">' + shotArt(s.art) + '</div><div class="lp-tools">' +
                    '<span class="dim small">' + (i + 1) + '</span><span class="grow"></span>' +
                    '<button class="btn btn-icon btn-sm" data-act="lp-shot-move"' + data + ' data-d="-1"' + (i === 0 ? " disabled" : "") + ' title="' + esc(T("au.lp.shotLeft")) + '">' + icon("arrow-left", "sm") + "</button>" +
                    '<button class="btn btn-icon btn-sm" data-act="lp-shot-move"' + data + ' data-d="1"' + (i === p.shots.length - 1 ? " disabled" : "") + ' title="' + esc(T("au.lp.shotRight")) + '">' + icon("arrow-right", "sm") + "</button>" +
                    '<button class="btn btn-icon btn-sm" data-act="lp-shot-remove"' + data + ' title="' + esc(T("au.lp.shotRemove")) + '">' + icon("trash", "sm") + "</button></div></div>"
                );
            })
            .join("");
        var vp = videoProblem(d.video);
        var media =
            '<div class="card"><h2 class="sec"><span class="lp-no">03</span>' + esc(T("au.lp.media")) + "</h2>" +
            '<p class="hint" style="margin-bottom:8px">' + esc(T(catalogStanding ? "au.lp.mediaHintCatalog" : "au.lp.mediaHint")) + "</p>" +
            '<h3 class="lp-sub" style="margin-top:0">' + esc(T("au.lp.shots")) + ' <span class="dim small">' + p.shots.length + " / 5</span></h3>" +
            '<div class="lp-shots">' + shots + (p.shots.length < 5 ? '<button class="lp-add" data-act="lp-shot-add"' + idAttr + ">" + icon("image") + "<span>" + esc(T("au.lp.shotAdd")) + "</span></button>" : "") + "</div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.lp.shotRule")) + "</p>" +
            (S.lpErr ? '<p class="err">' + esc(S.lpErr) + "</p>" : "") +
            '<div class="mock-examples">' + esc(T("au.lp.examples")) + ' <button class="btn btn-link btn-sm" data-act="lp-shot-bad"' + idAttr + ' data-why="format">' + esc(T("au.lp.example.gif")) + '</button> <button class="btn btn-link btn-sm" data-act="lp-shot-bad"' + idAttr + ' data-why="size">' + esc(T("au.lp.example.big")) + "</button></div>" +
            '<h3 class="lp-sub">' + esc(T("au.lp.cover")) + "</h3>" +
            (p.cover
                ? '<div class="lp-cover">' + coverArt(w, d.name) + '<div class="row-actions" style="margin-top:6px"><button class="btn btn-sm" data-act="lp-cover-set"' + idAttr + ">" + esc(T("au.lp.coverReplace")) + '</button><button class="btn btn-sm" data-act="lp-cover-remove"' + idAttr + ">" + esc(T("au.lp.coverRemove")) + "</button></div></div>"
                : '<button class="lp-add lp-add-cover" data-act="lp-cover-set"' + idAttr + ">" + icon("image") + "<span>" + esc(T("au.lp.coverAdd")) + "</span></button>") +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.lp.coverRule")) + "</p>" +
            '<h3 class="lp-sub">' + esc(T("au.lp.video")) + "</h3>" +
            '<div class="ctl lp-ctl"><input class="input" data-ld="video" data-link="video" placeholder="https://www.youtube.com/watch?v=…" value="' + esc(d.video) + '"/>' +
            '<span class="err" data-err-for="video"' + (vp ? "" : " hidden") + ">" + esc(vp || "") + '</span><span class="hint">' + esc(T("au.lp.videoHint")) + "</span></div>" +
            "</div>";
        var links =
            '<div class="card"><h2 class="sec"><span class="lp-no">04</span>' + esc(T("au.lp.links")) + '</h2><div class="form-grid">' +
            LINKS.map(function (k) {
                var prob = linkProblem(k, d.links[k]);
                return (
                    "<label>" + esc(T("au.lp.link." + k)) + '</label><div class="ctl"><input class="input" data-ld="link:' + k + '" data-link="' + k + '" placeholder="' + esc(T("au.lp.link." + k + ".ph")) + '" value="' + esc(d.links[k]) + '"/>' +
                    '<span class="err" data-err-for="' + k + '"' + (prob ? "" : " hidden") + ">" + esc(prob || "") + "</span></div>"
                );
            }).join("") +
            '</div><p class="hint" style="margin-top:6px">' + esc(T("au.lp.linksHint")) + "</p></div>";
        var save =
            '<div class="lp-save"><span class="lp-dirty" id="lp-dirty"' + (draftDirty(w) ? "" : " hidden") + ">" + icon("pencil", "sm") + " " + esc(T("au.lp.unsaved")) + '</span><span class="grow"></span>' +
            '<button class="btn" data-act="revert-listing"' + idAttr + ">" + esc(T("au.listing.revert")) + '</button><button class="btn btn-primary" data-act="save-listing"' + idAttr + ">" + esc(T("au.save")) + "</button></div>";
        var side =
            '<div class="card"><h2 class="sec">' + esc(T("au.listing.preview")) + '</h2><div id="lp-card">' + cardPreview(w, d) + "</div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.listing.previewHint")) + "</p>" +
            '<button class="btn" style="margin-top:8px" data-act="lp-preview"' + idAttr + ">" + icon("eye") + esc(T("au.lp.pagePreview")) + "</button></div>" +
            packageCard(w);
        return (
            '<div class="banner banner-info">' + icon("info") + '<div class="banner-body">' + esc(T("au.listing.hint")) + "</div></div>" +
            '<div class="grid-2"><div class="stack">' + basics + about + media + links + save + '</div><div class="stack lp-side">' + side + "</div></div>"
        );
    }

    /* ---------- the widget's page, as a user sees it ---------- */
    /* One renderer for the author's preview (the unsaved draft) and the user's page (what is saved):
       anything absent renders as nothing, never as an empty box. */
    function savedView(w) {
        var p = pageOf(w);
        return { name: w.name, category: w.category, tags: w.tags, descRu: w.descRu, aboutRu: p.aboutRu || "", features: p.features, video: p.video || "", links: p.links, languages: p.languages };
    }
    function draftView(w) {
        var d = draftOf(w);
        return { name: d.name, category: d.category, tags: splitTags(d.tags), descRu: d.descRu, aboutRu: d.aboutRu, features: d.features, video: videoProblem(d.video) ? "" : d.video, links: d.links, languages: d.languages };
    }
    var LINK_ICON = { website: "globe", docs: "template", support: "message", terms: "shield", telegram: "send", youtube: "play" };
    function renderPage(w, v) {
        var p = pageOf(w);
        var c = current(w);
        var sel = Math.min(S.pg.shot, Math.max(0, p.shots.length - 1));
        var hero =
            (p.cover ? '<div class="pg-cover">' + coverArt(w, v.name) + "</div>" : "") +
            '<div class="pg-hero">' + wicon(w, true) +
            '<div style="min-width:0"><h2>' + esc(v.name) + (c ? ' <span class="by mono">' + esc(c.v) + "</span>" : "") + '</h2><span class="dim small">' + esc(D.author.name) + (v.category ? " · " + esc(catLabel(v.category)) : "") + "</span>" +
            (v.tags.length ? '<div class="pg-tags">' + v.tags.map(function (t) {
                return '<span class="chip">' + esc(t) + "</span>";
            }).join("") + "</div>" : "") +
            '</div><span class="btn btn-fetch">' + esc(T("au.install")) + "</span></div>" +
            (v.descRu ? '<p class="pg-short">' + esc(v.descRu) + "</p>" : "");
        var gallery = "";
        if (p.shots.length || v.video) {
            var thumbs =
                p.shots.map(function (s, i) {
                    return '<button class="pg-thumb' + (i === sel ? " on" : "") + '" data-act="pg-shot" data-i="' + i + '" title="' + esc(T("au.pg.shotN", { n: i + 1 })) + '"><div class="shot">' + shotArt(s.art) + "</div></button>";
                }).join("") +
                (v.video ? '<button class="pg-thumb pg-video" data-act="pg-video" title="' + esc(v.video) + '">' + icon("play") + "<span>" + esc(T("au.pg.video")) + "</span></button>" : "");
            gallery =
                '<div class="pg-gallery">' +
                (p.shots.length ? '<div class="shot pg-big">' + shotArt(p.shots[sel].art) + '<span class="pg-count">' + (sel + 1) + " / " + p.shots.length + "</span></div>" : "") +
                '<div class="pg-thumbs">' + thumbs + "</div></div>";
        }
        var about = v.aboutRu
            ? '<section class="pg-sec"><h3>' + esc(T("au.pg.about")) + '</h3><div class="pg-about' + (S.pg.aboutOpen ? " open" : "") + '">' + mdHtml(v.aboutRu) + "</div>" +
              '<button class="btn btn-link btn-sm pg-more" data-act="pg-about">' + esc(T(S.pg.aboutOpen ? "au.pg.less" : "au.pg.more")) + "</button></section>"
            : "";
        var feats = v.features.filter(function (f) {
            return f.titleRu || f.bodyRu;
        });
        var features = feats.length
            ? '<section class="pg-sec"><h3>' + esc(T("au.pg.features")) + '</h3><div class="pg-features">' + feats.map(function (f) {
                  return '<div class="pg-feature"><b>' + esc(f.titleRu) + "</b><p>" + esc(f.bodyRu) + "</p></div>";
              }).join("") + "</div></section>"
            : "";
        var links = LINKS.filter(function (k) {
            return v.links[k] && !linkProblem(k, v.links[k]);
        }).map(function (k) {
            return '<a href="#" class="pg-link" data-act="pg-link" title="' + esc(v.links[k]) + '">' + icon(LINK_ICON[k], "sm") + "<span>" + esc(T("au.lp.link." + k)) + "</span><small>" + esc(hostOf(v.links[k])) + "</small></a>";
        }).join("");
        var live = w.live || (w.code ? { permissions: w.code.permissions, egress: w.code.egress } : { permissions: [], egress: [] });
        var aside =
            (links ? '<div class="pg-box"><h4>' + esc(T("au.pg.links")) + "</h4>" + links + "</div>" : "") +
            (v.languages.length ? '<div class="pg-box"><h4>' + esc(T("au.pg.languages")) + '</h4><div class="pg-tags">' + v.languages.map(function (l) {
                return '<span class="chip">' + esc(l.toUpperCase()) + "</span>";
            }).join("") + "</div></div>" : "") +
            '<div class="pg-box"><h4>' + esc(T("au.pg.access")) + "</h4>" +
            (live.permissions.length ? '<ul class="pg-perms">' + live.permissions.map(function (x) {
                return "<li>" + esc(scopeLabel(x)) + "</li>";
            }).join("") + "</ul>" : '<p class="dim small">—</p>') +
            (live.egress.length ? '<p class="dim small" style="margin-top:4px">' + esc(T("au.pg.hosts", { n: live.egress.length })) + "</p>" : "") +
            "</div>";
        return '<div class="pg">' + hero + '<div class="pg-cols"><div class="pg-col">' + gallery + about + features + '</div><aside class="pg-aside">' + aside + "</aside></div></div>";
    }
    function pageDialog(w, fromDraft) {
        S.dlg = "page";
        S.pg = { shot: 0, aboutOpen: false };
        S.pgFor = { id: w.id, draft: fromDraft };
        drawPage();
    }
    function drawPage() {
        var w = find(S.pgFor.id);
        if (!w) return closeDialog();
        var v = S.pgFor.draft ? draftView(w) : savedView(w);
        openDialog(
            "page",
            dlgHead(T(S.pgFor.draft ? "au.pg.previewTitle" : "au.pg.title")) +
                (S.pgFor.draft ? '<div class="banner banner-info" style="margin-bottom:10px">' + icon("eye") + '<div class="banner-body">' + esc(T("au.pg.previewBanner")) + "</div></div>" : "") +
                renderPage(w, v)
        );
    }

    /* ---------- code ---------- */
    function renderCode(w) {
        if (linked(w)) {
            var c = w.code;
            var legacy = legacyFields(w);
            var fields = legacy ? legacy.join(", ") : "";
            return (
                createdBanner(w) +
                (legacy
                    ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body"><b>' + esc(T("au.code.legacy.title", { fields: fields })) + "</b> " + esc(T("au.code.legacy.body")) + "</div>" + legacyRemoveBtn(w) + "</div>"
                    : "") +
                '<div class="card"><h2 class="sec">' + esc(T("au.code.linked")) + "</h2>" +
                '<dl class="summary-kv"><dt>' + esc(T("au.code.folder")) + '</dt><dd><a href="#" class="path ph" data-toast="au.toast.folder">' + esc(c.path) + "</a></dd>" +
                "<dt>widget.json</dt><dd>" + '<span class="chip chip-ok">' + icon("check") + esc(T("au.code.idMatches")) + "</span>" +
                (legacy ? ' <span class="chip chip-warn">' + icon("warn") + esc(T("au.code.legacy.chip", { fields: fields })) + "</span>" : "") + "</dd>" +
                "<dt>" + esc(T("au.code.version")) + '</dt><dd class="mono">' + esc(c.manifestVersion) + "</dd>" +
                "<dt>" + esc(T("au.code.changed")) + '</dt><dd class="ph">' + fmtDT(c.changedAt) + "</dd></dl>" +
                '<div class="row-actions"><button class="switch" role="switch" aria-checked="' + !!c.hot + '" data-act="hot" data-id="' + esc(w.id) + '"><i></i>' + esc(T("au.code.hot")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.reloaded">' + icon("refresh") + esc(T("au.code.reload")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.openedPanel">' + icon("panel") + esc(T("au.openPanel")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.openedWindow">' + icon("window") + esc(T("au.openWindow")) + "</button>" +
                '<button class="btn btn-sm btn-link" data-act="unlink" data-id="' + esc(w.id) + '">' + esc(T("au.code.unlink")) + "</button></div>" +
                '<p class="hint" style="margin-top:8px">' + esc(T("au.code.linkedHint")) + "</p>" +
                (c.nodeRoot ? nextStepBlock(c) : "") +
                "</div>"
            );
        }
        var warn = mismatch(w)
            ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body"><b>' + esc(T("au.code.mismatch.title")) + "</b> " + esc(T("au.code.mismatch.body", { path: w.code.path, id: w.code.manifestId })) + "</div></div>"
            : "";
        if (S.st && S.st.id === w.id) return warn + renderStarterForm(w);
        return (
            warn +
            '<p class="lede" style="margin-bottom:10px">' + esc(T("au.code.lede")) + "</p>" +
            '<div class="choices">' +
            '<div class="choice">' + icon("folder", "lg") + "<b>" + esc(T("au.code.folderChoice")) + "</b><p>" + esc(T("au.code.folderChoiceBody")) + '</p><button class="btn btn-primary" data-act="link-folder" data-id="' + esc(w.id) + '">' + esc(T("au.code.pickFolder")) + "</button></div>" +
            '<div class="choice">' + icon("template", "lg") + "<b>" + esc(T("au.code.template")) + "</b><p>" + esc(T("au.code.templateBody")) + '</p><button class="btn" data-act="st-open" data-id="' + esc(w.id) + '">' + esc(T("au.code.pickTemplate")) + "</button></div>" +
            '<div class="choice later">' + icon("globe", "lg") + "<b>" + esc(T("au.code.hosted")) + later() + "</b><p>" + esc(T("au.code.hostedBody")) + '</p><button class="btn" data-toast="au.toast.later">' + esc(T("au.code.enterUrl")) + "</button></div>" +
            "</div>"
        );
    }

    /* ---------- code: a project from a starter ----------
       The terminal downloads the chosen starter from the SDK's release, checks its hash, writes this
       widget's ID into every widget.json, creates <folder>\<ID> and links the served subfolder the way
       «Папка с проектом» does. A draft with no versions may take another ID: the form seeds one from
       the name, the registry renames the draft only after the download worked, so a failure before
       that changes nothing anywhere. */
    var ST_CASES = ["ok", "offline", "none", "newer", "exists", "taken"];
    var LATIN = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
    function deriveId(name) {
        var out = "";
        String(name || "")
            .trim()
            .toLowerCase()
            .split("")
            .forEach(function (ch) {
                if (LATIN[ch] !== undefined) out += LATIN[ch];
                else if (/[a-z0-9]/.test(ch)) out += ch;
                else if (out && out[out.length - 1] !== "-") out += "-";
            });
        out = out.replace(/^-+|-+$/g, "").slice(0, 40).replace(/-+$/, "");
        return out || "my-widget";
    }
    function isPlaceholderId(id) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);
    }
    function stIdEditable(w) {
        return !w.everApproved && !w.versions.length;
    }
    function stIdOk(id) {
        return /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(id);
    }
    function stTarget() {
        return S.st.parent + "\\" + (S.st.idValue.trim() || "…");
    }
    function stStarter() {
        return D.starters.filter(function (s) {
            return s.key === S.st.key;
        })[0];
    }
    function openStarter(w) {
        S.st = {
            id: w.id,
            key: D.starters[0].key,
            idValue: stIdEditable(w) && isPlaceholderId(w.id) ? deriveId(w.name) : w.id,
            parent: D.starterParent,
            steps: [],
            busy: false,
            canCancel: false,
            error: null,
            timer: null
        };
        render();
    }
    function renderStarterForm(w) {
        var st = S.st;
        var head = '<div class="card"><h2 class="sec">' + esc(T("au.st.title")) + '</h2><p class="hint" style="margin-bottom:10px">' + esc(T("au.st.hint")) + "</p>";
        var load = { offline: "au.st.offline", none: "au.st.unavailable", newer: "au.st.newer" }[S.starters];
        if (load) {
            return (
                head +
                '<div class="banner ' + (S.starters === "newer" ? "banner-info" : "banner-warn") + '">' + icon(S.starters === "newer" ? "info" : "warn") + '<div class="banner-body">' + esc(T(load)) + "</div></div>" +
                '<div class="st-actions"><button class="btn" data-act="st-sdk">' + esc(T("au.st.openSdk")) + "</button>" +
                (S.starters === "offline" ? '<button class="btn" data-act="st-retry">' + icon("refresh") + esc(T("au.st.retry")) + "</button>" : "") +
                '<button class="btn" data-act="st-cancel">' + esc(T("au.cancel")) + "</button></div></div>"
            );
        }
        var dis = st.busy ? " disabled" : "";
        var tiles = D.starters
            .map(function (s) {
                return (
                    '<label class="radio st-tile"><input type="radio" name="st-key" data-act="st-key" value="' + esc(s.key) + '"' + (st.key === s.key ? " checked" : "") + dis + "/>" +
                    "<div><b>" + esc(s.title) + ' <span class="chip ' + (s.node ? "chip-info" : "chip-ok") + '">' + esc(T(s.node ? "au.st.node" : "au.st.noBuild")) + "</span></b><span>" + esc(s.desc) + "</span></div></label>"
                );
            })
            .join("");
        var idCtl = stIdEditable(w)
            ? '<input class="input mono" id="st-id" maxlength="40" value="' + esc(st.idValue) + '"' + dis + '/><span class="hint">' + esc(T("au.st.idHint")) + "</span>"
            : '<div class="ro mono">' + esc(w.id) + '</div><span class="hint">' + esc(T("au.st.idLocked")) + "</span>";
        var steps = st.steps.length
            ? '<ol class="st-steps">' +
              st.steps
                  .map(function (s) {
                      return '<li class="' + s.state + '">' + (s.state === "done" ? icon("check", "sm") : s.state === "now" ? '<span class="st-spin"></span>' : icon("x", "sm")) + esc(T("au.st.step." + s.key)) + "</li>";
                  })
                  .join("") +
              "</ol>"
            : "";
        return (
            head +
            '<div class="st-tiles">' + tiles + "</div>" +
            '<div class="form-grid" style="margin-top:12px">' +
            '<label for="st-id">' + esc(T("au.st.id")) + '</label><div class="ctl">' + idCtl + "</div>" +
            "<label>" + esc(T("au.st.folder")) + '</label><div class="ctl"><div class="row-actions"><span class="path ph">' + esc(st.parent) + '</span><button class="btn btn-sm" data-act="st-parent"' + dis + ">" + esc(T("au.st.change")) + "</button></div>" +
            '<span class="hint" id="st-target">' + esc(T("au.st.target", { path: stTarget() })) + "</span></div></div>" +
            steps +
            '<p class="err" id="st-err"' + (st.error ? "" : " hidden") + ">" + esc(st.error || "") + "</p>" +
            '<div class="st-actions"><button class="btn" data-act="st-cancel"' + (st.busy && !st.canCancel ? " disabled" : "") + ">" + esc(T("au.cancel")) + "</button>" +
            '<button class="btn btn-primary" data-act="st-create"' + dis + ">" + esc(T("au.st.create")) + "</button></div></div>"
        );
    }
    /* the steps run on timers, as the download would; Cancel works until the registry is asked */
    function createFromStarter(w) {
        var st = S.st;
        var id = stIdEditable(w) ? st.idValue.trim() : w.id;
        st.error = null;
        st.steps = [];
        if (!stIdOk(id)) {
            st.error = T("au.st.idBad");
            return render();
        }
        /* the folder is checked before anything is downloaded */
        if (S.starters === "exists") {
            st.error = T("au.st.exists", { path: stTarget() });
            return render();
        }
        var renames = id !== w.id;
        var plan = ["download", "unpack"].concat(renames ? ["rename"] : []).concat(["load"]);
        st.busy = true;
        function next(i) {
            if (S.st !== st) return;
            if (i > 0) st.steps[i - 1].state = "done";
            if (i === plan.length) return finish();
            var key = plan[i];
            st.steps.push({ key: key, state: "now" });
            st.canCancel = key === "download" || key === "unpack";
            if (key === "rename" && S.starters === "taken") {
                st.timer = setTimeout(function () {
                    /* the registry said no: the unpacked copy is thrown away, nothing was created */
                    st.steps[i].state = "failed";
                    st.busy = false;
                    st.error = T("au.st.idTaken", { id: id });
                    render();
                }, 700);
                return render();
            }
            st.timer = setTimeout(function () {
                next(i + 1);
            }, key === "download" ? 1100 : 700);
            render();
        }
        function finish() {
            var s = stStarter();
            var root = st.parent + "\\" + id;
            if (renames) w.id = id;
            w.code = {
                path: root + "\\" + s.serve,
                manifestId: id,
                manifestVersion: "1.0.0",
                changedAt: D.NOW,
                hot: true,
                permissions: s.key === "trading" ? ["marketData", "account:read", "trading", "storage"] : ["marketData", "storage"],
                egress: [],
                nodeRoot: s.node ? root : null
            };
            S.st = null;
            S.stDone = { id: id, path: root, edit: s.edit, node: s.node };
            go("#/w/" + encodeURIComponent(id) + "/code");
            window.NEST.toast(T("au.toast.openedWindow"));
        }
        next(0);
    }
    function cancelStarter() {
        if (S.st && S.st.timer) clearTimeout(S.st.timer);
        S.st = null;
        render();
    }
    function createdBanner(w) {
        if (!S.stDone || S.stDone.id !== w.id) return "";
        return '<div class="banner banner-success">' + icon("check") + '<div class="banner-body">' + esc(T(S.stDone.node ? "au.st.createdNode" : "au.st.created", { path: S.stDone.path, edit: S.stDone.edit })) + "</div></div>";
    }
    /* a project that needs Node.js to edit: the ready build already runs; this is how to change it */
    function nextStepBlock(c) {
        function cmd(text) {
            return '<div class="st-cmd"><code>' + esc(text) + '</code><button class="btn btn-sm" data-act="copy" data-text="' + esc(text) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>";
        }
        return (
            '<div class="st-next"><h3>' + esc(T("au.next.title")) + "</h3><p>" + esc(T("au.next.body")) + "</p>" +
            cmd("npm install") +
            cmd("npm run watch") +
            '<p class="hint">' + esc(T("au.next.after")) + "</p>" +
            '<div class="row-actions"><button class="btn btn-sm" data-toast="au.toast.openRoot">' + icon("folder") + esc(T("au.next.openRoot")) + '</button><span class="path ph">' + esc(c.nodeRoot) + "</span></div></div>"
        );
    }

    /* ---------- access: link, visibility, lifecycle ---------- */
    function renderAccess(w) {
        var out = "";
        if (w.state === "takendown") out += '<div class="card">' + takedownBlock(w) + "</div>";
        var link;
        if (w.share) {
            link =
                '<div class="share"><input class="input" readonly value="' + esc(shareUrl(w)) + '"/><button class="btn" data-act="copy" data-text="' + esc(shareUrl(w)) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>" +
                '<p class="hint" style="margin-top:6px">' + esc(w.everApproved ? T("au.access.linkWorks") : T("au.access.linkAfterApproval")) + "</p>";
        } else link = '<p class="dim">' + esc(T("au.access.linkAfterFirst")) + "</p>";
        out += '<div class="card"><h2 class="sec">' + esc(T("au.access.link")) + "</h2>" + link + "</div>";

        /* The switch works at any time, by the release's rules: out of the catalog at once, into it by
           a moderator's yes. A co-maintainer may use it, as they may choose it at release. */
        var vis;
        if (!w.everApproved) vis = '<p class="dim">' + esc(T("au.access.visDraft")) + "</p>";
        else {
            var inCat = w.visibility === "catalog";
            var off = w.state === "takendown" ? " disabled" : "";
            vis =
                '<p><span class="chip ' + (inCat ? "chip-ok" : "chip-info") + '">' + esc(inCat ? T("au.state.live") : T("au.state.link")) + "</span></p>" +
                '<div class="vis" style="margin-top:8px">' +
                '<label class="radio"><input type="radio" name="vis"' + (inCat || w.catalogRequested ? " checked" : "") + off + ' data-act="vis" data-id="' + esc(w.id) + '" value="catalog"/><div><b>' + esc(T("au.vis.catalog")) + "</b><span>" + esc(inCat ? T("au.vis.catalogNow") : T("au.vis.toCatalog")) + "</span></div></label>" +
                '<label class="radio"><input type="radio" name="vis"' + (!inCat && !w.catalogRequested ? " checked" : "") + off + ' data-act="vis" data-id="' + esc(w.id) + '" value="link"/><div><b>' + esc(T("au.vis.link")) + "</b><span>" + esc(inCat ? T("au.vis.toLink") : T("au.vis.linkNow")) + "</span></div></label></div>";
        }
        if (w.catalogRequested && w.visibility !== "catalog") {
            var waitPend = pendingOf(w);
            vis += '<p class="dim" style="margin-top:6px">' + esc(waitPend && waitPend.state === "pending" ? T("au.access.catalogRequestedWithVersion", { v: waitPend.v }) : T("au.access.catalogRequested")) + "</p>";
        }
        out += '<div class="card"><h2 class="sec">' + esc(T("au.access.visibility")) + "</h2>" + vis + "</div>";

        var lock = isMaint() ? ownerOnlyAttrs() : "";
        var life = "";
        if (w.ownerSince) life += '<p class="dim small" style="margin-bottom:6px">' + icon("transfer", "sm") + " " + esc(T("au.tr.receivedLine", { date: fmtDate(w.ownerSince), from: w.ownerFrom })) + "</p>";
        if (w.state === "withdrawn") life += row(T("au.restore"), T("au.access.restoreBody"), '<button class="btn" data-act="restore" data-id="' + esc(w.id) + '"' + lock + ">" + icon("undo") + esc(T("au.restore")) + "</button>");
        else if (w.state !== "takendown" && w.everApproved) life += row(T("au.withdraw"), T("au.withdraw.tip"), '<button class="btn" data-act="withdraw" data-id="' + esc(w.id) + '"' + lock + ">" + icon("archive") + esc(T("au.withdraw")) + "</button>");
        if (w.everApproved) {
            /* out of date: a mark and, if the author names one, a replacement from the catalog */
            if (w.deprecated) {
                var sname = successorName(w.successor);
                var dBody = esc(w.successor ? T("au.dep.withSuccessor", { name: sname }) : T("au.dep.noSuccessor"));
                if (w.successor && !isPublicNow(w.successor)) dBody += '<br/><span style="color:var(--warn)">' + icon("warn", "sm") + " " + esc(T("au.dep.hidden", { name: sname })) + "</span>";
                life += rowRaw(
                    T("au.dep.title"),
                    dBody,
                    '<div class="row-actions"><button class="btn" data-act="deprecate" data-id="' + esc(w.id) + '"' + lock + ">" + esc(T("au.dep.change")) + '</button><button class="btn" data-act="undeprecate" data-id="' + esc(w.id) + '"' + lock + ">" + icon("undo") + esc(T("au.dep.undo")) + "</button></div>"
                );
            } else life += row(T("au.access.deprecate"), T("au.access.deprecateBody"), '<button class="btn" data-act="deprecate" data-id="' + esc(w.id) + '"' + lock + ">" + esc(T("au.access.deprecateAction")) + "</button>");
            /* transfer: a one-time code the other author types in; nothing moves until they accept */
            if (w.transfer) {
                life += rowRaw(
                    T("au.tr.pendingTitle"),
                    esc(T("au.tr.pendingBody", { date: fmtDate(w.transfer.until) })),
                    '<div class="row-actions"><button class="btn" data-act="transfer" data-id="' + esc(w.id) + '"' + lock + ">" + esc(T("au.tr.newCode")) + '</button><button class="btn" data-act="cancel-transfer" data-id="' + esc(w.id) + '"' + lock + ">" + esc(T("au.tr.cancel")) + "</button></div>"
                );
            } else {
                var fp = pendingOf(w);
                var why = w.state === "takendown" ? T("au.tr.blockedTakedown") : fp && (fp.state === "pending" || fp.state === "checking") ? T("au.tr.blockedVersion", { v: fp.v }) : null;
                life += rowRaw(
                    T("au.access.transfer"),
                    esc(T("au.access.transferBody")) + (why ? '<br/><span class="faint">' + esc(why) + "</span>" : ""),
                    '<button class="btn" data-act="transfer" data-id="' + esc(w.id) + '"' + (why ? ' disabled title="' + esc(why) + '"' : lock) + ">" + icon("transfer") + esc(T("au.access.transferAction")) + "</button>"
                );
            }
        }
        if (life) out += '<div class="card"><h2 class="sec">' + esc(T("au.access.lifecycle")) + "</h2>" + life + "</div>";
        out +=
            '<div class="card danger-zone"><h2 class="sec">' + esc(T("au.delete")) + "</h2>" +
            (w.everApproved
                ? '<p class="dim">' + esc(T("au.access.cantDelete")) + "</p>"
                : '<div class="row-actions" style="justify-content:space-between"><p class="dim" style="flex:1;min-width:240px">' + esc(T("au.access.deleteBody")) + '</p><button class="btn btn-danger" data-act="delete" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("trash") + esc(T("au.delete")) + "</button></div>") +
            "</div>";
        return out;
    }
    function row(title, body, action, isLater) {
        return rowRaw(title, esc(body), action, isLater);
    }
    function rowRaw(title, bodyHtml, action, isLater) {
        return (
            '<div class="row-actions" style="justify-content:space-between;padding:6px 0;border-top:1px solid var(--border)"><div style="flex:1;min-width:240px"><b>' + esc(title) + "</b>" + (isLater ? later() : "") + '<p class="dim small">' + bodyHtml + "</p></div>" + action + "</div>"
        );
    }

    /* ---------- lifecycle: the catalog the successor comes from ---------- */
    /* A widget is a fair successor while it is in the public catalog: the author's own when its
       standing says so, anyone else's from the catalog list. */
    function catalogEntry(id) {
        var own = find(id);
        if (own) return { id: own.id, name: own.name, author: D.author.name, color: own.color, letter: own.letter, own: own };
        for (var i = 0; i < D.catalog.length; i++) if (D.catalog[i].id === id) return D.catalog[i];
        return null;
    }
    function isPublicNow(id) {
        var e = catalogEntry(id);
        if (!e) return false;
        return e.own ? phaseOf(e.own) === "live" : true;
    }
    function successorName(id) {
        var e = id ? catalogEntry(id) : null;
        return e ? e.name : id || "";
    }
    function successorCandidates(w, q) {
        var seen = {};
        var list = [];
        D.catalog.concat(widgets().map(function (x) {
            return { id: x.id };
        })).forEach(function (x) {
            if (seen[x.id] || x.id === w.id || !isPublicNow(x.id)) return;
            seen[x.id] = true;
            var e = catalogEntry(x.id);
            if (!q || (e.name + " " + e.author).toLowerCase().indexOf(q.toLowerCase()) >= 0) list.push(e);
        });
        return list.sort(function (a, b) {
            return a.name.localeCompare(b.name, "ru");
        });
    }
    function catIcon(e) {
        return '<span class="wicon" style="background:' + e.color + '" aria-hidden="true">' + esc(e.letter || e.name.charAt(0)) + "</span>";
    }

    /* ---------- stats ---------- */
    /* Thirty closed days, invented but steady: a widget's installs and users follow its size, with
       one uninstall spike (an update people did not like) so the chart shows what it is for. */
    function statsDays(s) {
        var days = [];
        var scale = Math.max(1, s.installs / 120);
        for (var i = 0; i < 30; i++) {
            var installs = Math.max(0, Math.round(scale * (2.2 + 1.4 * Math.sin(i * 0.9) + i / 14)));
            var uninstalls = Math.max(0, Math.round(scale * (0.5 + 0.5 * Math.cos(i * 1.3)) + (i === 21 ? scale * 4 : 0)));
            var users = Math.max(0, Math.round(s.active7 * (0.32 + 0.06 * Math.sin(i * 0.6)) * (i % 7 === 5 || i % 7 === 6 ? 0.7 : 1)));
            days.push({ i: installs, x: uninstalls, u: i === 29 ? null : users });
        }
        return days;
    }
    /* One SVG, one or two lines over the same box; a null point (a day not counted yet) breaks the line. */
    function sparkSvg(series, label) {
        var max = 1;
        series.forEach(function (s) {
            s.v.forEach(function (p) {
                if (p != null && p > max) max = p;
            });
        });
        var paths = series
            .map(function (s) {
                var d = "";
                var pen = "M";
                s.v.forEach(function (p, i) {
                    if (p == null) {
                        pen = "M";
                        return;
                    }
                    d += pen + (i * (300 / (s.v.length - 1))).toFixed(1) + " " + (56 - (p / max) * 50).toFixed(1) + " ";
                    pen = "L";
                });
                return '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="1.6" vector-effect="non-scaling-stroke"/>';
            })
            .join("");
        return '<svg viewBox="0 0 300 60" width="100%" height="80" preserveAspectRatio="none" role="img" aria-label="' + esc(label) + '">' + paths + "</svg>";
    }
    function legend(items) {
        return (
            '<div class="small dim" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">' +
            items
                .map(function (x) {
                    return '<span><i style="display:inline-block;width:10px;height:2px;vertical-align:middle;margin-right:5px;background:' + x[1] + '"></i>' + esc(x[0]) + "</span>";
                })
                .join("") +
            "</div>"
        );
    }
    function renderStats(w) {
        if (!w.stats) return '<div class="empty-state">' + icon("chart") + "<h1>" + esc(T("au.stats.none.title")) + '</h1><p class="lede" style="margin:0 auto">' + esc(T("au.stats.none.body")) + "</p></div>";
        var s = w.stats;
        var days = statsDays(s);
        var sum = function (k) {
            return days.reduce(function (a, d) {
                return a + (d[k] || 0);
            }, 0);
        };
        var total = s.versions.reduce(function (a, v) {
            return a + v.n;
        }, 0);
        var versionRows = s.versions
            .map(function (v) {
                var share = Math.round((v.n / (total || 1)) * 100);
                var name = v.v ? '<span class="mono">' + esc(v.v) + "</span>" : '<span class="dim" style="white-space:nowrap">' + esc(T("au.stats.unknownVersion")) + "</span>";
                return (
                    '<div style="display:grid;grid-template-columns:130px 1fr 44px 52px;gap:8px;align-items:center;margin:4px 0">' + name +
                    '<div class="progress" style="margin:0"><i style="width:' + share + "%;background:var(--info)" + (v.v ? "" : ";opacity:.45") + '"></i></div>' +
                    '<span class="dim small ph" style="text-align:right">' + share + '%</span><span class="dim small ph" style="text-align:right">' + fmtNum(v.n) + "</span></div>"
                );
            })
            .join("");
        return (
            '<p class="lede" style="margin-bottom:10px">' + esc(T("au.stats.lede")) + "</p>" +
            '<div class="nums" style="margin-bottom:10px">' +
            '<div class="stat"><b class="ph">' + fmtNum(s.installs) + "</b><span>" + esc(T("au.stats.installs")) + "</span></div>" +
            '<div class="stat"><b class="ph">' + fmtNum(s.activeInstalls) + "</b><span>" + esc(T("au.stats.activeInstalls")) + "</span></div>" +
            '<div class="stat"><b class="ph">' + fmtNum(s.active7) + "</b><span>" + esc(T("au.stats.active7")) + "</span></div></div>" +
            '<div class="grid-2">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.stats.over30")) + "</h2>" +
            sparkSvg(
                [
                    { v: days.map(function (d) { return d.i; }), color: "var(--accent)" },
                    { v: days.map(function (d) { return d.x; }), color: "var(--danger)" }
                ],
                T("au.stats.over30")
            ) +
            legend([[T("au.stats.legend.installs"), "var(--accent)"], [T("au.stats.legend.uninstalls"), "var(--danger)"]]) +
            '<p class="small" style="margin-top:6px"><span class="ph">' + esc(T("au.stats.over30Sum", { i: fmtNum(sum("i")), x: fmtNum(sum("x")) })) + "</span></p>" +
            '<p class="hint">' + esc(T("au.stats.delayed")) + "</p></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.stats.users30")) + "</h2>" +
            sparkSvg([{ v: days.map(function (d) { return d.u; }), color: "var(--info)" }], T("au.stats.users30")) +
            legend([[T("au.stats.legend.users"), "var(--info)"]]) +
            '<p class="hint">' + esc(T("au.stats.usersHint")) + "</p></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.stats.adoption")) + "</h2>" + versionRows +
            '<p class="hint">' + esc(T("au.stats.adoptionHint")) + "</p></div>" +
            "</div>"
        );
    }

    /* ---------- code first: a local folder Nest has never heard of ---------- */
    function renderLocal(key) {
        var l = D.local.filter(function (x) {
            return x.key === key;
        })[0];
        if (!l) return renderSummary();
        return (
            '<a class="btn btn-link btn-sm back-link" href="#/">' + icon("arrow-left") + esc(T("au.back")) + "</a>" +
            '<div class="wp-head"><span class="wicon lg folder">' + icon("folder", "lg") + '</span><div><h1><span class="ph">' + esc(l.key) + '</span></h1><div class="meta"><span class="chip chip-dashed">' + esc(T("au.local.chip")) + "</span></div></div><div></div></div>" +
            '<div class="card next info"><div><div class="k">' + esc(T("au.next.k")) + "</div><h3>" + esc(T("au.local.title")) + "</h3><p>" + esc(T("au.local.body")) + "</p></div>" +
            '<div class="go"><button class="btn btn-primary" data-act="draft-from-folder" data-key="' + esc(l.key) + '">' + icon("plus") + esc(T("au.local.action")) + "</button></div></div>" +
            '<div class="card"><dl class="summary-kv"><dt>' + esc(T("au.code.folder")) + '</dt><dd class="path ph">' + esc(l.path) + "</dd><dt>widget.json · id</dt><dd class=\"mono\">" + esc(l.manifestId) + "</dd><dt>" + esc(T("au.code.version")) + '</dt><dd class="mono">' + esc(l.manifestVersion) + "</dd></dl>" +
            '<div class="row-actions"><button class="switch" role="switch" aria-checked="true"><i></i>' + esc(T("au.code.hot")) + '</button><button class="btn btn-sm" data-toast="au.toast.openedPanel">' + icon("panel") + esc(T("au.openPanel")) + "</button></div></div>"
        );
    }

    /* ---------- profile, keys, recovery, co-maintainers ---------- */
    /* A co-maintainer reads the public fields only: the profile is the owner's, and the private
       group (e-mail, contact, source) is not theirs to see. */
    function profileFields(a, readOnly) {
        a = a || {};
        function f(id, label, hint, val, mono) {
            return '<label class="field" style="margin-bottom:8px"><span>' + esc(label) + '</span><input class="input' + (mono ? " mono" : "") + '" id="' + id + '" value="' + esc(val || "") + '"' + (readOnly ? " readonly" : "") + '/><span class="hint">' + esc(hint) + "</span></label>";
        }
        return (
            '<div class="fieldgroup"><div class="gh"><b>' + esc(T("au.p.public")) + "</b><span>" + esc(T("au.p.publicHint")) + "</span></div>" +
            f("p-name", T("au.p.name"), T("au.p.nameHint"), a.name) +
            f("p-yt", T("au.p.youtube"), T("au.p.youtubeHint"), a.youtube, true) +
            f("p-tg", T("au.p.telegram"), T("au.p.telegramHint"), a.telegram, true) +
            "</div>" +
            (readOnly
                ? ""
                : '<div class="fieldgroup"><div class="gh"><b>' + esc(T("au.p.private")) + "</b><span>" + esc(T("au.p.privateHint")) + "</span></div>" +
                  f("p-email", T("au.p.email"), T("au.p.emailHint"), a.email) +
                  f("p-contact", T("au.p.contact"), T("au.p.contactHint"), a.contactTg, true) +
                  f("p-src", T("au.p.source"), T("au.p.sourceHint"), a.sourceCode, true) +
                  "</div>")
        );
    }
    function thisKey() {
        return isMaint() ? D.author.maintKey : D.author.id;
    }
    function renderKeysTable() {
        var lastOwner = liveOwnerKeys().length <= 1;
        var rows = liveKeys()
            .map(function (k) {
                var mine = k.id === thisKeyId();
                var whose = k.member ? '<span class="ph">' + esc(memberName(k.member)) + "</span>" : esc(T("au.keys.owner"));
                var locked = !k.member && lastOwner;
                var revoke = '<button class="btn btn-sm" data-act="revoke-key" data-id="' + esc(k.id) + '"' + (locked ? ' disabled title="' + esc(T("au.keys.lastOwner")) + '"' : "") + ">" + esc(T("au.keys.revoke")) + "</button>";
                return (
                    "<tr>" +
                    '<td><div><span class="ph">' + esc(k.label) + "</span>" + (mine ? ' <span class="chip chip-ok">' + esc(T("au.keys.thisPc")) + "</span>" : "") + '</div><div class="faint small">' + esc(T("au.keys.origin." + k.origin)) + "</div></td>" +
                    "<td>" + whose + "</td>" +
                    '<td class="small"><span class="ph">' + fmtDate(k.added) + "</span></td>" +
                    '<td class="small"><span class="ph">' + fmtDate(k.lastUsed) + "</span></td>" +
                    '<td class="num"><div class="row-actions" style="justify-content:flex-end;flex-wrap:nowrap"><button class="btn btn-icon btn-sm" data-act="rename-key" data-id="' + esc(k.id) + '" title="' + esc(T("au.keys.rename")) + '" aria-label="' + esc(T("au.keys.rename")) + '">' + icon("pencil") + "</button>" + revoke + "</div></td>" +
                    "</tr>"
                );
            })
            .join("");
        return (
            '<div class="table-scroll"><table class="data dash keys"><thead><tr>' +
            "<th>" + esc(T("au.keys.col.key")) + "</th><th>" + esc(T("au.keys.col.whose")) + "</th><th>" + esc(T("au.keys.col.added")) + "</th><th>" + esc(T("au.keys.col.lastUsed")) + "</th><th></th>" +
            "</tr></thead><tbody>" + rows + "</tbody></table></div>"
        );
    }
    function renderRecovery() {
        var a = D.author;
        var code = a.recoverySetAt
            ? '<div class="row-actions" style="justify-content:space-between"><p class="dim" style="flex:1;min-width:240px">' + esc(T("au.recovery.setOn", { date: fmtDate(a.recoverySetAt) })) + '</p><button class="btn" data-act="recovery">' + esc(T("au.recovery.replace")) + "</button></div>"
            : '<div class="banner banner-warn" style="margin:0">' + icon("warn") + '<div class="banner-body">' + esc(T("au.recovery.none")) + '</div><button class="btn btn-sm" data-act="recovery">' + icon("shield") + esc(T("au.p.recovery")) + "</button></div>";
        var email =
            '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">' +
            '<div class="row-actions" style="justify-content:space-between"><div style="flex:1;min-width:240px"><b>' + esc(T("au.email.row", { email: a.email })) + "</b> " +
            (a.emailVerified ? '<span class="chip chip-ok">' + esc(T("au.email.verified")) + "</span>" : '<span class="chip chip-warn">' + esc(T("au.email.unverified")) + "</span>") +
            '<p class="dim small">' + esc(T("au.email.hint")) + "</p></div>" +
            (a.emailVerified ? "" : '<button class="btn" data-act="verify-email">' + esc(T("au.email.verify")) + "</button>") +
            "</div></div>";
        return '<h3 class="sub">' + esc(T("au.recovery.heading")) + "</h3>" + code + email;
    }
    function renderMembers() {
        var list = D.author.members.filter(function (m) {
            return m.status !== "removed";
        });
        var rows = list
            .map(function (m) {
                var keys = D.author.keys.filter(function (k) {
                    return k.member === m.id && !k.revoked;
                }).length;
                var status =
                    m.status === "active"
                        ? '<span class="chip chip-ok">' + esc(T("au.members.active")) + "</span>"
                        : m.expires < D.NOW
                          ? '<span class="chip">' + esc(T("au.members.expired")) + "</span>"
                          : '<span class="chip chip-info">' + esc(T("au.members.invited", { date: fmtDate(m.expires) })) + "</span>";
                var act =
                    m.status === "active"
                        ? '<button class="btn btn-sm" data-act="remove-member" data-id="' + esc(m.id) + '">' + esc(T("au.members.remove")) + "</button>"
                        : '<button class="btn btn-sm" data-act="cancel-invite" data-id="' + esc(m.id) + '">' + esc(T("au.members.cancelInvite")) + "</button>";
                return '<tr><td><span class="ph">' + esc(m.name) + "</span></td><td>" + status + '</td><td class="num">' + (m.status === "active" ? keys : "—") + '</td><td class="num">' + act + "</td></tr>";
            })
            .join("");
        var table = list.length
            ? '<div class="table-scroll"><table class="data dash"><thead><tr><th>' + esc(T("au.members.col.name")) + "</th><th>" + esc(T("au.members.col.status")) + '</th><th class="num">' + esc(T("au.members.col.keys")) + "</th><th></th></tr></thead><tbody>" + rows + "</tbody></table></div>"
            : '<p class="dim">' + esc(T("au.members.none")) + "</p>";
        return (
            '<div class="card"><div class="sec-row"><h2 class="sec">' + icon("user") + " " + esc(T("au.members.heading")) + '</h2><button class="btn btn-sm" data-act="invite">' + icon("plus") + esc(T("au.members.invite")) + "</button></div>" +
            '<p class="dim" style="margin-bottom:8px">' + esc(T("au.members.body")) + "</p>" + table + "</div>"
        );
    }
    function renderProfile() {
        var a = D.author;
        var maint = isMaint();
        var used = S.recoveryUsed ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body">' + esc(T("au.recovery.used")) + "</div></div>" : "";
        var devices =
            '<div class="card" id="devices"><div class="sec-row"><h2 class="sec">' + icon("key") + " " + esc(T("au.p.devices")) + '</h2><button class="btn btn-sm" data-act="add-device">' + icon("plus") + esc(T("au.p.addDevice")) + "</button></div>" +
            '<p class="dim" style="margin-bottom:8px">' + esc(T("au.p.devicesBody")) + "</p>" +
            renderKeysTable() +
            (maint ? "" : renderRecovery()) +
            "</div>";
        var people = maint
            ? '<div class="card"><h2 class="sec">' + icon("user") + " " + esc(T("au.members.heading")) + '</h2><p class="dim">' + esc(T("au.maint.body")) + "</p></div>"
            : renderMembers();
        return (
            '<a class="btn btn-link btn-sm back-link" href="#/">' + icon("arrow-left") + esc(T("au.back")) + "</a>" +
            '<h1 style="font-size:var(--fs-xl);margin-bottom:10px">' + esc(T("au.rail.profile")) + "</h1>" +
            used +
            '<div class="grid-2"><div class="stack">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.heading")) + (maint ? ' <span class="chip">' + icon("lock", "sm") + esc(T("au.ownerOnly")) + "</span>" : "") + "</h2>" +
            profileFields(a, maint) +
            (maint ? "" : '<div class="row-actions" style="margin-top:10px"><button class="btn btn-primary" data-act="save-profile">' + esc(T("au.save")) + '</button><button class="btn">' + esc(T("au.p.revert")) + "</button></div>") +
            "</div>" +
            '</div><div class="stack">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.idHeading")) + '</h2><div class="share"><input class="input mono ph" readonly value="' + esc(thisKey()) + '"/><button class="btn" data-act="copy" data-text="' + esc(thisKey()) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.p.idHint")) + "</p></div>" +
            /* a Nest that knows no partner marks keeps the «скоро» look */
            (S.partner === "older" ? '<div class="card later"><h2 class="sec">' + icon("megaphone") + " " + esc(T("au.p.announce")) + later() + '</h2><p class="dim">' + esc(T("au.p.announceBody")) + "</p></div>" : "") +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.otherHeading")) + '</h2><details class="more"' + (S.redeem.error && S.redeem.where === "profile" ? " open" : "") + "><summary>" + icon("chevron-right", "sm") + esc(T("au.p.useOther")) + "</summary>" +
            '<p class="hint" style="margin:4px 0">' + esc(T("au.p.useOtherHint")) + "</p>" +
            '<div class="share"><input class="input mono" id="replace-value" placeholder="' + esc(T("au.p.pastePlaceholder")) + '" value="' + esc(S.redeem.where === "profile" ? S.redeem.value : "") + '"/><button class="btn" data-act="replace">' + esc(T("au.p.verify")) + "</button></div>" +
            (S.redeem.error && S.redeem.where === "profile" ? '<p class="err">' + esc(S.redeem.error) + "</p>" : "") +
            redeemExamples("replace-value") +
            "</details>" +
            '<div class="row-actions" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><button class="btn btn-danger btn-sm" data-act="forget">' + esc(T("au.p.forget")) + '</button><span class="hint">' + esc(T("au.p.forgetHint")) + "</span></div></div>" +
            "</div></div>" +
            /* only an author marked «Партнёр» speaks for themselves; everyone else sees nothing here */
            (authorPartner()
                ? '<section class="an-section" id="announce"><h2 class="sec">' + icon("megaphone") + " " + esc(T("au.p.announce")) + ' <span class="chip chip-ok">' + esc(T("au.an.partner")) + "</span>" +
                  (maint ? ' <span class="chip">' + icon("lock", "sm") + esc(T("au.ownerOnly")) + "</span>" : "") + "</h2>" +
                  '<p class="dim" style="margin-bottom:10px">' + esc(T("au.an.lede.author")) + "</p>" +
                  announceBlock("author", null, maint) + "</section>"
                : "") +
            devices +
            people
        );
    }

    /* review chrome: one click puts an example into the box, so every outcome can be tried */
    function redeemExamples(target) {
        var c = D.author.codes;
        var ex = [
            ["pairing", c.pairing],
            ["invitation", c.invitation],
            ["recovery", c.recovery],
            ["wrong", "ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ"]
        ];
        if (S.redeem.emailSent) ex.splice(3, 0, ["email", c.email]);
        return (
            '<div class="mock-examples">' + esc(T("au.redeem.examples")) + " " +
            ex
                .map(function (e) {
                    return '<button class="btn btn-link btn-sm" data-act="redeem-example" data-target="' + target + '" data-text="' + esc(e[1]) + '">' + esc(e[0] === "email" ? T("au.email.codePh") : T("au.redeem.ex." + e[0])) + "</button>";
                })
                .join(" · ") +
            "</div>"
        );
    }

    /* ================================================================== announcements */
    /* Who may announce. An author marked «Партнёр» speaks for themselves and for every widget of theirs
       in the catalog; any other author only for their own widgets marked «Партнёрский». An older Nest
       knows neither mark, so the profile keeps its «скоро» card. Nest is the gate; the terminal only
       hides what Nest would refuse. */
    function authorPartner() {
        return S.partner === "author";
    }
    function canAnnounce(w) {
        if (phaseOf(w) !== "live") return false;
        return authorPartner() || (S.partner === "widget" && !!w.partner);
    }
    var AN_DAYS_DEFAULT = 7;
    var AN_DAYS_MAX = 14;
    /* key: "author" for the author's own, otherwise a widget id */
    function annOf(key) {
        var widget = key === "author" ? null : key;
        return D.announcements.filter(function (a) {
            return a.widget === widget;
        });
    }
    function annState(a) {
        return a.state === "live" && a.ends <= D.NOW ? "ended" : a.state;
    }
    function annLive(key) {
        return (
            annOf(key).filter(function (a) {
                return annState(a) === "live";
            })[0] || null
        );
    }
    function annDraft(key) {
        if (!S.an[key]) S.an[key] = { titleRu: "", titleEn: "", textRu: "", textEn: "", days: AN_DAYS_DEFAULT };
        return S.an[key];
    }
    function annTouched(d) {
        return !!(d.titleRu || d.titleEn || d.textRu || d.textEn);
    }
    /* The rule Nest enforces, judged here first: no address of any kind — a scheme, «www.» or a host
       with a path (t.me/…). A bare «node.js» is a word, not a link. */
    function looksLikeLink(s) {
        return /:\/\//.test(s) || /www\./i.test(s) || /[a-z0-9-]+\.[a-z]{2,}\//i.test(s);
    }
    function annProblem(d) {
        if ([d.titleRu, d.titleEn, d.textRu, d.textEn].some(looksLikeLink)) return T("au.an.err.link");
        if (d.textRu.trim() && !d.titleRu.trim()) return T("au.an.err.titleRu");
        if (d.textEn.trim() && !d.titleEn.trim()) return T("au.an.err.titleEn");
        if (!d.titleRu.trim() && !d.titleEn.trim()) return T("au.an.err.title");
        return null;
    }
    function daysText(n) {
        var m10 = n % 10;
        var m100 = n % 100;
        var k = m10 === 1 && m100 !== 11 ? "au.an.day1" : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? "au.an.day2" : "au.an.day5";
        return T(k, { n: n });
    }
    /* the draft as it would go out: it ends the chosen number of days from now */
    function annDraftView(d) {
        return { titleRu: d.titleRu.trim(), titleEn: d.titleEn.trim(), textRu: d.textRu.trim(), textEn: d.textEn.trim(), ends: D.NOW + d.days * D.DAY, mine: true };
    }
    /* A user reads their own language and falls back to the other one; the mock's user reads Russian. */
    function annTitle(a) {
        return a.titleRu || a.titleEn;
    }
    function annText(a) {
        return a.titleRu ? a.textRu : a.textEn;
    }
    /* one row as it would sit under the user's bell in the Nest window */
    function annPreview(w, a) {
        var who = w ? wicon(w) : '<span class="avatar an-avatar">' + esc(D.author.name.charAt(0)) + "</span>";
        var title = a ? annTitle(a) : "";
        var text = a ? annText(a) : "";
        return (
            '<div class="an-row">' + who +
            '<span class="an-row-main"><b class="' + (a && !a.mine ? "ph" : "") + '">' + esc(title || T("au.an.previewEmpty")) + "</b>" +
            (text ? '<span class="an-row-text">' + esc(text) + "</span>" : "") +
            "<small>" + esc(w ? w.name : D.author.name) + (a ? " · " + esc(T("au.an.until", { date: fmtDate(a.ends) })) : "") + "</small></span></div>"
        );
    }
    /* One block for both levels: the author's on the profile and a widget's in its «Анонс» section.
       The form on the left; on the right what users see now, how a row reads, and what came before. */
    function announceBlock(key, w, readOnly) {
        var d = annDraft(key);
        var live = annLive(key);
        var sub = ' data-subj="' + esc(key) + '"';
        var dis = readOnly ? " disabled" : "";
        var problem = annProblem(d);
        function field(f, label, max, area) {
            var ctl = area
                ? '<textarea class="textarea an-text" data-an="' + f + '"' + sub + ' maxlength="' + max + '" data-count="' + max + '" placeholder="' + esc(T("au.an.textPh")) + '"' + dis + ">" + esc(d[f]) + "</textarea>"
                : '<input class="input" data-an="' + f + '"' + sub + ' maxlength="' + max + '" data-count="' + max + '" placeholder="' + esc(T("au.an.titlePh")) + '" value="' + esc(d[f]) + '"' + dis + "/>";
            return "<label>" + esc(T(label)) + '</label><div class="ctl">' + ctl + '<span class="counter">' + d[f].length + " / " + max + "</span></div>";
        }
        var days = "";
        for (var n = 1; n <= AN_DAYS_MAX; n++) days += '<option value="' + n + '"' + (d.days === n ? " selected" : "") + ">" + esc(daysText(n)) + "</option>";
        var form =
            '<div class="card"><h3 class="lp-sub" style="margin-top:0">' + esc(T("au.an.new")) + "</h3>" +
            '<div class="form-grid">' +
            field("titleRu", "au.an.titleRu", 80) +
            field("textRu", "au.an.textRu", 500, true) +
            field("titleEn", "au.an.titleEn", 80) +
            field("textEn", "au.an.textEn", 500, true) +
            "<label>" + esc(T("au.an.days")) + '</label><div class="ctl"><div class="row-actions"><select class="select" data-an="days"' + sub + dis + ">" + days + "</select>" +
            '<span class="hint" id="an-until-' + esc(key) + '">' + esc(T("au.an.until", { date: fmtDate(D.NOW + d.days * D.DAY) })) + "</span></div></div>" +
            "</div>" +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.an.langHint")) + "</p>" +
            '<p class="hint" style="margin-top:4px">' + esc(T("au.an.policy")) + "</p>" +
            '<p class="err" id="an-err-' + esc(key) + '"' + (annTouched(d) && problem ? "" : " hidden") + ">" + esc(problem || "") + "</p>" +
            (readOnly ? "" : '<div class="mock-examples">' + esc(T("au.an.examples")) + ' <button class="btn btn-link btn-sm" data-act="an-example"' + sub + ">" + esc(T("au.an.example.link")) + "</button></div>") +
            '<div class="row-actions" style="margin-top:8px"><button class="btn btn-primary" data-act="an-publish"' + sub + (readOnly ? ownerOnlyAttrs() : problem ? " disabled" : "") + ">" + icon("megaphone") + esc(T("au.an.publish")) + "</button>" +
            (readOnly ? "" : '<button class="btn" data-act="an-clear"' + sub + ">" + esc(T("au.an.clear")) + "</button>") +
            "</div></div>";
        var liveCard =
            '<div class="card"><h3 class="lp-sub" style="margin-top:0">' + esc(T("au.an.live")) + (live ? ' <span class="chip chip-ok">' + esc(T("au.an.liveChip")) + "</span>" : "") + "</h3>" +
            (live
                ? '<div class="an-body"><b class="' + (live.mine ? "" : "ph") + '">' + esc(annTitle(live)) + "</b>" + (annText(live) ? "<p>" + esc(annText(live)) + "</p>" : "") + "</div>" +
                  '<p class="hint" style="margin-top:4px">' + esc(T("au.an.liveMeta", { at: fmtDate(live.at), until: fmtDate(live.ends) })) + "</p>" +
                  (readOnly ? "" : '<div class="row-actions" style="margin-top:8px"><button class="btn btn-sm" data-act="an-change"' + sub + ">" + esc(T("au.an.change")) + '</button><button class="btn btn-sm btn-danger" data-act="an-withdraw"' + sub + ">" + esc(T("au.an.withdraw")) + "</button></div>")
                : '<p class="dim">' + esc(T("au.an.none")) + "</p>") +
            "</div>";
        var preview =
            '<div class="card"><h3 class="lp-sub" style="margin-top:0">' + esc(T("au.an.preview")) + "</h3>" +
            '<div id="an-preview-' + esc(key) + '">' + annPreview(w, annTouched(d) ? annDraftView(d) : live) + "</div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T(w ? "au.an.previewHint.widget" : "au.an.previewHint.author")) + "</p></div>";
        var past = annOf(key)
            .filter(function (a) {
                return a !== live;
            })
            .slice(0, 5);
        var history =
            '<div class="card"><h3 class="lp-sub" style="margin-top:0">' + esc(T("au.an.history")) + "</h3>" +
            (past.length
                ? past
                      .map(function (a) {
                          var st = annState(a);
                          return (
                              '<div class="an-hist"><div class="an-hist-head"><b class="' + (a.mine ? "" : "ph") + '">' + esc(annTitle(a)) + '</b><span class="chip' + (st === "removed" ? " chip-danger" : "") + '">' + esc(T("au.an.st." + st)) + "</span></div>" +
                              "<small>" + esc(T("au.an.historyMeta", { from: fmtDate(a.at), to: fmtDate(a.closed || a.ends) })) + "</small>" +
                              (st === "removed" && a.reason ? '<p class="an-reason">' + esc(a.reason) + "</p>" : "") +
                              "</div>"
                          );
                      })
                      .join("")
                : '<p class="dim">' + esc(T("au.an.historyEmpty")) + "</p>") +
            "</div>";
        return '<div class="grid-2"><div class="stack">' + form + '</div><div class="stack">' + liveCard + preview + history + "</div></div>";
    }
    /* the form follows every keystroke without a re-render that would take the caret away */
    function annSync(key) {
        var d = annDraft(key);
        var problem = annProblem(d);
        var err = document.getElementById("an-err-" + key);
        if (err) {
            err.hidden = !(annTouched(d) && problem);
            err.textContent = problem || "";
        }
        var btn = document.querySelector('[data-act="an-publish"][data-subj="' + key + '"]');
        if (btn && !btn.title) btn.disabled = !!problem;
        var until = document.getElementById("an-until-" + key);
        if (until) until.textContent = T("au.an.until", { date: fmtDate(D.NOW + d.days * D.DAY) });
        var pv = document.getElementById("an-preview-" + key);
        if (pv) pv.innerHTML = annPreview(key === "author" ? null : find(key), annTouched(d) ? annDraftView(d) : annLive(key));
    }
    /* Publishing over a live one replaces it at once; the old one goes to the history as «снят вами». */
    function annPublish(key) {
        var d = annDraft(key);
        var live = annLive(key);
        if (live) {
            live.state = "withdrawn";
            live.closed = D.NOW;
        }
        var v = annDraftView(d);
        v.id = Date.now();
        v.widget = key === "author" ? null : key;
        v.at = D.NOW;
        v.state = "live";
        D.announcements.unshift(v);
        delete S.an[key];
        render();
        window.NEST.toast(T("au.toast.anPublished"));
    }
    function renderAnnounceSection(w) {
        return (
            '<div class="banner banner-info">' + icon("megaphone") + '<div class="banner-body">' + esc(T("au.an.lede.widget", { w: w.name })) + (S.partner === "widget" ? " " + esc(T("au.an.lede.mark")) : "") + "</div></div>" +
            announceBlock(w.id, w, false)
        );
    }

    /* ---------- not an author yet ---------- */
    function renderOnboarding() {
        if (S.keyShown) {
            return (
                '<div class="onboard"><div class="card key-card" style="grid-column:1/-1;max-width:640px">' +
                '<h2 class="sec">' + icon("key") + " " + esc(T("au.key.title")) + "</h2>" +
                '<p class="dim" style="margin-bottom:8px">' + esc(T("au.key.body")) + "</p>" +
                '<div class="share"><div class="key ph">' + esc(D.author.id) + '</div><button class="btn" data-act="copy" data-text="' + esc(D.author.id) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>" +
                '<div class="row-actions" style="margin-top:12px"><button class="btn" data-act="recovery">' + icon("shield") + esc(T("au.p.recovery")) + '</button><button class="btn btn-primary" data-act="key-saved">' + esc(T("au.key.saved")) + "</button></div></div></div>"
            );
        }
        var r = S.redeem;
        var open = r.where === "onboard" && (r.error || r.value || r.emailSent);
        return (
            '<div class="onboard">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.onb.title")) + '</h2><p class="dim" style="margin-bottom:12px">' + esc(T("au.onb.lede")) + '</p><ol class="journey">' +
            ["profile", "widget", "code", "version", "catalog"]
                .map(function (k) {
                    return "<li><div><b>" + esc(T("au.onb." + k)) + "</b><span>" + esc(T("au.onb." + k + ".body")) + "</span></div></li>";
                })
                .join("") +
            "</ol></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.create.heading")) + '</h2><p class="dim" style="margin-bottom:10px">' + esc(T("au.create.intro")) + "</p>" +
            profileFields({}) +
            '<div class="row-actions" style="margin-top:10px"><button class="btn btn-primary" data-act="create-author">' + esc(T("au.create.action")) + "</button></div>" +
            '<details class="more" style="margin-top:12px"' + (open ? " open" : "") + "><summary>" + icon("chevron-right", "sm") + esc(T("au.have.heading")) + "</summary>" +
            '<p class="hint" style="margin:4px 0 8px">' + esc(T("au.have.hint")) + "</p>" +
            '<label class="field" style="margin-bottom:8px"><span>' + esc(T("au.p.pastePlaceholder")) + '</span><input class="input mono" id="redeem-value" value="' + esc(r.where === "onboard" ? r.value : "") + '"/></label>' +
            '<label class="field" style="margin-bottom:8px"><span>' + esc(T("au.redeem.label")) + '</span><input class="input" id="redeem-label" value="' + esc(D.author.machine) + '"/><span class="hint">' + esc(T("au.keys.renameHint")) + "</span></label>" +
            (r.error && r.where === "onboard" ? '<p class="err">' + esc(r.error) + "</p>" : "") +
            '<div class="row-actions"><button class="btn btn-primary" data-act="redeem">' + esc(T("au.p.verify")) + "</button></div>" +
            redeemExamples("redeem-value") +
            '<details class="more" style="margin-top:10px"' + (r.emailSent ? " open" : "") + "><summary>" + icon("chevron-right", "sm") + esc(T("au.email.recover")) + "</summary>" +
            '<p class="hint" style="margin:4px 0">' + esc(T("au.email.recoverHint")) + "</p>" +
            '<div class="share"><input class="input" type="email" value="' + esc(D.author.email) + '"/><button class="btn" data-act="recover-email">' + icon("send") + esc(T("au.email.recoverSend")) + "</button></div>" +
            (r.emailSent ? '<p class="dim small" style="margin-top:6px">' + esc(T("au.email.recoverSent")) + "</p>" : "") +
            "</details>" +
            "</details>" +
            "</div></div>"
        );
    }

    /* ---------- the «ключ или код» box: what each kind of paste does ---------- */
    function sameCode(input, code) {
        var norm = function (s) {
            return s.toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
        };
        return norm(input) === norm(code);
    }
    function addKey(label, member, origin) {
        var id = "k" + (D.author.keys.length + 1);
        D.author.keys.push({ id: id, label: label || D.author.machine, member: member, origin: origin, added: D.NOW, lastUsed: D.NOW });
        return id;
    }
    function redeem(where, value, label) {
        var v = (value || "").trim();
        var c = D.author.codes;
        S.redeem.where = where;
        S.redeem.value = v;
        if (!v) {
            S.redeem.error = T("au.redeem.empty");
            render();
            return;
        }
        var dest = "#/";
        if (sameCode(v, c.invitation)) {
            S.author = "maintainer";
        } else if (sameCode(v, c.pairing)) {
            S.author = "yes";
            S.thisKey = addKey(label, null, "pairing");
        } else if (sameCode(v, c.recovery) || (S.redeem.emailSent && sameCode(v, c.email))) {
            S.author = "yes";
            S.thisKey = addKey(label, null, sameCode(v, c.recovery) ? "recovery" : "email");
            if (sameCode(v, c.recovery)) {
                D.author.recoverySetAt = null;
                S.recoveryUsed = true;
            }
            dest = "#/profile";
        } else if (/^[A-Za-z0-9_-]{43}$/.test(v)) {
            S.author = "yes";
        } else {
            S.redeem.error = T("au.redeem.unknown");
            render();
            return;
        }
        S.redeem = { value: "", error: null, emailSent: false };
        S.keyShown = false;
        closeDialog();
        go(dest);
        window.NEST.toast(T("au.toast.joined"));
    }
    function renderUnreadable() {
        return '<div class="onboard"><div class="card notice-danger" style="grid-column:1/-1;max-width:640px"><h2 class="sec">' + esc(T("au.unreadable.heading")) + '</h2><p class="dim">' + esc(T("au.unreadable.body")) + "</p></div></div>";
    }

    /* ---------- the user's side: the Каталог and Мои виджеты tabs ---------- */
    /* The approved versions users can read, newest first. The pending update is drawn as approved
       today, and the "several versions behind" example adds the invented versions between. */
    function uvHistory(f, v) {
        var list = [];
        if (v && v.state !== "approved") list.push({ v: v.v, released: D.NOW, notesRu: v.notesRu, ph: true });
        if (S.uvCase === "three") {
            D.userView.between.forEach(function (x) {
                list.push({ v: x.v, released: x.released, notesRu: x.notesRu, revoked: x.revoked, ph: true });
            });
        }
        f.versions.forEach(function (x) {
            if (x.state === "approved") list.push({ v: x.v, released: x.decided, notesRu: x.notesRu, ph: x.ph });
        });
        return list.sort(function (a, b) {
            return cmpV(b.v, a.v);
        });
    }
    /* A heading whose date is invented: the key's {date} is swapped for a dashed span after escaping. */
    function uvDated(key, vars, ms) {
        vars.date = "\u0001";
        return esc(T(key, vars)).replace("\u0001", ph(fmtDate(ms), true));
    }
    /* «v1.0.2 · 22.09.2026», a «отозвана» chip, then the notes. The page block clamps them to four
       lines with the full text in the tooltip; the history shows them whole. */
    function uvItem(x, installed, clamp) {
        var notes = x.notesRu || "";
        return (
            '<div class="wn-item"><div class="ln"><span class="v">v' + esc(x.v) + "</span> · " + ph(fmtDate(x.released), true) +
            (installed && x.v === installed ? '<span class="chip chip-accent">' + esc(T("au.uv.history.installed")) + "</span>" : "") +
            (x.revoked ? '<span class="chip chip-danger" title="' + esc(T("au.uv.history.revokedTip")) + '">' + esc(T("au.uv.history.revoked")) + "</span>" : "") +
            "</div>" +
            (notes ? '<div class="quote' + (clamp ? " clamp4" : "") + (x.ph ? " ph" : "") + '"' + (clamp ? ' title="' + esc(notes) + '"' : "") + ">" + esc(notes) + "</div>" : "") +
            "</div>"
        );
    }
    function renderUserView() {
        var f = find("funding-monitor") || D.widgets[0];
        var r = find("liquidation-radar") || D.widgets[1];
        var v = pendingOf(f) || latest(f);
        var notes = (v && v.notesRu) || "";
        var history = uvHistory(f, v);
        var served = history[0];
        var installed = S.uvUpdated ? served.v : D.userView.installed;
        /* the «Colibri 1.3.1» case: the update needs a newer terminal, so it is not offered and the
           installed version keeps working */
        var needs = S.uvCase === "old" && v && v.minColibri ? v.minColibri : null;
        var waiting = !needs && cmpV(served.v, installed) > 0;
        var blocked = needs && cmpV(served.v, installed) > 0;
        var needsLine = blocked ? '<div class="wn" style="color:var(--warn)">' + icon("warn", "sm") + " " + esc(T("au.uv.needsColibri", { v: served.v, min: needs })) + "</div>" : "";
        var since = history.filter(function (x) {
            return cmpV(x.v, installed) > 0;
        });
        var block = waiting
            ? '<div class="wn-block"><h3>' + esc(T("au.uv.since", { v: installed })) + "</h3>" + since.map(function (x) {
                  return uvItem(x, null, true);
              }).join("") + "</div>"
            : served.notesRu
              ? '<div class="wn-block"><h3>' + uvDated("au.uv.dated", { v: served.v }, served.released) + '</h3><div class="quote clamp4 ph" title="' + esc(served.notesRu) + '">' + esc(served.notesRu) + "</div></div>"
              : "";
        var historyHtml =
            '<button type="button" class="btn btn-sm btn-link uv-hist-toggle" data-act="uv-history">' + icon("clock", "sm") + " " + esc(T(S.uvHistory ? "au.uv.history.hide" : "au.uv.history.show")) + "</button>" +
            (S.uvHistory ? '<div class="uv-hist">' + history.map(function (x) {
                return uvItem(x, installed, false);
            }).join("") + "</div>" : "");
        var updateBtn = function (cls, label) {
            return '<button class="btn ' + cls + ' btn-fetch" data-act="uv-update">' + esc(label) + "</button>";
        };
        return (
            '<div class="uv"><div>' +
            '<div class="banner banner-info">' + icon("eye") + '<div class="banner-body">' + esc(T("au.uv.banner", { v: v ? v.v : "" })) + ' <a href="#" data-act="tab" data-tab="author">' + esc(T("au.uv.back")) + "</a></div></div>" +
            '<div class="uv-case"><span class="dim small">' + esc(T("au.uv.case.label", { v: D.userView.installed })) + '</span><div class="seg">' +
            '<button type="button" data-act="uv-case" data-v="one" aria-pressed="' + (S.uvCase !== "three") + '">' + esc(T("au.uv.case.one")) + "</button>" +
            '<button type="button" data-act="uv-case" data-v="three" aria-pressed="' + (S.uvCase === "three") + '">' + esc(T("au.uv.case.three")) + "</button>" +
            '<button type="button" data-act="uv-case" data-v="old" aria-pressed="' + (S.uvCase === "old") + '">' + esc(T("au.uv.case.old")) + "</button></div></div>" +
            '<h3 class="uv-sub">' + esc(T("au.uv.tab.catalog")) + "</h3>" +
            '<div class="cat-row">' + wicon(f) + '<div style="min-width:0"><div class="t">' + esc(f.name) + ' <span class="by">' + esc(D.author.name) + '</span></div><div class="d">' + esc(f.descRu) + "</div>" +
            (notes && waiting ? '<div class="wn" title="' + esc(notes) + '"><b>' + esc(T("au.uv.whatsNewIn", { v: v.v })) + ":</b> " + ph(notes.split("\n")[0], true) + "</div>" : "") +
            needsLine +
            "</div>" +
            (waiting ? updateBtn("btn-sm", T("au.uv.update")) : '<span class="dim small">' + icon("check", "sm") + " " + esc(T("au.uv.installed")) + "</span>") +
            "</div>" +
            (S.returned
                ? '<div class="cat-row">' + wicon(r) + '<div style="min-width:0"><div class="t">' + esc(r.name) + ' <span class="by">' + esc(D.author.name) + '</span></div><div class="d">' + esc(r.descRu) + '</div></div><span class="dim small">' + icon("check", "sm") + " " + esc(T("au.uv.installed")) + "</span></div>"
                : '<div class="cat-row">' + wicon(r) + '<div style="min-width:0"><div class="t">' + esc(r.name) + ' <span class="by">' + esc(D.author.name) + "</span></div>" +
                  '<div class="d" style="color:var(--danger)">⛔ ' + ph(T("au.uv.revoked", { v: "1.1.0", reason: T("au.uv.revokedReason") }), true) + "</div></div>" +
                  '<div class="row-actions"><button class="btn btn-sm btn-fetch" data-act="uv-return" title="' + esc(T("au.uv.returnHint")) + '">' + esc(T("au.uv.returnTo", { v: "1.0.0" })) + '</button><button class="btn btn-sm" data-toast="au.toast.later">' + esc(T("au.uv.remove")) + "</button></div></div>") +
            /* «Мои виджеты»: the installed row offers the update itself, with the same one-line teaser */
            '<h3 class="uv-sub">' + esc(T("au.uv.tab.myWidgets")) + "</h3>" +
            '<div class="cat-row my-row">' + wicon(f) + '<div style="min-width:0"><div class="t">' + esc(f.name) + ' <span class="by mono">' + esc(installed) + "</span></div>" +
            (waiting && notes ? '<div class="wn" title="' + esc(notes) + '"><b>' + esc(T("au.uv.whatsNewIn", { v: served.v })) + ":</b> " + ph(notes.split("\n")[0], true) + "</div>" : blocked ? needsLine : '<div class="d">' + esc(T("au.uv.running")) + "</div>") +
            '</div><div class="row-actions">' + (waiting ? updateBtn("btn-sm", T("au.uv.updateTo", { v: served.v })) : "") +
            '<button class="btn btn-sm btn-icon" data-toast="au.toast.later" aria-label="⋯">⋯</button><span class="uv-switch" aria-hidden="true"></span></div></div>' +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.uv.noNotesRule")) + " " + esc(T("au.uv.sinceRule")) + "</p>" +
            uvLifecycle() +
            "</div>" +
            '<div class="card listing"><div class="row-actions">' + wicon(f, true) + "<div><h2>" + esc(f.name) + ' <span class="by mono">' + esc(served.v) + '</span></h2><span class="dim small">' + esc(D.author.name) + " · " + esc(catLabel(f.category)) + "</span></div></div>" +
            '<p style="margin-top:8px">' + esc(f.descRu) + "</p>" +
            uvPagePeek(f) +
            block +
            historyHtml +
            (waiting ? '<div class="impact" style="margin-top:10px"><h4>' + icon("shield", "sm") + " " + esc(T("au.uv.consent.title")) + '</h4><p class="dim small">' + esc(T("au.uv.consent.body", { host: "www.okx.com" })) + "</p></div>" : "") +
            (blocked ? '<div class="impact" style="margin-top:10px"><h4>' + icon("warn", "sm") + " " + esc(T("au.uv.needsColibri.title", { min: needs })) + '</h4><p class="dim small">' +
                esc(T("au.uv.needsColibri.body", { v: served.v, min: needs, have: "1.3.1", installed: installed })) + "</p></div>" : "") +
            (waiting ? '<div class="row-actions" style="margin-top:12px">' + updateBtn("", T("au.uv.updateTo", { v: served.v })) + "</div>" : "") +
            "</div></div>"
        );
    }

    /* What a user sees when the author ends a widget's life or hands it over: the catalog row as
       someone without the widget sees it, and the «Мои виджеты» row of someone who has it. The cases
       are drawn on «Старый тикер» whatever its state on the author's side. Nothing here stops the
       widget: every line says it keeps working. */
    var UV_LIFE = ["normal", "deprecated", "link", "withdrawn", "takendown", "gone", "owner"];
    function uvLifecycle() {
        var x = find("b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954");
        if (!x) return "";
        var c = S.uvLife;
        var succ = successorName(x.successor || "crypto-market-map");
        var next = "2.2.0";
        var byline = c === "owner" ? D.incoming.from : D.author.name;
        var seg = UV_LIFE.map(function (k) {
            return '<button type="button" data-act="uv-life" data-v="' + k + '" aria-pressed="' + (c === k) + '">' + esc(T("au.uv.life." + k)) + "</button>";
        }).join("");
        var openSucc = '<button class="btn btn-sm" data-act="uv-open-successor">' + esc(T("au.uv.life.openSuccessor")) + "</button>";
        var head = '<div class="t">' + esc(x.name) + ' <span class="by">' + esc(byline) + "</span>";
        /* the catalog: a deprecated widget is still there, last in every order; the others are not */
        var cat;
        if (c === "normal" || c === "owner" || c === "deprecated") {
            var catLine = c === "deprecated" ? '<div class="d life-line">' + icon("warn", "sm") + " " + esc(T("au.uv.life.catDeprecated", { name: succ })) + "</div>"
                : c === "owner" ? '<div class="d">' + esc(T("au.uv.life.ownerSince", { date: fmtDate(D.NOW - 6 * D.DAY) })) + "</div>"
                : '<div class="d">' + esc(x.descRu) + "</div>";
            cat =
                '<div class="cat-row">' + wicon(x) + '<div style="min-width:0">' + head + (c === "deprecated" ? ' <span class="chip chip-warn">' + esc(T("au.dep.chip")) + "</span>" : "") + "</div>" + catLine + "</div>" +
                '<div class="row-actions">' + (c === "deprecated" ? openSucc : "") + '<button class="btn btn-sm btn-fetch" data-act="' + (c === "deprecated" ? "uv-install-dep" : "uv-install") + '">' + esc(T("au.uv.life.install")) + "</button></div></div>";
        } else cat = '<p class="hint" style="padding:4px 2px">' + esc(T("au.uv.life.notInCatalog." + c)) + "</p>";
        /* «Мои виджеты»: the line under the name, and an update only while one can still come */
        var updates = c === "link" || c === "owner";
        var mine;
        if (c === "deprecated") mine = '<div class="d life-line">' + icon("warn", "sm") + " " + esc(T("au.uv.life.myDeprecated", { name: succ })) + "</div>";
        else if (c === "withdrawn" || c === "takendown" || c === "gone") mine = '<div class="d life-line">' + icon("warn", "sm") + " " + esc(T("au.uv.life.my." + c)) + "</div>";
        else if (c === "owner") mine = '<div class="d life-line">' + icon("transfer", "sm") + " " + esc(T("au.uv.life.myOwner", { from: D.incoming.from, date: fmtDate(D.NOW - 6 * D.DAY) })) + "</div>";
        else if (c === "link") mine = '<div class="d">' + esc(T("au.uv.life.myLink")) + "</div>";
        else mine = '<div class="d">' + esc(T("au.uv.running")) + "</div>";
        var my =
            '<div class="cat-row my-row">' + wicon(x) + '<div style="min-width:0"><div class="t">' + esc(x.name) + ' <span class="by mono">2.1.0</span></div>' + mine + "</div>" +
            '<div class="row-actions">' + (c === "deprecated" ? openSucc : "") + (updates ? '<button class="btn btn-sm btn-fetch" data-act="uv-life-update">' + esc(T("au.uv.updateTo", { v: next })) + "</button>" : "") +
            '<button class="btn btn-sm btn-icon" data-toast="au.toast.later" aria-label="⋯">⋯</button><span class="uv-switch" aria-hidden="true"></span></div></div>';
        return (
            '<h3 class="uv-sub" style="margin-top:22px">' + esc(T("au.uv.life.heading", { name: x.name })) + "</h3>" +
            '<div class="uv-case"><div class="seg">' + seg + "</div></div>" +
            '<p class="hint" style="margin:2px 0 6px">' + esc(T("au.uv.life.case." + c)) + "</p>" +
            '<div class="dim small" style="margin:8px 0 4px">' + esc(T("au.uv.life.catalogAs")) + "</div>" + cat +
            '<div class="dim small" style="margin:10px 0 4px">' + esc(T("au.uv.life.mineAs")) + "</div>" + my +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.uv.life.rule")) + "</p>"
        );
    }
    /* installing a deprecated widget asks first, and the replacement is one click away */
    function installDeprecatedDialog() {
        var x = find("b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954");
        var e = catalogEntry(x.successor || "crypto-market-map");
        S.dlg = "install-dep";
        openDialog(
            "mid",
            dlgHead(T("au.uv.life.dlg.title", { name: x.name })) +
                "<p>" + esc(T("au.uv.life.dlg.body", { name: e.name, author: e.author })) + "</p>" +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn" data-act="uv-open-successor">' + esc(T("au.uv.life.openSuccessor")) + '</button><button class="btn btn-primary" data-act="uv-install">' + esc(T("au.uv.life.dlg.anyway")) + "</button></div>"
        );
    }

    /* the listing card's glimpse of the page: the pictures in a strip, and the way to the whole page */
    function uvPagePeek(w) {
        var p = pageOf(w);
        var strip = p.shots.length
            ? '<div class="uv-peek">' + p.shots.slice(0, 3).map(function (s) {
                  return '<div class="shot">' + shotArt(s.art) + "</div>";
              }).join("") + "</div>"
            : "";
        return strip + '<button class="btn btn-sm" style="margin-top:8px" data-act="lp-page" data-id="' + esc(w.id) + '">' + icon("eye", "sm") + esc(T("au.uv.openPage")) + "</button>";
    }

    /* ================================================================== dialogs */
    var dlg;
    function openDialog(cls, inner) {
        dlg.className = cls || "";
        dlg.innerHTML = inner;
        if (!dlg.open) dlg.showModal();
    }
    function closeDialog() {
        if (dlg && dlg.open) dlg.close();
        S.dlg = null;
    }
    function dlgHead(title) {
        return '<div class="dlg-head"><h2>' + esc(title) + '</h2><button class="x btn btn-icon" data-act="dlg-close" aria-label="' + esc(T("au.close")) + '">' + icon("x") + "</button></div>";
    }
    function confirmDialog(title, body, okLabel, okAct, danger, extraAttrs) {
        S.dlg = "confirm";
        openDialog("mid", dlgHead(title) + "<p>" + body + '</p><div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" data-act="' + okAct + '" ' + (extraAttrs || "") + ">" + esc(okLabel) + "</button></div>");
    }

    /* ---------- keys, recovery, co-maintainers: dialogs ---------- */
    var PAIR_MS = 15 * 60 * 1000;
    function codeBox(code) {
        return '<div class="share"><div class="code-box ph">' + esc(code) + '</div><button class="btn" data-act="copy" data-text="' + esc(code) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>";
    }
    function pairingDialog() {
        S.dlg = "pairing";
        S.code = { kind: "pairing", until: Date.now() + PAIR_MS };
        drawPairing();
    }
    function drawPairing() {
        var left = S.code.until - Date.now();
        openDialog(
            "mid",
            dlgHead(T("au.pair.title")) +
                '<p class="dim">' + esc(T("au.pair.body")) + "</p>" +
                (left > 0
                    ? codeBox(D.author.codes.pairing) + '<p class="hint" style="margin-top:6px">' + icon("clock", "sm") + ' <span id="pair-left">' + esc(T("au.pair.expires", { left: mmss(left) })) + "</span></p>"
                    : '<p class="err">' + esc(T("au.pair.expired")) + "</p>") +
                '<div class="actions">' + (left > 0 ? "" : '<button class="btn" data-act="add-device">' + esc(T("au.pair.again")) + "</button>") + '<button class="btn btn-primary" data-act="dlg-close">' + esc(T("au.close")) + "</button></div>"
        );
    }
    /* the countdown ticks only while the pairing dialog is on screen */
    setInterval(function () {
        if (!S.code || S.dlg !== "pairing" || !dlg || !dlg.open) return;
        var left = S.code.until - Date.now();
        var el = document.getElementById("pair-left");
        if (left <= 0) drawPairing();
        else if (el) el.textContent = T("au.pair.expires", { left: mmss(left) });
    }, 1000);
    function inviteDialog(err) {
        S.dlg = "invite";
        openDialog(
            "mid",
            dlgHead(T("au.invite.title")) +
                '<label class="field"><span>' + esc(T("au.invite.name")) + '</span><input class="input" id="invite-name" autofocus/><span class="hint">' + esc(T("au.invite.nameHint")) + "</span></label>" +
                (err ? '<p class="err">' + esc(err) + "</p>" : "") +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="do-invite">' + esc(T("au.invite.create")) + "</button></div>"
        );
    }
    function inviteCodeDialog(name) {
        S.dlg = "invite-code";
        openDialog(
            "mid",
            dlgHead(T("au.invite.title") + " · " + name) +
                '<p class="dim">' + esc(T("au.invite.body")) + "</p>" +
                codeBox(D.author.codes.invitation) +
                '<div class="actions"><button class="btn btn-primary" data-act="dlg-close">' + esc(T("au.close")) + "</button></div>"
        );
    }
    function recoveryDialog() {
        S.dlg = "recovery";
        openDialog(
            "mid",
            dlgHead(T("au.recovery.title")) +
                '<p class="dim">' + esc(T("au.recovery.body")) + "</p>" +
                codeBox(D.author.codes.recovery) +
                '<div class="actions"><button class="btn btn-primary" data-act="recovery-saved">' + esc(T("au.recovery.saved")) + "</button></div>"
        );
    }
    function renameDialog(k) {
        S.dlg = "rename";
        openDialog(
            "mid",
            dlgHead(T("au.keys.renameTitle")) +
                '<label class="field"><input class="input" id="rename-value" value="' + esc(k.label) + '"/><span class="hint">' + esc(T("au.keys.renameHint")) + "</span></label>" +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="do-rename-key" data-id="' + esc(k.id) + '">' + esc(T("au.save")) + "</button></div>"
        );
    }
    function emailDialog() {
        S.dlg = "email";
        openDialog(
            "mid",
            dlgHead(T("au.email.title")) +
                '<p class="dim">' + esc(T("au.email.sent", { email: D.author.email })) + "</p>" +
                '<div class="share"><input class="input mono" id="email-code" placeholder="' + esc(T("au.email.codePh")) + '"/><button class="btn btn-primary" data-act="do-verify-email">' + esc(T("au.email.confirm")) + "</button></div>" +
                '<div class="mock-examples">' + esc(T("au.redeem.examples")) + ' <button class="btn btn-link btn-sm" data-act="redeem-example" data-target="email-code" data-text="' + esc(D.author.codes.email) + '">' + esc(T("au.email.codePh")) + "</button></div>"
        );
    }

    function newWidgetDialog() {
        S.dlg = "new";
        openDialog(
            "mid",
            dlgHead(T("au.new.heading")) +
                '<p class="hint" style="font-size:var(--fs-sm)">' + esc(T("au.new.hint")) + "</p>" +
                '<div class="fields"><label class="field"><span>' + esc(T("au.new.name")) + ' *</span><input class="input" id="n-name" maxlength="80" placeholder="' + esc(T("au.new.namePh")) + '"/></label>' +
                '<details class="more"><summary>' + icon("chevron-right", "sm") + esc(T("au.new.fillNow")) + "</summary>" +
                '<div class="stack" style="margin-top:8px"><label class="field"><span>' + esc(T("au.listing.category")) + '</span><select class="select" id="n-cat"><option value="">' + esc(T("au.listing.chooseLater")) + "</option>" +
                ["alerts", "analytics", "market-data", "trading", "portfolio", "research", "productivity", "other"]
                    .map(function (k) {
                        return '<option value="' + k + '">' + esc(catLabel(k)) + "</option>";
                    })
                    .join("") +
                '</select></label><label class="field"><span>' + esc(T("au.listing.descRu")) + '</span><textarea class="textarea" id="n-desc" maxlength="400"></textarea></label>' +
                '<div class="row-actions">' + '<span class="wicon none">' + icon("puzzle", "sm") + '</span><button class="btn btn-sm" type="button" data-toast="au.toast.iconPicked">' + esc(T("au.listing.chooseIcon")) + "</button></div></div></details>" +
                '<p class="err" id="n-err" hidden>' + esc(T("au.new.nameRequired")) + "</p></div>" +
                /* the other way a widget becomes this author's: someone hands it over with a code */
                '<p class="hint" style="margin-top:10px">' + esc(T("au.tr.in.ask")) + ' <button class="btn btn-link btn-sm" data-act="accept-transfer"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + esc(T("au.tr.in.open")) + "</button></p>" +
                '<div class="actions"><span class="hint" style="margin-right:auto;align-self:center">' + esc(T("au.new.idByNest")) + '</span><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="create-widget">' + esc(T("au.new.create")) + "</button></div>"
        );
        setTimeout(function () {
            var n = document.getElementById("n-name");
            if (n) n.focus();
        }, 30);
    }

    /* ---------- lifecycle dialogs ---------- */
    /* «Только по ссылке» from the catalog happens at once, so it says what it does first */
    function visLinkDialog(w) {
        confirmDialog(T("au.vis.link.title", { name: w.name }), esc(T("au.vis.link.body")), T("au.vis.link.ok"), "do-vis-link", false, 'data-id="' + esc(w.id) + '"');
    }
    /* the successor picker: the public catalog, searched by name or author, or no replacement at all */
    function successorDialog(w) {
        S.dlg = "successor";
        S.succ = { id: w.id, pick: w.deprecated ? w.successor || "" : "", q: "" };
        openDialog(
            "mid",
            dlgHead(T("au.dep.dlg.title", { name: w.name })) +
                '<p class="dim">' + esc(T("au.dep.dlg.body")) + "</p>" +
                '<input class="input" id="succ-q" placeholder="' + esc(T("au.dep.dlg.search")) + '" autocomplete="off"/>' +
                '<div class="succ-list" id="succ-list">' + successorRows(w) + "</div>" +
                '<p class="hint">' + esc(T("au.dep.dlg.hint")) + "</p>" +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="do-deprecate" data-id="' + esc(w.id) + '">' + esc(w.deprecated ? T("au.save") : T("au.dep.dlg.ok")) + "</button></div>"
        );
        setTimeout(function () {
            var q = document.getElementById("succ-q");
            if (q) q.focus();
        }, 30);
    }
    function successorRows(w) {
        var pick = S.succ.pick;
        var none = '<label class="radio succ-row"><input type="radio" name="succ" value=""' + (pick ? "" : " checked") + ' data-act="succ-pick"/><span class="wicon none">' + icon("x", "sm") + "</span><div><b>" + esc(T("au.dep.dlg.none")) + "</b><span>" + esc(T("au.dep.dlg.noneBody")) + "</span></div></label>";
        var list = successorCandidates(w, S.succ.q);
        var rows = list
            .map(function (e) {
                return '<label class="radio succ-row"><input type="radio" name="succ" value="' + esc(e.id) + '"' + (pick === e.id ? " checked" : "") + ' data-act="succ-pick"/>' + catIcon(e) + "<div><b>" + esc(e.name) + "</b><span>" + esc(e.author) + "</span></div></label>";
            })
            .join("");
        return none + (rows || '<p class="hint" style="padding:6px 2px">' + esc(T("au.dep.dlg.nothing")) + "</p>");
    }
    /* the transfer: first what moves and what does not, then the code — shown once */
    function transferDialog(w) {
        S.dlg = "transfer";
        var items = ["au.tr.dlg.moves", "au.tr.dlg.stays", "au.tr.dlg.review", "au.tr.dlg.marks", "au.tr.dlg.users"]
            .map(function (k) {
                return "<li>" + esc(T(k)) + "</li>";
            })
            .join("");
        openDialog(
            "mid",
            dlgHead(T("au.tr.dlg.title", { name: w.name })) +
                '<p class="dim">' + esc(T("au.tr.dlg.body")) + "</p>" +
                '<ul class="dim small" style="margin:8px 0 0 18px;display:grid;gap:4px">' + items + "</ul>" +
                (w.transfer ? '<p class="hint" style="margin-top:8px">' + esc(T("au.tr.dlg.voidsOld")) + "</p>" : "") +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="do-transfer" data-id="' + esc(w.id) + '">' + esc(T("au.tr.dlg.ok")) + "</button></div>"
        );
    }
    function transferCodeDialog(w) {
        S.dlg = "transfer-code";
        openDialog(
            "mid",
            dlgHead(T("au.tr.code.title", { name: w.name })) +
                '<p class="dim">' + esc(T("au.tr.code.body", { date: fmtDate(w.transfer.until) })) + "</p>" +
                codeBox(D.author.codes.transfer) +
                '<p class="hint" style="margin-top:6px">' + esc(T("au.tr.code.where")) + "</p>" +
                '<div class="actions"><button class="btn btn-primary" data-act="dlg-close">' + esc(T("au.tr.code.done")) + "</button></div>"
        );
    }
    /* the receiving author: the code, then what they would get and from whom, then «Принять» */
    function acceptTransferDialog(err) {
        S.dlg = "accept-transfer";
        var inc = D.incoming;
        if (S.trPreview) {
            var w = inc.widget;
            openDialog(
                "mid",
                dlgHead(T("au.tr.in.title")) +
                    '<div class="row-actions" style="gap:10px;margin:4px 0 10px">' + wicon(w, true) + '<div><b class="ph">' + esc(w.name) + '</b><div class="dim small">' + esc(T("au.tr.in.from", { from: inc.from })) + " · " + esc(catLabel(w.category)) + ' · <span class="mono">' + esc(current(w).v) + "</span></div></div></div>" +
                    '<ul class="dim small" style="margin:0 0 0 18px;display:grid;gap:4px"><li>' + esc(T("au.tr.in.gets")) + "</li><li>" + esc(T("au.tr.in.review")) + "</li><li>" + esc(T("au.tr.in.byline")) + "</li></ul>" +
                    '<p class="hint" style="margin-top:8px">' + esc(T("au.tr.in.expires", { date: fmtDate(inc.expires) })) + "</p>" +
                    '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="do-accept-transfer">' + esc(T("au.tr.in.accept")) + "</button></div>"
            );
            return;
        }
        openDialog(
            "mid",
            dlgHead(T("au.tr.in.title")) +
                '<p class="dim">' + esc(T("au.tr.in.body")) + "</p>" +
                '<div class="share"><input class="input mono" id="tr-code" placeholder="' + esc(T("au.tr.in.codePh")) + '" autocomplete="off"/><button class="btn btn-primary" data-act="preview-transfer">' + esc(T("au.tr.in.check")) + "</button></div>" +
                (err ? '<p class="err">' + esc(err) + "</p>" : "") +
                '<div class="mock-examples">' + esc(T("au.redeem.examples")) + ' <button class="btn btn-link btn-sm" data-act="redeem-example" data-target="tr-code" data-text="' + esc(inc.code) + '">' + esc(T("au.tr.in.example")) + "</button></div>"
        );
        setTimeout(function () {
            var c = document.getElementById("tr-code");
            if (c) c.focus();
        }, 30);
    }

    function linkFolderDialog(w) {
        S.dlg = "link";
        var path = "D:\\widgets\\" + (w.id.length > 20 ? "heatmap" : w.id);
        var oldId = "my-heatmap";
        openDialog(
            "mid",
            dlgHead(T("au.link.title")) +
                '<p style="margin-bottom:8px">' + esc(T("au.link.body")) + "</p>" +
                '<dl class="summary-kv"><dt>' + esc(T("au.code.folder")) + '</dt><dd class="path ph">' + esc(path) + "</dd></dl>" +
                '<div class="json-diff">{\n<span class="del">  "id": "' + esc(oldId) + '",</span>\n<span class="add">  "id": "' + esc(w.id) + '",</span>\n  "version": "0.1.0",\n  …\n}</div>' +
                '<p class="hint" style="margin-top:8px">' + esc(T("au.link.hint")) + "</p>" +
                '<div class="actions"><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="confirm-link" data-id="' + esc(w.id) + '" data-path="' + esc(path) + '">' + esc(T("au.link.ok")) + "</button></div>"
        );
    }

    /* ---------- the release wizard ---------- */
    function startWizard(id, from) {
        var w = find(id);
        var hi = highest(w);
        S.wiz = {
            id: id,
            /* a rollback: this approved version goes out again under a new number — no folder, nothing to pack */
            from: from || null,
            step: 1,
            /* "first" = nothing approved yet: the catalog choice applies and the notes are optional */
            first: !w.everApproved,
            /* major leads when users will have to act on the update (the versioning policy) */
            choice: hi ? (!from && mustAct(w) ? "major" : "patch") : "manifest",
            custom: "",
            notesRu: from ? T("au.wiz.rb.notesRu", { v: from }) : "",
            notesEn: from ? T("au.wiz.rb.notesEn", { v: from }) : "",
            packed: false,
            visibility: w.everApproved ? w.visibility || "catalog" : "catalog",
            error: null
        };
    }
    function wizVersion(w) {
        var z = S.wiz;
        var hi = highest(w);
        if (z.choice === "manifest") return w.code ? w.code.manifestVersion : "1.0.0";
        if (z.choice === "custom") return z.custom.trim();
        return bump(hi ? hi.v : w.code.manifestVersion, z.choice);
    }
    function wizVersionError(w) {
        var v = wizVersion(w);
        var hi = highest(w);
        var problem = versionProblem(v);
        if (problem) return T("au.wiz.v." + problem);
        if (hi && cmpV(v, hi.v) === 0) return T("au.wiz.v.taken", { v: hi.v });
        if (hi && cmpV(v, hi.v) < 0) return T("au.wiz.v.behind", { v: hi.v });
        return null;
    }
    function renderWizard() {
        var z = S.wiz;
        var w = find(z.id);
        /* a rollback has no archive step: number, notes, send */
        var steps = z.from ? [[1, "au.wiz.s1"], [2, "au.wiz.s2"], [4, "au.wiz.s4"]] : [[1, "au.wiz.s1"], [2, "au.wiz.s2"], [3, "au.wiz.s3"], [4, "au.wiz.s4"]];
        var stepper =
            '<ol class="stepper">' +
            steps
                .map(function (s) {
                    var n = s[0];
                    return "<li" + (n === z.step ? ' aria-current="step"' : n < z.step ? ' class="done"' : "") + ">" + esc(T(s[1])) + "</li>";
                })
                .join("") +
            "</ol>";
        var body;
        var next = "";
        var block = !z.from && !linked(w);
        if (block) {
            body =
                '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body"><b>' + esc(mismatch(w) ? T("au.code.mismatch.title") : T("au.wiz.noCode.title")) + "</b> " + esc(T("au.wiz.noCode.body")) + "</div></div>" +
                '<a class="btn btn-primary" href="#/w/' + encodeURIComponent(w.id) + '/code">' + icon("folder") + esc(T("au.next.noCode.action")) + "</a>";
        } else if (z.step === 1) body = wizStep1(w);
        else if (z.step === 2) body = wizStep2(w);
        else if (z.step === 3) body = wizStep3(w);
        else body = wizStep4(w);
        if (!block) {
            var canNext = z.step === 1 ? !wizVersionError(w) : z.step === 2 ? !wizNotesError(w) && !editorialMissing(w) : z.step === 3 ? z.packed : true;
            next =
                (z.step > 1 ? '<button class="btn" data-act="wiz-back">' + esc(T("au.wiz.back")) + "</button>" : "") +
                (z.step < 4
                    ? '<button class="btn btn-primary" data-act="wiz-next"' + (canNext ? "" : " disabled") + ">" + esc(T("au.wiz.next")) + "</button>"
                    : '<button class="btn btn-primary" data-act="wiz-submit">' + icon("upload") + esc(T("au.wiz.submit")) + "</button>");
        }
        openDialog(
            "wide",
            dlgHead(z.from ? T("au.wiz.rb.title", { v: z.from, name: w.name }) : T("au.wiz.title", { name: w.name })) + stepper + '<div class="wiz-body">' + body + "</div>" +
                '<div class="actions"><button class="btn btn-link" data-act="wiz-cancel" style="margin-right:auto">' + esc(T("au.cancel")) + "</button>" + next + "</div>"
        );
    }
    function wizSource(w) {
        var z = S.wiz;
        if (z && z.from) {
            var src = versionOf(w, z.from);
            return '<div class="src">' + icon("undo") + "<span>" + esc(T("au.wiz.rb.source", { v: z.from, date: src && src.decided ? fmtDate(src.decided) : "" })) + "</span></div>";
        }
        return '<div class="src">' + icon("folder") + '<span class="path ph">' + esc(w.code.path) + '</span><span class="dim">· ' + esc(T("au.wiz.changed", { when: fmtDT(w.code.changedAt) })) + "</span></div>";
    }
    function wizStep1(w) {
        var z = S.wiz;
        var c = current(w);
        var hi = highest(w);
        var facts =
            '<div class="facts">' +
            (c ? "<span>" + esc(T("au.wiz.lastApproved")) + " <b>" + esc(c.v) + "</b></span>" : "") +
            (hi && hi !== c ? "<span>" + esc(T("au.wiz.highest")) + " <b>" + esc(hi.v) + "</b> (" + esc(T("au.v." + (hi.state === "rejected" ? "declined" : hi.state === "refused" ? "refused" : hi.state === "pending" ? "pending" : hi.state === "withdrawn" ? "withdrawn" : "approved")).toLowerCase()) + ")</span>" : "") +
            (z.from ? "" : "<span>" + esc(T("au.wiz.inFolder")) + " <b>" + esc(w.code.manifestVersion) + "</b></span>") + "</div>";
        function radio(choice, v, title, sub) {
            return (
                '<label class="radio"><input type="radio" name="wv" data-act="wiz-choice" value="' + choice + '"' + (z.choice === choice ? " checked" : "") + "/><div><b>" + (v ? '<span class="mono">' + esc(v) + "</span> · " : "") + esc(title) + "</b>" + (sub ? "<span>" + esc(sub) + "</span>" : "") +
                (choice === "custom" ? '<input class="input input-sm inline-input" id="wiz-custom" placeholder="1.2.3" value="' + esc(z.custom) + '"/>' : "") + "</div></label>"
            );
        }
        var base = hi ? hi.v : null;
        var radios = hi
            ? radio("patch", bump(base, "patch"), T("au.wiz.v.patch"), T(!z.from && mustAct(w) ? "au.wiz.v.patchSubPlain" : "au.wiz.v.patchSub")) + radio("minor", bump(base, "minor"), T("au.wiz.v.minor"), T("au.wiz.v.minorSub")) + radio("major", bump(base, "major"), T("au.wiz.v.major"), T("au.wiz.v.majorSub")) + radio("custom", null, T("au.wiz.v.custom"), null)
            : radio("manifest", w.code.manifestVersion, T("au.wiz.v.fromManifest"), T("au.wiz.v.fromManifestSub")) + radio("custom", null, T("au.wiz.v.custom"), null);
        var err = wizVersionError(w);
        var act = z.from ? null : mustAct(w);
        return (
            wizSource(w) + facts +
            (act && hi ? '<p class="hint" style="margin:6px 0">' + icon("info", "sm") + " " + esc(T("au.wiz.v.recommendMajor." + act)) + "</p>" : "") +
            '<div class="vis">' + radios + "</div>" +
            '<p class="err" id="wiz-v-err" style="margin-top:6px"' + (err && z.choice === "custom" && z.custom ? "" : " hidden") + ">" + esc(err || "") + "</p>" +
            '<p class="hint" style="margin-top:8px">' + esc(T(z.from ? "au.wiz.rb.written" : "au.wiz.v.written")) + "</p>" +
            /* a rollback ships an approved archive and never reads the folder */
            (z.from ? "" : legacyLine(w))
        );
    }
    function versionOf(w, v) {
        for (var i = 0; i < w.versions.length; i++) if (w.versions[i].v === v) return w.versions[i];
        return null;
    }
    /* what going back changes for users: the version's declaration against the served one */
    function rollbackImpact(w) {
        var z = S.wiz;
        var src = versionOf(w, z.from) || {};
        var live = w.live || { permissions: [], egress: [] };
        var perms = src.permissions || live.permissions;
        var hosts = src.egress || live.egress;
        var items = [];
        perms.filter(function (p) {
            return live.permissions.indexOf(p) < 0;
        }).forEach(function (p) {
            items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.perm")) + " «" + esc(scopeLabel(p)) + "» — " + esc(T("au.diff.consentAgain")) + "</span></li>");
        });
        live.permissions.filter(function (p) {
            return perms.indexOf(p) < 0;
        }).forEach(function (p) {
            items.push('<li><span class="minus">−</span><span>' + esc(T("au.diff.permRemoved")) + " «" + esc(scopeLabel(p)) + "»</span></li>");
        });
        hosts.filter(function (h) {
            return live.egress.indexOf(h) < 0;
        }).forEach(function (h) {
            items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.host")) + ' <span class="mono ph">' + esc(h) + "</span> — " + esc(T("au.diff.consentAgain")) + "</span></li>");
        });
        live.egress.filter(function (h) {
            return hosts.indexOf(h) < 0;
        }).forEach(function (h) {
            items.push('<li><span class="minus">−</span><span>' + esc(T("au.diff.hostRemoved")) + ' <span class="mono">' + esc(h) + "</span></span></li>");
        });
        if (!items.length) items.push('<li><span class="same">' + icon("check", "sm") + "</span><span>" + esc(T("au.diff.codeOnly")) + "</span></li>");
        var pending = pendingOf(w);
        return (
            '<div class="impact"><h4>' + esc(T("au.wiz.impact.title")) + '</h4><ul class="chg">' + items.join("") + '</ul><p class="hint" style="margin-top:6px">' + esc(T("au.wiz.rb.verdict")) + "</p></div>" +
            (pending ? '<div class="banner banner-warn" style="margin-top:8px">' + icon("warn") + '<div class="banner-body">' + esc(T("au.wiz.rb.pendingAbove", { v: pending.v })) + "</div></div>" : "")
        );
    }
    function wizNotesError(w) {
        var z = S.wiz;
        if (z.notesRu.length > 1000 || z.notesEn.length > 1000) return T("au.wiz.notes.tooLong");
        if (!z.first && !z.notesRu.trim() && !z.notesEn.trim()) return T("au.wiz.notes.required");
        return null;
    }
    function wizStep2(w) {
        var z = S.wiz;
        var editorial = editorialMissing(w)
            ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body"><b>' + esc(T("au.wiz.editorial.title")) + "</b> " + esc(T("au.wiz.editorial.body")) + ' <a href="#/w/' + encodeURIComponent(w.id) + '/listing">' + esc(T("au.wiz.editorial.go")) + "</a></div></div>"
            : "";
        var err = wizNotesError(w);
        return (
            editorial +
            '<p class="dim" style="margin-bottom:10px">' + esc(z.first ? T("au.wiz.notes.firstHint") : T("au.wiz.notes.hint")) + "</p>" +
            '<label class="field"><span>' + esc(T("au.wiz.notes.ru")) + '</span><textarea class="textarea" id="wiz-ru" data-wiz="notesRu" maxlength="1000" placeholder="' + esc(T("au.wiz.notes.phRu")) + '">' + esc(z.notesRu) + '</textarea><span class="counter" id="wiz-ru-c">' + z.notesRu.length + " / 1000</span></label>" +
            '<label class="field" style="margin-top:8px"><span>' + esc(T("au.wiz.notes.en")) + '</span><textarea class="textarea" id="wiz-en" data-wiz="notesEn" maxlength="1000" placeholder="' + esc(T("au.wiz.notes.phEn")) + '">' + esc(z.notesEn) + '</textarea><span class="counter" id="wiz-en-c">' + z.notesEn.length + " / 1000</span></label>" +
            '<p class="err" id="wiz-notes-err"' + (err && !z.first ? "" : " hidden") + ">" + esc(err || "") + "</p>"
        );
    }
    function wizStep3(w) {
        var z = S.wiz;
        var v = wizVersion(w);
        if (!z.packed) {
            return '<div class="pack"><b>' + esc(T("au.wiz.packing", { v: v })) + '</b><div class="bar"><i id="pack-bar"></i></div><span class="hint">' + esc(T("au.wiz.packingHint")) + "</span></div>";
        }
        var size = Math.round((w.sizeBytes || 48000) * 1.04);
        var hash = fakeHash(w.id + v);
        var kv =
            '<dl class="summary-kv"><dt>' + esc(T("au.wiz.sum.version")) + '</dt><dd class="mono">' + esc(v) + ' <span class="chip chip-ok">' + esc(T("au.wiz.sum.written")) + "</span></dd>" +
            "<dt>" + esc(T("au.wiz.sum.size")) + '</dt><dd class="ph">' + fmtBytes(size) + " · 14 " + esc(T("au.wiz.sum.files")) + "</dd>" +
            "<dt>" + esc(T("au.wiz.sum.hash")) + '</dt><dd class="mono ph" style="font-size:11px">' + esc(hash) + "</dd>" +
            "<dt>" + esc(T("au.wiz.sum.entry")) + '</dt><dd class="mono">index.html</dd></dl>';
        var items = [];
        var verdict;
        if (z.first) {
            items.push('<li><span class="dim">' + esc(T("au.wiz.impact.first")) + "</span></li>");
            verdict = T("au.wiz.impact.firstVerdict");
        } else {
            var live = w.live || { permissions: [], egress: [] };
            var addP = w.code.permissions.filter(function (p) {
                return live.permissions.indexOf(p) < 0;
            });
            var remP = live.permissions.filter(function (p) {
                return w.code.permissions.indexOf(p) < 0;
            });
            var addE = w.code.egress.filter(function (h) {
                return live.egress.indexOf(h) < 0;
            });
            var remE = live.egress.filter(function (h) {
                return w.code.egress.indexOf(h) < 0;
            });
            addP.forEach(function (p) {
                items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.perm")) + " «" + esc(scopeLabel(p)) + "» — " + esc(T("au.diff.consentAgain")) + "</span></li>");
            });
            remP.forEach(function (p) {
                items.push('<li><span class="minus">−</span><span>' + esc(T("au.diff.permRemoved")) + " «" + esc(scopeLabel(p)) + "»</span></li>");
            });
            addE.forEach(function (h) {
                items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.host")) + ' <span class="mono ph">' + esc(h) + "</span> — " + esc(T("au.diff.consentAgain")) + "</span></li>");
            });
            remE.forEach(function (h) {
                items.push('<li><span class="minus">−</span><span>' + esc(T("au.diff.hostRemoved")) + ' <span class="mono">' + esc(h) + "</span></span></li>");
            });
            if (w.code.minColibri && w.code.minColibri !== live.minColibri) {
                items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.minColibri", { v: w.code.minColibri })) + " " +
                    esc(live.minColibri ? T("au.diff.minColibriWas", { v: live.minColibri }) : T("au.diff.minColibriAny")) + " — " + esc(T("au.diff.leftBehind")) + "</span></li>");
            }
            if (!items.length) {
                items.push('<li><span class="same">' + icon("check", "sm") + "</span><span>" + esc(T("au.diff.codeOnly")) + "</span></li>");
                verdict = T("au.wiz.impact.codeVerdict");
            } else verdict = T("au.wiz.impact.envelopeVerdict");
        }
        return kv + '<div class="impact"><h4>' + esc(T("au.wiz.impact.title")) + '</h4><ul class="chg">' + items.join("") + '</ul><p class="hint" style="margin-top:6px">' + esc(verdict) + "</p></div>" + legacyLine(w);
    }
    function wizStep4(w) {
        var z = S.wiz;
        var v = wizVersion(w);
        var notes = z.notesRu || z.notesEn;
        var sum =
            '<dl class="summary-kv"><dt>' + esc(T("au.col.widget")) + "</dt><dd>" + wname(w) + "</dd>" +
            "<dt>" + esc(T("au.wiz.sum.version")) + '</dt><dd class="mono">' + esc(v) + "</dd>" +
            "<dt>" + esc(T("au.col.notes")) + "</dt><dd>" + (notes ? '<div class="quote">' + esc(notes) + "</div>" : '<span class="faint">' + esc(T("au.v.noNotes")) + "</span>") + "</dd></dl>";
        /* the choice is on every release: a first version defaults to the catalog, an update to
           where the widget is now; leaving the catalog needs no moderator, entering it does */
        var cur = z.first ? null : w.visibility;
        function sub(opt) {
            if (z.first) return opt === "catalog" ? T("au.wiz.vis.catalogSub") : T("au.wiz.vis.linkSub");
            if (opt === cur) return T("au.wiz.vis.same");
            return opt === "link" ? T("au.wiz.vis.toLinkNow") : T("au.wiz.vis.toCatalogReq");
        }
        function opt(value, label) {
            return (
                '<label class="radio"><input type="radio" name="wvis" value="' + value + '" data-act="wiz-vis"' + (z.visibility === value ? " checked" : "") + "/><div><b>" + esc(label) +
                (value === cur ? ' <span class="chip">' + esc(T("au.wiz.vis.now")) + "</span>" : "") +
                '</b><span id="wvis-sub-' + value + '">' + esc(sub(value)) + "</span></div></label>"
            );
        }
        var vis =
            '<h4 style="margin:10px 0 6px">' + esc(z.first ? T("au.wiz.vis.title") : T("au.wiz.vis.titleUpdate")) + "</h4>" +
            '<div class="vis">' + opt("catalog", T("au.vis.catalog")) + opt("link", T("au.vis.link")) + "</div>" +
            (z.first ? '<p class="hint" style="margin-top:6px">' + esc(T("au.wiz.vis.firstReview")) + "</p>" : "");
        var err = z.error ? '<div class="banner banner-error" style="margin-top:10px">' + icon("warn") + '<div class="banner-body">' + esc(z.error) + "</div></div>" : "";
        return sum + (z.from ? '<div style="margin-top:10px">' + rollbackImpact(w) + "</div>" : "") + vis + err;
    }
    function wizPack() {
        var z = S.wiz;
        setTimeout(function () {
            var bar = document.getElementById("pack-bar");
            if (bar) bar.style.width = "100%";
        }, 30);
        setTimeout(function () {
            if (S.wiz === z && z.step === 3) {
                z.packed = true;
                renderWizard();
            }
        }, 1100);
    }
    function wizSubmit() {
        var z = S.wiz;
        var w = find(z.id);
        if (S.author === "offline") {
            z.error = T("au.wiz.offline");
            renderWizard();
            return;
        }
        var v = wizVersion(w);
        var nv = { v: v, state: "checking", progress: 0, submitted: D.NOW, notesRu: z.notesRu.trim(), notesEn: z.notesEn.trim(), thread: [], ph: true };
        if (z.from) {
            nv.rereleaseOf = z.from;
            var src = versionOf(w, z.from) || {};
            var gone = (w.live ? w.live.egress : []).filter(function (h) {
                return src.egress && src.egress.indexOf(h) < 0;
            });
            if (gone.length) nv.removed = { egress: gone };
        } else if (!z.first && w.live) {
            var add = w.code.egress.filter(function (h) {
                return w.live.egress.indexOf(h) < 0;
            });
            if (add.length) nv.added = { egress: add };
        }
        w.versions.unshift(nv);
        /* a rollback never touches the folder */
        if (!z.from) w.code.manifestVersion = v;
        if (!w.share) w.share = "Nw3Qe8Rt1Yu6Io9Pa4Sd7Fg2Hj5Kl0Zx3Cv8Bn1Mq6W";
        var vis = z.visibility;
        var first = z.first;
        if (first) w.catalogRequested = vis === "catalog";
        else if (vis === "catalog" && w.visibility === "link") w.catalogRequested = true;
        S.open[w.id + "@" + v] = true;
        S.wiz = null;
        closeDialog();
        location.hash = "#/w/" + encodeURIComponent(w.id) + "/versions";
        window.NEST.toast(T("au.toast.sent", { v: v }));
        var tick = setInterval(function () {
            nv.progress += 3;
            var done = nv.progress >= RUNGS.length;
            if (done) {
                clearInterval(tick);
                nv.state = "pending";
                nv.due = addWorkingDays(D.NOW, 3);
                window.NEST.toast(T("au.toast.passed", { v: v }));
                if (!first && vis === "link" && w.visibility === "catalog") {
                    w.visibility = "link";
                    w.state = "link";
                    w.catalogRequested = false;
                    window.NEST.toast(T("au.toast.nowLinkOnly"));
                }
            }
            /* skip a frame while the reviewer is typing somewhere on the page */
            var a = document.activeElement;
            if (done || !a || !root.contains(a) || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) render();
        }, 450);
    }

    /* ================================================================== events */
    function onClick(e) {
        var openRow = e.target.closest("[data-open-row]");
        if (openRow) S.open[openRow.getAttribute("data-open-row")] = true;
        var tabBtn = e.target.closest(".win-tabs [data-tab]");
        if (tabBtn) {
            S.tab = tabBtn.getAttribute("data-tab");
            render();
            return;
        }
        var el = e.target.closest("[data-act]");
        if (!el) return;
        var act = el.getAttribute("data-act");
        var id = el.getAttribute("data-id");
        var key = el.getAttribute("data-key");
        var w = id ? find(id) : null;
        var parts = key ? key.split("@") : null;
        var kv = parts ? findVersion(parts[0], parts[1]) : null;
        switch (act) {
            case "tab":
                e.preventDefault();
                S.tab = el.getAttribute("data-tab");
                render();
                break;
            case "bell":
                S.bell = !S.bell;
                if (S.bell) {
                    S.bellNew = bellUnread();
                    S.bellSeen = true;
                } else S.bellNew = 0;
                render();
                break;
            case "bell-close":
                S.bell = false;
                S.bellNew = 0;
                break;
            case "new-widget":
                newWidgetDialog();
                break;
            case "create-widget":
                createWidget();
                break;
            case "dlg-close":
                if (S.wiz) return wizCancel();
                closeDialog();
                break;
            case "copy":
                if (navigator.clipboard) navigator.clipboard.writeText(el.getAttribute("data-text")).catch(function () {});
                window.NEST.toast(T("action.copied"));
                break;
            case "toggle-row":
                S.open[key] = !S.open[key];
                render();
                break;
            case "edit-notes":
                S.open[key] = true;
                S.editing = key;
                render();
                break;
            case "cancel-notes":
                S.editing = null;
                render();
                break;
            case "save-notes":
                kv.notesRu = (document.getElementById("edit-ru") || {}).value || "";
                kv.notesEn = (document.getElementById("edit-en") || {}).value || "";
                S.editing = null;
                render();
                window.NEST.toast(T("au.toast.notesSaved"));
                break;
            case "withdraw-version":
                confirmDialog(T("au.v.withdraw.title", { v: parts[1] }), esc(T("au.v.withdraw.body", { v: parts[1] })), T("au.v.withdraw.ok"), "do-withdraw-version", true, 'data-key="' + esc(key) + '"');
                break;
            case "do-withdraw-version":
                kv.state = "withdrawn";
                kv.decided = D.NOW;
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.versionWithdrawn", { v: parts[1] }));
                break;
            case "reply":
                var ta = document.getElementById("reply-" + key);
                if (ta && ta.value.trim()) {
                    kv.thread.push({ from: "author", at: D.NOW, body: ta.value.trim() });
                    render();
                    window.NEST.toast(T("au.toast.messageSent"));
                }
                break;
            case "withdraw":
                confirmDialog(T("au.withdraw.title", { name: w.name }), esc(T("au.withdraw.tip")), T("au.withdraw"), "do-withdraw", false, 'data-id="' + esc(id) + '"');
                break;
            case "do-withdraw":
                w.state = "withdrawn";
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.withdrawn"));
                break;
            case "restore":
                w.state = w.visibility === "link" ? "link" : "live";
                render();
                window.NEST.toast(T("au.toast.restored"));
                break;
            case "delete":
                confirmDialog(T("au.delete.title"), esc(T("au.delete.body", { name: w.name })), T("au.delete"), "do-delete", true, 'data-id="' + esc(id) + '"');
                break;
            case "do-delete":
                widgets().splice(widgets().indexOf(w), 1);
                closeDialog();
                go("#/");
                window.NEST.toast(T("au.toast.deleted"));
                break;
            /* lifecycle: the visibility switch, out of date with a successor, transfer by code */
            case "do-vis-link":
                w.visibility = "link";
                w.catalogRequested = false;
                if (w.state === "live") w.state = "link";
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.nowLinkOnly"));
                break;
            case "deprecate":
                successorDialog(w);
                break;
            case "succ-pick":
                S.succ.pick = el.value;
                break;
            case "do-deprecate": {
                var was = w.deprecated;
                w.deprecated = true;
                w.successor = S.succ.pick || null;
                closeDialog();
                render();
                window.NEST.toast(was ? T("au.toast.successorSaved") : T("au.toast.deprecated"));
                break;
            }
            case "undeprecate":
                w.deprecated = false;
                w.successor = null;
                render();
                window.NEST.toast(T("au.toast.undeprecated"));
                break;
            case "transfer":
                transferDialog(w);
                break;
            case "do-transfer":
                w.transfer = { until: D.NOW + 7 * D.DAY };
                render();
                transferCodeDialog(w);
                break;
            case "cancel-transfer":
                w.transfer = null;
                render();
                window.NEST.toast(T("au.toast.transferCancelled"));
                break;
            case "accept-transfer":
                S.trPreview = false;
                acceptTransferDialog();
                break;
            case "preview-transfer": {
                var tc = (document.getElementById("tr-code") || {}).value || "";
                if (!sameCode(tc, D.incoming.code)) acceptTransferDialog(T("au.tr.in.unknown"));
                else {
                    S.trPreview = true;
                    acceptTransferDialog();
                }
                break;
            }
            case "do-accept-transfer": {
                var got = D.incoming.widget;
                if (!find(got.id)) {
                    got.ownerSince = D.NOW;
                    got.ownerFrom = D.incoming.from;
                    widgets().unshift(got);
                }
                S.trPreview = false;
                S.received = got.id;
                closeDialog();
                go("#/w/" + encodeURIComponent(got.id) + "/access");
                window.NEST.toast(T("au.toast.transferAccepted", { name: got.name }));
                break;
            }
            case "save-listing":
                saveListing(w);
                break;
            case "revert-listing":
                S.ld = null;
                render();
                break;
            case "lp-lang": {
                var langs = draftOf(w).languages;
                var at = langs.indexOf(el.getAttribute("data-v"));
                if (at >= 0) langs.splice(at, 1);
                else langs.push(el.getAttribute("data-v"));
                render();
                break;
            }
            case "lp-feature-add":
                draftOf(w).features.push({ titleRu: "", titleEn: "", bodyRu: "", bodyEn: "" });
                render();
                break;
            case "lp-feature-remove":
                draftOf(w).features.splice(Number(el.getAttribute("data-i")), 1);
                render();
                break;
            case "lp-feature-up": {
                var fs = draftOf(w).features;
                var fi = Number(el.getAttribute("data-i"));
                fs.splice(fi - 1, 0, fs.splice(fi, 1)[0]);
                render();
                break;
            }
            /* pictures apply at once, like the icon; the form's unsaved text is left as it was */
            case "lp-shot-add": {
                var shots = pageOf(w).shots;
                shots.push({ rev: fakeHash(w.id + shots.length + Date.now()).slice(0, 6), art: ARTS[(shots.length + 3) % ARTS.length] });
                S.lpErr = null;
                render();
                window.NEST.toast(T("au.toast.shotAdded"));
                break;
            }
            case "lp-shot-remove":
                pageOf(w).shots.splice(Number(el.getAttribute("data-i")), 1);
                render();
                window.NEST.toast(T("au.toast.shotRemoved"));
                break;
            case "lp-shot-move": {
                var ss = pageOf(w).shots;
                var si = Number(el.getAttribute("data-i"));
                ss.splice(si + Number(el.getAttribute("data-d")), 0, ss.splice(si, 1)[0]);
                render();
                break;
            }
            case "lp-shot-bad":
                S.lpErr = T(el.getAttribute("data-why") === "size" ? "au.lp.err.shotSize" : "au.lp.err.shotFormat");
                render();
                break;
            case "lp-cover-set":
                pageOf(w).cover = true;
                render();
                window.NEST.toast(T("au.toast.coverSaved"));
                break;
            case "lp-cover-remove":
                pageOf(w).cover = false;
                render();
                window.NEST.toast(T("au.toast.coverRemoved"));
                break;
            case "lp-preview":
                pageDialog(w, true);
                break;
            case "lp-page":
                pageDialog(w, false);
                break;
            case "pg-shot":
                S.pg.shot = Number(el.getAttribute("data-i"));
                drawPage();
                break;
            case "pg-about":
                S.pg.aboutOpen = !S.pg.aboutOpen;
                drawPage();
                break;
            case "pg-video":
                window.NEST.toast(T("au.toast.videoOpens"));
                break;
            case "pg-link":
                e.preventDefault();
                window.NEST.toast(T("au.toast.linkOpens"));
                break;
            case "choose-icon":
                w.iconSet = true;
                render();
                window.NEST.toast(w.everApproved && w.visibility === "catalog" ? T("au.toast.iconWaiting") : T("au.toast.iconSaved"));
                break;
            case "hot":
                w.code.hot = !w.code.hot;
                render();
                break;
            case "link-folder":
                linkFolderDialog(w);
                break;
            case "st-open":
                openStarter(w);
                break;
            case "st-create":
                createFromStarter(find(S.st.id));
                break;
            case "st-cancel":
                cancelStarter();
                break;
            case "st-retry":
                S.starters = "ok";
                syncBar();
                render();
                break;
            case "st-parent":
                window.NEST.toast(T("au.toast.pickParent"));
                break;
            case "st-sdk":
                window.NEST.toast(T("au.toast.openSdk"));
                break;
            case "starters":
                S.starters = el.getAttribute("data-v");
                S.tab = "author";
                render();
                break;
            case "confirm-link":
                w.code = { path: el.getAttribute("data-path"), manifestId: w.id, manifestVersion: "0.1.0", changedAt: D.NOW, hot: true, permissions: ["marketData", "storage"], egress: [] };
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.linked"));
                break;
            case "unlink":
                w.code = null;
                render();
                break;
            case "remove-legacy": {
                /* only those fields leave widget.json; the icon file stays in the folder */
                var stripped = legacyFields(w);
                if (!stripped) break;
                w.code.legacyFields = [];
                render();
                /* an open wizard is left alone by render(), so it is redrawn on its own */
                if (S.wiz) renderWizard();
                window.NEST.toast(T("au.toast.legacyRemoved", { fields: stripped.join(", ") }));
                break;
            }
            case "draft-from-folder":
                draftFromFolder(key);
                break;
            case "create-author":
                S.keyShown = true;
                render();
                break;
            case "key-saved":
                S.keyShown = false;
                S.author = "yes";
                go("#/");
                break;
            case "forget":
                confirmDialog(T("au.p.forget"), esc(T("au.p.forgetConfirm")), T("au.p.forget"), "do-forget", true);
                break;
            case "do-forget":
                closeDialog();
                S.author = "none";
                go("#/");
                break;
            case "wiz-next":
                wizNext();
                break;
            case "rollback":
                go("#/w/" + encodeURIComponent(parts[0]) + "/versions/rollback/" + encodeURIComponent(parts[1]));
                break;
            case "uv-return":
                window.NEST.toast(T("au.toast.returned", { v: "1.0.0" }));
                S.returned = true;
                render();
                break;
            case "uv-update":
                window.NEST.toast(T("au.toast.updated"));
                S.uvUpdated = true;
                render();
                break;
            case "uv-case":
                S.uvCase = el.getAttribute("data-v");
                S.uvUpdated = false;
                render();
                break;
            case "uv-history":
                S.uvHistory = !S.uvHistory;
                render();
                break;
            case "uv-life":
                S.uvLife = el.getAttribute("data-v");
                render();
                break;
            case "uv-install-dep":
                installDeprecatedDialog();
                break;
            case "uv-install":
                closeDialog();
                window.NEST.toast(T("au.toast.uvInstalled"));
                break;
            case "uv-open-successor":
                closeDialog();
                window.NEST.toast(T("au.toast.uvOpenedSuccessor", { name: successorName((find("b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954") || {}).successor || "crypto-market-map") }));
                break;
            case "uv-life-update":
                window.NEST.toast(T("au.toast.updated"));
                break;
            case "wiz-back":
                S.wiz.step = S.wiz.from && S.wiz.step === 4 ? 2 : S.wiz.step - 1;
                S.wiz.error = null;
                renderWizard();
                break;
            case "wiz-cancel":
                wizCancel();
                break;
            case "wiz-submit":
                wizSubmit();
                break;
            /* keys, recovery, co-maintainers */
            case "add-device":
                pairingDialog();
                break;
            case "invite":
                inviteDialog();
                break;
            case "do-invite": {
                var nameEl = document.getElementById("invite-name");
                var nm = nameEl ? nameEl.value.trim() : "";
                if (!nm) {
                    inviteDialog(T("au.invite.nameRequired"));
                    break;
                }
                D.author.members.push({ id: "m" + (D.author.members.length + 1), name: nm, status: "invited", expires: D.NOW + 7 * D.DAY });
                render();
                inviteCodeDialog(nm);
                break;
            }
            case "cancel-invite":
                memberById(id).status = "removed";
                render();
                window.NEST.toast(T("au.toast.inviteCancelled"));
                break;
            case "remove-member":
                confirmDialog(T("au.members.removeTitle", { name: memberName(id) }), esc(T("au.members.removeBody", { name: memberName(id) })), T("au.members.remove"), "do-remove-member", true, 'data-id="' + esc(id) + '"');
                break;
            case "do-remove-member":
                memberById(id).status = "removed";
                D.author.keys.forEach(function (k) {
                    if (k.member === id) k.revoked = true;
                });
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.memberRemoved"));
                break;
            case "rename-key":
                renameDialog(keyById(id));
                break;
            case "do-rename-key": {
                var rv = document.getElementById("rename-value");
                if (rv && rv.value.trim()) keyById(id).label = rv.value.trim();
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.keyRenamed"));
                break;
            }
            case "revoke-key": {
                var rk = keyById(id);
                confirmDialog(T("au.keys.revokeTitle", { label: rk.label }), esc(rk.id === thisKeyId() ? T("au.keys.revokeThisBody") : T("au.keys.revokeBody")), T("au.keys.revoke"), "do-revoke-key", true, 'data-id="' + esc(id) + '"');
                break;
            }
            case "do-revoke-key": {
                var gone = keyById(id);
                var wasMine = gone.id === thisKeyId();
                gone.revoked = true;
                closeDialog();
                if (wasMine) {
                    S.author = "none";
                    S.thisKey = null;
                    go("#/");
                } else render();
                window.NEST.toast(T("au.toast.keyRevoked"));
                break;
            }
            case "recovery":
                if (D.author.recoverySetAt && !S.keyShown) confirmDialog(T("au.recovery.replace"), esc(T("au.recovery.replaceBody")), T("au.recovery.replace"), "recovery-open", false);
                else recoveryDialog();
                break;
            case "recovery-open":
                recoveryDialog();
                break;
            case "recovery-saved":
                D.author.recoverySetAt = D.NOW;
                S.recoveryUsed = false;
                closeDialog();
                if (S.keyShown) {
                    S.keyShown = false;
                    S.author = "yes";
                    go("#/");
                } else render();
                break;
            case "save-profile": {
                /* a new e-mail is unconfirmed until its owner pastes the code mailed to it */
                var em = document.getElementById("p-email");
                var changed = em && em.value.trim() && em.value.trim() !== D.author.email;
                if (changed) {
                    D.author.email = em.value.trim();
                    D.author.emailVerified = false;
                }
                render();
                window.NEST.toast(changed ? T("au.toast.emailChanged") : T("au.toast.saved"));
                break;
            }
            case "verify-email":
                emailDialog();
                break;
            case "do-verify-email":
                D.author.emailVerified = true;
                closeDialog();
                render();
                window.NEST.toast(T("au.toast.emailVerified"));
                break;
            case "recover-email":
                S.redeem.where = "onboard";
                S.redeem.emailSent = true;
                render();
                break;
            case "redeem-example": {
                var target = document.getElementById(el.getAttribute("data-target"));
                if (target) {
                    target.value = el.getAttribute("data-text");
                    target.dispatchEvent(new Event("input", { bubbles: true }));
                }
                break;
            }
            case "redeem": {
                var rvEl = document.getElementById("redeem-value");
                var lbEl = document.getElementById("redeem-label");
                redeem("onboard", rvEl ? rvEl.value : "", lbEl ? lbEl.value : "");
                break;
            }
            case "replace": {
                var rp = document.getElementById("replace-value");
                var val = rp ? rp.value : "";
                /* an owner key with no recovery code: replacing it can orphan the author */
                if (val.trim() && !isMaint() && !D.author.recoverySetAt) {
                    S.redeem.where = "profile";
                    S.redeem.value = val;
                    confirmDialog(T("au.orphan.title"), esc(T("au.orphan.body")), T("au.orphan.ok"), "do-replace", true);
                } else redeem("profile", val, D.author.machine);
                break;
            }
            case "do-replace":
                closeDialog();
                redeem("profile", S.redeem.value, D.author.machine);
                break;
            /* announcements */
            case "an-publish": {
                var anKey = el.getAttribute("data-subj");
                if (annProblem(annDraft(anKey))) break;
                var anLive = annLive(anKey);
                if (anLive) confirmDialog(T("au.an.replace.title"), esc(T("au.an.replace.body", { title: annTitle(anLive) })), T("au.an.replace.ok"), "an-do-publish", false, 'data-subj="' + esc(anKey) + '"');
                else annPublish(anKey);
                break;
            }
            case "an-do-publish":
                closeDialog();
                annPublish(el.getAttribute("data-subj"));
                break;
            case "an-withdraw": {
                var wdLive = annLive(el.getAttribute("data-subj"));
                if (wdLive) confirmDialog(T("au.an.withdraw.title"), esc(T("au.an.withdraw.body", { title: annTitle(wdLive) })), T("au.an.withdraw.ok"), "an-do-withdraw", true, 'data-subj="' + esc(el.getAttribute("data-subj")) + '"');
                break;
            }
            case "an-do-withdraw": {
                var gone = annLive(el.getAttribute("data-subj"));
                closeDialog();
                if (gone) {
                    gone.state = "withdrawn";
                    gone.closed = D.NOW;
                }
                render();
                window.NEST.toast(T("au.toast.anWithdrawn"));
                break;
            }
            /* «Изменить…» starts a new announcement from the live one's words; publishing replaces it */
            case "an-change": {
                var chKey = el.getAttribute("data-subj");
                var chLive = annLive(chKey);
                if (chLive) S.an[chKey] = { titleRu: chLive.titleRu, titleEn: chLive.titleEn, textRu: chLive.textRu, textEn: chLive.textEn, days: AN_DAYS_DEFAULT };
                render();
                break;
            }
            case "an-clear":
                delete S.an[el.getAttribute("data-subj")];
                render();
                break;
            case "an-example": {
                var ex = annDraft(el.getAttribute("data-subj"));
                if (!ex.titleRu) ex.titleRu = T("au.an.titlePh");
                ex.textRu = T("au.an.example.linkText");
                render();
                break;
            }
            /* mock bar */
            case "partner":
                S.partner = el.getAttribute("data-v");
                S.tab = "author";
                render();
                break;
            case "vw":
                S.vw = el.getAttribute("data-v");
                render();
                break;
            case "author-state":
                S.author = el.getAttribute("data-v");
                S.keyShown = false;
                S.thisKey = null;
                S.recoveryUsed = false;
                S.redeem = { value: "", error: null, emailSent: false };
                S.tab = "author";
                render();
                break;
            case "scope":
                S.scope = el.getAttribute("data-v");
                render();
                break;
            case "tour":
                tour(Number(el.getAttribute("data-v")));
                break;
            case "user-view":
                S.tab = "catalog";
                render();
                break;
        }
    }
    function onChange(e) {
        var el = e.target;
        if (el.getAttribute("data-act") === "st-key" && S.st) {
            S.st.key = el.value;
        } else if (el.getAttribute("data-act") === "wiz-choice") {
            S.wiz.choice = el.value;
            renderWizard();
            if (el.value === "custom") focusEnd("wiz-custom");
        } else if (el.getAttribute("data-act") === "wiz-vis") {
            S.wiz.visibility = el.value;
        } else if (el.getAttribute("data-act") === "vis") {
            /* the radios redraw from the widget, so a cancelled confirm leaves them as they were */
            var w = find(el.getAttribute("data-id"));
            var toLink = el.value === "link";
            render();
            if (toLink && w.visibility === "catalog") visLinkDialog(w);
            else if (toLink && w.catalogRequested) {
                w.catalogRequested = false;
                render();
                window.NEST.toast(T("au.toast.catalogRequestWithdrawn"));
            } else if (!toLink && w.visibility === "link" && !w.catalogRequested) {
                w.catalogRequested = true;
                render();
                window.NEST.toast(T("au.toast.catalogRequested"));
            }
        }
    }
    function onInput(e) {
        var el = e.target;
        if (el.id === "st-id" && S.st) {
            S.st.idValue = el.value;
            S.st.error = null;
            var target = document.getElementById("st-target");
            if (target) target.textContent = T("au.st.target", { path: stTarget() });
            var stErr = document.getElementById("st-err");
            if (stErr) stErr.hidden = true;
        }
        if (el.id === "succ-q" && S.succ) {
            S.succ.q = el.value;
            var list = document.getElementById("succ-list");
            if (list) list.innerHTML = successorRows(find(S.succ.id));
        }
        if (el.id === "redeem-value" || el.id === "replace-value") {
            S.redeem.where = el.id === "redeem-value" ? "onboard" : "profile";
            S.redeem.value = el.value;
            S.redeem.error = null;
        }
        if (el.id === "wiz-custom") {
            S.wiz.custom = el.value;
            var w = find(S.wiz.id);
            var btn = dlg.querySelector('[data-act="wiz-next"]');
            var verr = wizVersionError(w);
            if (btn) btn.disabled = !!verr;
            /* the reason, as the author types: a suffix, a malformed number, a taken one or a lower one */
            var line = dlg.querySelector("#wiz-v-err");
            if (line) {
                line.textContent = verr || "";
                line.hidden = !(verr && el.value.trim());
            }
        }
        if (el.getAttribute("data-wiz")) {
            S.wiz[el.getAttribute("data-wiz")] = el.value;
            var c = document.getElementById(el.id + "-c");
            if (c) c.textContent = el.value.length + " / 1000";
            var ww = find(S.wiz.id);
            var err = wizNotesError(ww);
            var errEl = document.getElementById("wiz-notes-err");
            if (errEl) {
                errEl.hidden = !err || S.wiz.first;
                errEl.textContent = err || "";
            }
            var nb = dlg.querySelector('[data-act="wiz-next"]');
            if (nb) nb.disabled = !!err || editorialMissing(ww);
        }
        if (el.getAttribute("data-count")) {
            var counter = el.parentNode.querySelector(".counter");
            if (counter) counter.textContent = el.value.length + " / " + el.getAttribute("data-count");
        }
        var an = el.getAttribute("data-an");
        if (an) {
            var subj = el.getAttribute("data-subj");
            annDraft(subj)[an] = an === "days" ? Number(el.value) : el.value;
            annSync(subj);
        }
        /* the Listing form: the draft, the card preview and a link's verdict follow every keystroke,
           without a re-render that would take the caret away */
        var ld = el.getAttribute("data-ld");
        var ldf = el.getAttribute("data-ldf");
        if ((ld || ldf) && S.ld) {
            var lw = find(S.ld.id);
            if (ld && ld.indexOf("link:") === 0) S.ld.links[ld.slice(5)] = el.value;
            else if (ld) S.ld[ld] = el.value;
            else S.ld.features[Number(ldf.split(":")[0])][ldf.split(":")[1]] = el.value;
            var card = document.getElementById("lp-card");
            if (card && lw) card.innerHTML = cardPreview(lw, S.ld);
            var kind = el.getAttribute("data-link");
            if (kind) {
                var verdict = kind === "video" ? videoProblem(el.value.trim()) : linkProblem(kind, el.value.trim());
                var errEl = el.parentNode.querySelector('[data-err-for="' + kind + '"]');
                if (errEl) {
                    errEl.hidden = !verdict;
                    errEl.textContent = verdict || "";
                }
            }
            syncDirty(lw);
        }
    }
    function focusEnd(id) {
        setTimeout(function () {
            var x = document.getElementById(id);
            if (x) {
                x.focus();
                x.setSelectionRange(x.value.length, x.value.length);
            }
        }, 20);
    }
    function findVersion(id, v) {
        var w = find(id);
        if (!w) return null;
        for (var i = 0; i < w.versions.length; i++) if (w.versions[i].v === v) return w.versions[i];
        return null;
    }
    function wizNext() {
        var z = S.wiz;
        z.step = z.from && z.step === 2 ? 4 : z.step + 1;
        z.error = null;
        if (z.step === 3) z.packed = false;
        renderWizard();
        if (z.step === 3) wizPack();
    }
    function wizCancel() {
        var id = S.wiz ? S.wiz.id : null;
        S.wiz = null;
        closeDialog();
        if (id) location.hash = "#/w/" + encodeURIComponent(id) + "/" + (route().sec || "overview");
    }
    function createWidget() {
        var name = (document.getElementById("n-name").value || "").trim();
        if (!name) {
            document.getElementById("n-err").hidden = false;
            return;
        }
        var id = "f" + fakeHash(name).slice(0, 7) + "-4c1a-4b2e-9d3f-" + fakeHash(name + "x").slice(0, 12);
        var cat = (document.getElementById("n-cat") || {}).value || null;
        var desc = ((document.getElementById("n-desc") || {}).value || "").trim();
        widgets().unshift({ id: id, name: name, letter: name.charAt(0).toUpperCase(), color: "#4a6b8a", ph: true, state: "draft", everApproved: false, category: cat, tags: [], descRu: desc, descEn: "", iconSet: false, code: null, share: null, versions: [], stats: null });
        S.created = id;
        closeDialog();
        go("#/w/" + encodeURIComponent(id) + "/overview");
    }
    function draftFromFolder(key) {
        var l = D.local.filter(function (x) {
            return x.key === key;
        })[0];
        var id = "9b" + fakeHash(key).slice(0, 6) + "-2d4e-4f6a-8b0c-" + fakeHash(key + "y").slice(0, 12);
        widgets().unshift({
            id: id,
            name: key,
            letter: key.charAt(0).toUpperCase(),
            color: "#55708a",
            ph: true,
            state: "draft",
            everApproved: false,
            category: null,
            tags: [],
            descRu: "",
            descEn: "",
            iconSet: false,
            code: { path: l.path, manifestId: id, manifestVersion: l.manifestVersion, changedAt: l.changedAt, hot: true, permissions: ["marketData"], egress: [] },
            share: null,
            versions: [],
            stats: null
        });
        D.local.splice(D.local.indexOf(l), 1);
        S.created = id;
        go("#/w/" + encodeURIComponent(id) + "/overview");
        window.NEST.toast(T("au.toast.draftFromFolder"));
    }
    /* One save sends the whole form. A link or a video the registry would refuse keeps the form open and
       says which; everything else applies at once — only a catalog widget's new name waits. */
    function saveListing(w) {
        var d = draftOf(w);
        var bad = LINKS.filter(function (k) {
            return linkProblem(k, d.links[k]);
        });
        if (videoProblem(d.video)) bad.unshift("video");
        if (bad.length) {
            window.NEST.toast(T("au.toast.listingBad"));
            var first = document.querySelector('[data-link="' + bad[0] + '"]');
            if (first) first.focus();
            return;
        }
        var name = d.name.trim();
        w.category = d.category || null;
        w.tags = splitTags(d.tags);
        w.descRu = d.descRu;
        w.descEn = d.descEn;
        var p = pageOf(w);
        p.aboutRu = d.aboutRu;
        p.aboutEn = d.aboutEn;
        p.features = d.features.filter(function (f) {
            return f.titleRu || f.titleEn || f.bodyRu || f.bodyEn;
        });
        p.video = d.video.trim();
        LINKS.forEach(function (k) {
            p.links[k] = d.links[k].trim();
        });
        p.languages = d.languages.slice();
        S.ld = null;
        var waits = false;
        if (name && name !== w.name) {
            if (w.everApproved && w.visibility === "catalog") {
                w.pendingName = name;
                waits = true;
            } else w.name = name;
        }
        render();
        window.NEST.toast(waits ? T("au.toast.renameWaiting") : T("au.toast.listingSaved"));
    }
    function tour(n) {
        S.tab = "author";
        if (n !== 1) S.author = "yes";
        if (n === 7) S.scope = "full";
        var map = {
            1: "#/",
            3: "#/w/5d1e8c2a-7f43-4b9e-a0c6-2e9b71f4d835/code",
            4: "#/w/liquidation-radar/overview/release",
            5: "#/w/71f0c3d8-2e9a-4b6c-8f17-5a4d0e9b3c21/access",
            6: "#/w/funding-monitor/versions",
            7: "#/w/funding-monitor/stats",
            8: "#/w/b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954/access"
        };
        if (n === 1) {
            S.author = "none";
            S.keyShown = false;
            go("#/");
        } else if (n === 2) {
            go("#/");
            newWidgetDialog();
        } else {
            if (n === 6) S.open["funding-monitor@1.1.0"] = true;
            go(map[n]);
        }
    }

    /* the mock bar mirrors the state it controls */
    function syncBar() {
        document.querySelectorAll(".mock-bar [data-act]").forEach(function (b) {
            var act = b.getAttribute("data-act");
            var v = b.getAttribute("data-v");
            var on = (act === "vw" && v === S.vw) || (act === "author-state" && v === S.author && S.tab === "author") || (act === "scope" && v === S.scope) || (act === "user-view" && S.tab === "catalog") || (act === "starters" && v === S.starters) || (act === "partner" && v === S.partner);
            if (act !== "tour") b.setAttribute("aria-pressed", String(!!on));
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        root = document.getElementById("author-root");
        dlg = document.getElementById("dlg");
        dlg.addEventListener("close", function () {
            if (S.wiz) {
                var id = S.wiz.id;
                S.wiz = null;
                location.hash = "#/w/" + encodeURIComponent(id) + "/" + (route().sec || "overview");
            }
        });
        document.addEventListener("click", onClick);
        document.addEventListener("change", onChange);
        document.addEventListener("input", onInput);
        window.addEventListener("hashchange", render);
        render();
    });
})();
