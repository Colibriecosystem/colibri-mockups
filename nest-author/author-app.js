/* The Author-tab prototype: a hash router, the renderers, the release wizard and every click.
   One module draws every screen from AUTHOR_DATA, so a widget's state reads the same in the rail,
   the summary, its page and the wizard. State lives in memory: a reload starts over.

   Routes (each screen is linkable in a review comment):
     #/                      summary of all my widgets
     #/w/<id>/<section>      a widget page: overview · versions · listing · code · access · stats
     #/w/<id>/<section>/release   the same page with the release wizard open
     #/local/<key>           a dev folder Nest has never heard of ("code first")
     #/profile               profile, this author's keys, recovery and co-maintainers
   Mock-bar params: ?author=none|empty|yes|maintainer|unreadable|offline  ?scope=first|full  ?vw=800|1024|1280
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
        code: null, /* the code dialog on screen: { kind, code, until } */
        redeem: { value: "", error: null, emailSent: false }, /* the «ключ или код» box */
        recoveryUsed: false /* the author just came back with the recovery code */
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
    function attention(w) {
        var p = phaseOf(w);
        if (p === "declined" || p === "refused" || p === "takendown") return "danger";
        var pend = pendingOf(w);
        if (pend && pend.overdue) return "warn";
        return null;
    }
    function readiness(w) {
        return [
            { key: "au.ready.name", done: !!w.name, sec: "listing" },
            { key: "au.ready.icon", done: !!w.iconSet, sec: "listing" },
            { key: "au.ready.category", done: !!w.category, sec: "listing" },
            { key: "au.ready.description", done: !!(w.descRu || w.descEn), sec: "listing" },
            { key: "au.ready.code", done: linked(w), sec: "code" }
        ];
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
        return D.events.filter(function (n) {
            return n.kind === "notice" || find(n.widget);
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
            default:
                return T("au.ev.unknown", { w: name });
        }
    }
    function eventColor(kind) {
        if (kind === "version.approved" || kind === "version.reinstated" || kind === "widget.reinstated") return "var(--ok)";
        if (kind === "review.reply" || kind === "notice") return "var(--info)";
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
                var id = encodeURIComponent(n.widget);
                var versionKind = n.kind.indexOf("version.") === 0 || n.kind === "review.reply";
                var href = "#/w/" + id + (versionKind ? "/versions" : "/overview");
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
                    "<td>" + stateChip(w) + "</td>" +
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
        ["stats", "au.sec.stats", true]
    ];
    function renderWidget(w, sec) {
        var id = encodeURIComponent(w.id);
        var c = current(w);
        var pend = pendingOf(w);
        var meta = stateChip(w);
        if (pend && w.everApproved && pend.state === "pending") meta += ' <span class="chip chip-warn">' + esc(T("au.pendingVersion", { v: pend.v })) + "</span>";
        if (pend && w.everApproved && pend.state === "checking") meta += ' <span class="chip chip-info"><span class="status-dot pulse"></span>' + esc(T("au.feedback.checking", { v: pend.v })) + "</span>";
        if (w.catalogRequested && w.visibility !== "catalog") meta += ' <span class="chip chip-info">' + esc(T("au.chip.catalogRequested")) + "</span>";
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
            SECTIONS.map(function (s) {
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
            var done = items.filter(function (x) {
                return x.done;
            }).length;
            left +=
                '<div class="card"><h2 class="sec">' + esc(T("au.ready.title")) + ' <span class="dim small">' + done + " / " + items.length + "</span></h2>" +
                '<div class="progress"><i style="width:' + Math.round((done / items.length) * 100) + '%"></i></div>' +
                '<ul class="checklist">' +
                items
                    .map(function (x) {
                        return '<li class="' + (x.done ? "done" : "") + '"><span class="mark">' + icon("check", "sm") + '</span><span class="lbl">' + esc(T(x.key)) + "</span>" + (x.done ? "<span></span>" : '<a class="btn btn-link btn-sm" href="#/w/' + encodeURIComponent(w.id) + "/" + x.sec + '">' + esc(T("au.ready.fill")) + "</a>") + "</li>";
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
                '<div class="card later"><h2 class="sec">' + esc(T("au.sec.stats")) + later() + '</h2><div class="nums">' +
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
    function renderListing(w) {
        var catalogStanding = w.everApproved && w.visibility === "catalog";
        var cats = ["", "alerts", "analytics", "market-data", "trading", "portfolio", "research", "productivity", "other"];
        var form =
            '<div class="card"><div class="form-grid">' +
            "<label>" + esc(T("au.listing.name")) + '</label><div class="ctl"><input class="input" id="l-name" value="' + esc(w.name) + '" maxlength="80"/>' + (catalogStanding ? '<span class="hint">' + esc(T("au.listing.nameReview")) + "</span>" : "") + "</div>" +
            "<label>" + esc(T("au.listing.icon")) + '</label><div class="ctl"><div class="row-actions">' + wicon(w) + '<button class="btn btn-sm" data-act="choose-icon" data-id="' + esc(w.id) + '">' + esc(T("au.listing.chooseIcon")) + '</button><span class="hint">' + esc(T("au.listing.iconHint")) + "</span></div></div>" +
            "<label>" + esc(T("au.listing.category")) + '</label><div class="ctl"><select class="select" id="l-cat">' +
            cats
                .map(function (k) {
                    return '<option value="' + k + '"' + ((w.category || "") === k ? " selected" : "") + ">" + esc(k ? catLabel(k) : T("au.listing.chooseLater")) + "</option>";
                })
                .join("") +
            "</select></div>" +
            "<label>" + esc(T("au.listing.tags")) + '</label><div class="ctl"><input class="input" id="l-tags" value="' + esc(w.tags.join(", ")) + '"/><span class="hint">' + esc(T("au.listing.tagsHint")) + "</span></div>" +
            "<label>" + esc(T("au.listing.descRu")) + '</label><div class="ctl"><textarea class="textarea" id="l-ru" maxlength="400" data-count="400">' + esc(w.descRu) + '</textarea><span class="counter">' + w.descRu.length + " / 400</span></div>" +
            "<label>" + esc(T("au.listing.descEn")) + '</label><div class="ctl"><textarea class="textarea" id="l-en" maxlength="400" data-count="400">' + esc(w.descEn) + '</textarea><span class="counter">' + w.descEn.length + " / 400</span></div>" +
            '<span></span><div class="row-actions"><button class="btn btn-primary" data-act="save-listing" data-id="' + esc(w.id) + '">' + esc(T("au.save")) + '</button><button class="btn" data-act="revert-listing">' + esc(T("au.listing.revert")) + "</button></div>" +
            "</div></div>";
        var preview =
            '<div class="card later"><h2 class="sec">' + esc(T("au.listing.preview")) + later() + '</h2><div class="preview-row">' + wicon(w) +
            '<div style="min-width:0"><div class="t">' + wname(w) + ' <span class="dim small" style="font-weight:400">' + esc(D.author.name) + '</span></div><div class="d">' + esc(w.descRu || T("au.listing.noDesc")) + "</div></div>" +
            '<span class="btn btn-sm btn-fetch">' + esc(T("au.install")) + "</span></div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.listing.previewHint")) + "</p></div>" +
            '<div class="card later"><h2 class="sec">' + esc(T("au.listing.media")) + later() + '</h2><div class="media-slots"><div>' + esc(T("au.listing.addShot")) + "</div><div>" + esc(T("au.listing.addShot")) + "</div><div>" + esc(T("au.listing.addVideo")) + "</div></div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.listing.mediaHint")) + "</p></div>";
        return '<div class="banner banner-info">' + icon("info") + '<div class="banner-body">' + esc(T("au.listing.hint")) + "</div></div>" + '<div class="grid-2"><div>' + form + '</div><div class="stack">' + preview + "</div></div>";
    }

    /* ---------- code ---------- */
    function renderCode(w) {
        if (linked(w)) {
            var c = w.code;
            return (
                '<div class="card"><h2 class="sec">' + esc(T("au.code.linked")) + "</h2>" +
                '<dl class="summary-kv"><dt>' + esc(T("au.code.folder")) + '</dt><dd><a href="#" class="path ph" data-toast="au.toast.folder">' + esc(c.path) + "</a></dd>" +
                "<dt>widget.json</dt><dd>" + '<span class="chip chip-ok">' + icon("check") + esc(T("au.code.idMatches")) + "</span></dd>" +
                "<dt>" + esc(T("au.code.version")) + '</dt><dd class="mono">' + esc(c.manifestVersion) + "</dd>" +
                "<dt>" + esc(T("au.code.changed")) + '</dt><dd class="ph">' + fmtDT(c.changedAt) + "</dd></dl>" +
                '<div class="row-actions"><button class="switch" role="switch" aria-checked="' + !!c.hot + '" data-act="hot" data-id="' + esc(w.id) + '"><i></i>' + esc(T("au.code.hot")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.reloaded">' + icon("refresh") + esc(T("au.code.reload")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.openedPanel">' + icon("panel") + esc(T("au.openPanel")) + "</button>" +
                '<button class="btn btn-sm" data-toast="au.toast.openedWindow">' + icon("window") + esc(T("au.openWindow")) + "</button>" +
                '<button class="btn btn-sm btn-link" data-act="unlink" data-id="' + esc(w.id) + '">' + esc(T("au.code.unlink")) + "</button></div>" +
                '<p class="hint" style="margin-top:8px">' + esc(T("au.code.linkedHint")) + "</p></div>"
            );
        }
        var warn = mismatch(w)
            ? '<div class="banner banner-warn">' + icon("warn") + '<div class="banner-body"><b>' + esc(T("au.code.mismatch.title")) + "</b> " + esc(T("au.code.mismatch.body", { path: w.code.path, id: w.code.manifestId })) + "</div></div>"
            : "";
        return (
            warn +
            '<p class="lede" style="margin-bottom:10px">' + esc(T("au.code.lede")) + "</p>" +
            '<div class="choices">' +
            '<div class="choice">' + icon("folder", "lg") + "<b>" + esc(T("au.code.folderChoice")) + "</b><p>" + esc(T("au.code.folderChoiceBody")) + '</p><button class="btn btn-primary" data-act="link-folder" data-id="' + esc(w.id) + '">' + esc(T("au.code.pickFolder")) + "</button></div>" +
            '<div class="choice later">' + icon("template", "lg") + "<b>" + esc(T("au.code.template")) + later() + "</b><p>" + esc(T("au.code.templateBody")) + '</p><button class="btn" data-toast="au.toast.later">' + esc(T("au.code.pickTemplate")) + "</button></div>" +
            '<div class="choice later">' + icon("globe", "lg") + "<b>" + esc(T("au.code.hosted")) + later() + "</b><p>" + esc(T("au.code.hostedBody")) + '</p><button class="btn" data-toast="au.toast.later">' + esc(T("au.code.enterUrl")) + "</button></div>" +
            "</div>"
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

        var vis;
        if (!w.everApproved) vis = '<p class="dim">' + esc(T("au.access.visDraft")) + "</p>";
        else {
            var inCat = w.visibility === "catalog";
            vis =
                '<p><span class="chip ' + (inCat ? "chip-ok" : "chip-info") + '">' + esc(inCat ? T("au.state.live") : T("au.state.link")) + "</span></p>" +
                '<div class="vis later" style="margin-top:8px">' +
                '<label class="radio"><input type="radio" name="vis"' + (inCat ? " checked" : "") + ' data-act="vis" data-id="' + esc(w.id) + '" value="catalog"/><div><b>' + esc(T("au.vis.catalog")) + later() + "</b><span>" + esc(inCat ? T("au.vis.catalogNow") : T("au.vis.toCatalog")) + "</span></div></label>" +
                '<label class="radio"><input type="radio" name="vis"' + (!inCat ? " checked" : "") + ' data-act="vis" data-id="' + esc(w.id) + '" value="link"/><div><b>' + esc(T("au.vis.link")) + later() + "</b><span>" + esc(T("au.vis.toLink")) + "</span></div></label></div>";
        }
        if (w.catalogRequested && w.visibility !== "catalog") vis += '<p class="dim" style="margin-top:6px">' + esc(T("au.access.catalogRequested")) + "</p>";
        out += '<div class="card"><h2 class="sec">' + esc(T("au.access.visibility")) + "</h2>" + vis + "</div>";

        var life = "";
        if (w.state === "withdrawn") life += row(T("au.restore"), T("au.access.restoreBody"), '<button class="btn" data-act="restore" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("undo") + esc(T("au.restore")) + "</button>");
        else if (w.state !== "takendown" && w.everApproved) life += row(T("au.withdraw"), T("au.withdraw.tip"), '<button class="btn" data-act="withdraw" data-id="' + esc(w.id) + '"' + (isMaint() ? ownerOnlyAttrs() : "") + ">" + icon("archive") + esc(T("au.withdraw")) + "</button>");
        if (w.everApproved) {
            life += '<div class="later">' + row(T("au.access.deprecate") + " ", T("au.access.deprecateBody"), '<button class="btn" data-toast="au.toast.later">' + esc(T("au.access.deprecateAction")) + "</button>", true) + "</div>";
            life += '<div class="later">' + row(T("au.access.transfer") + " ", T("au.access.transferBody"), '<button class="btn" data-toast="au.toast.later">' + icon("transfer") + esc(T("au.access.transferAction")) + "</button>", true) + "</div>";
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
        return (
            '<div class="row-actions" style="justify-content:space-between;padding:6px 0;border-top:1px solid var(--border)"><div style="flex:1;min-width:240px"><b>' + esc(title) + "</b>" + (isLater ? later() : "") + '<p class="dim small">' + esc(body) + "</p></div>" + action + "</div>"
        );
    }

    /* ---------- stats (later) ---------- */
    function renderStats(w) {
        if (!w.stats) return '<div class="empty-state">' + icon("chart") + "<h1>" + esc(T("au.stats.none.title")) + '</h1><p class="lede" style="margin:0 auto">' + esc(T("au.stats.none.body")) + "</p></div>";
        var s = w.stats;
        var spark = "";
        var pts = [];
        for (var i = 0; i < 30; i++) pts.push(Math.round(s.installs * (0.55 + 0.45 * (i / 29)) + 6 * Math.sin(i * 1.7)));
        var max = Math.max.apply(null, pts);
        var min = Math.min.apply(null, pts);
        spark = pts
            .map(function (p, i) {
                return (i ? "L" : "M") + (i * (300 / 29)).toFixed(1) + " " + (56 - ((p - min) / (max - min || 1)) * 50).toFixed(1);
            })
            .join(" ");
        return (
            '<p class="lede" style="margin-bottom:10px">' + esc(T("au.stats.lede")) + "</p>" +
            '<div class="nums" style="margin-bottom:10px">' +
            '<div class="stat"><b class="ph">' + fmtNum(s.installs) + "</b><span>" + esc(T("au.stats.installs")) + "</span></div>" +
            '<div class="stat"><b class="ph">' + fmtNum(s.active7) + "</b><span>" + esc(T("au.stats.active7")) + "</span></div>" +
            '<div class="stat"><b class="ph">' + fmtNum(s.errors) + "</b><span>" + esc(T("au.stats.errors")) + "</span></div></div>" +
            '<div class="grid-2"><div class="card"><h2 class="sec">' + esc(T("au.stats.over30")) + '</h2><svg viewBox="0 0 300 60" width="100%" height="80" preserveAspectRatio="none" role="img" aria-label="' + esc(T("au.stats.over30")) + '"><path d="' + spark + '" fill="none" stroke="var(--accent)" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg><p class="hint">' + esc(T("au.stats.delayed")) + "</p></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.stats.adoption")) + "</h2>" +
            s.adoption
                .map(function (a) {
                    return '<div style="display:grid;grid-template-columns:60px 1fr 44px;gap:8px;align-items:center;margin:4px 0"><span class="mono">' + esc(a.v) + '</span><div class="progress" style="margin:0"><i style="width:' + a.share + '%;background:var(--info)"></i></div><span class="dim small ph">' + a.share + "%</span></div>";
                })
                .join("") +
            '<p class="hint">' + esc(T("au.stats.errorsHint")) + "</p></div></div>"
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
            '<div class="card later"><h2 class="sec">' + icon("megaphone") + " " + esc(T("au.p.announce")) + later() + '</h2><p class="dim">' + esc(T("au.p.announceBody")) + "</p></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.otherHeading")) + '</h2><details class="more"' + (S.redeem.error && S.redeem.where === "profile" ? " open" : "") + "><summary>" + icon("chevron-right", "sm") + esc(T("au.p.useOther")) + "</summary>" +
            '<p class="hint" style="margin:4px 0">' + esc(T("au.p.useOtherHint")) + "</p>" +
            '<div class="share"><input class="input mono" id="replace-value" placeholder="' + esc(T("au.p.pastePlaceholder")) + '" value="' + esc(S.redeem.where === "profile" ? S.redeem.value : "") + '"/><button class="btn" data-act="replace">' + esc(T("au.p.verify")) + "</button></div>" +
            (S.redeem.error && S.redeem.where === "profile" ? '<p class="err">' + esc(S.redeem.error) + "</p>" : "") +
            redeemExamples("replace-value") +
            "</details>" +
            '<div class="row-actions" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><button class="btn btn-danger btn-sm" data-act="forget">' + esc(T("au.p.forget")) + '</button><span class="hint">' + esc(T("au.p.forgetHint")) + "</span></div></div>" +
            "</div></div>" +
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
            "</div>" +
            '<div class="card listing"><div class="row-actions">' + wicon(f, true) + "<div><h2>" + esc(f.name) + ' <span class="by mono">' + esc(served.v) + '</span></h2><span class="dim small">' + esc(D.author.name) + " · " + esc(catLabel(f.category)) + "</span></div></div>" +
            '<p style="margin-top:8px">' + esc(f.descRu) + "</p>" +
            block +
            historyHtml +
            (waiting ? '<div class="impact" style="margin-top:10px"><h4>' + icon("shield", "sm") + " " + esc(T("au.uv.consent.title")) + '</h4><p class="dim small">' + esc(T("au.uv.consent.body", { host: "www.okx.com" })) + "</p></div>" : "") +
            (blocked ? '<div class="impact" style="margin-top:10px"><h4>' + icon("warn", "sm") + " " + esc(T("au.uv.needsColibri.title", { min: needs })) + '</h4><p class="dim small">' +
                esc(T("au.uv.needsColibri.body", { v: served.v, min: needs, have: "1.3.1", installed: installed })) + "</p></div>" : "") +
            (waiting ? '<div class="row-actions" style="margin-top:12px">' + updateBtn("", T("au.uv.updateTo", { v: served.v })) + "</div>" : "") +
            "</div></div>"
        );
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
                '<div class="actions"><span class="hint" style="margin-right:auto;align-self:center">' + esc(T("au.new.idByNest")) + '</span><button class="btn" data-act="dlg-close">' + esc(T("au.cancel")) + '</button><button class="btn btn-primary" data-act="create-widget">' + esc(T("au.new.create")) + "</button></div>"
        );
        setTimeout(function () {
            var n = document.getElementById("n-name");
            if (n) n.focus();
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
            '<p class="hint" style="margin-top:8px">' + esc(T(z.from ? "au.wiz.rb.written" : "au.wiz.v.written")) + "</p>"
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
        return kv + '<div class="impact"><h4>' + esc(T("au.wiz.impact.title")) + '</h4><ul class="chg">' + items.join("") + '</ul><p class="hint" style="margin-top:6px">' + esc(verdict) + "</p></div>";
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
            case "save-listing":
                saveListing(w);
                break;
            case "revert-listing":
                render();
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
            /* mock bar */
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
        if (el.getAttribute("data-act") === "wiz-choice") {
            S.wiz.choice = el.value;
            renderWizard();
            if (el.value === "custom") focusEnd("wiz-custom");
        } else if (el.getAttribute("data-act") === "wiz-vis") {
            S.wiz.visibility = el.value;
        } else if (el.getAttribute("data-act") === "vis") {
            window.NEST.toast(el.value === "catalog" ? T("au.toast.catalogRequested") : T("au.toast.nowLinkOnly"));
        }
    }
    function onInput(e) {
        var el = e.target;
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
    function saveListing(w) {
        var name = document.getElementById("l-name").value.trim();
        w.category = document.getElementById("l-cat").value || null;
        w.tags = document
            .getElementById("l-tags")
            .value.split(",")
            .map(function (s) {
                return s.trim();
            })
            .filter(Boolean);
        w.descRu = document.getElementById("l-ru").value;
        w.descEn = document.getElementById("l-en").value;
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
            var on = (act === "vw" && v === S.vw) || (act === "author-state" && v === S.author && S.tab === "author") || (act === "scope" && v === S.scope) || (act === "user-view" && S.tab === "catalog");
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
