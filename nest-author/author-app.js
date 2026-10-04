/* The Author-tab prototype: a hash router, the renderers, the release wizard and every click.
   One module draws every screen from AUTHOR_DATA, so a widget's state reads the same in the rail,
   the summary, its page and the wizard. State lives in memory: a reload starts over.

   Routes (each screen is linkable in a review comment):
     #/                      summary of all my widgets
     #/w/<id>/<section>      a widget page: overview · versions · listing · code · access · stats
     #/w/<id>/<section>/release   the same page with the release wizard open
     #/local/<key>           a dev folder Nest has never heard of ("code first")
     #/profile               profile and author ID
   Mock-bar params: ?author=none|empty|yes|unreadable|offline  ?scope=first|full  ?vw=800|1024|1280 */
(function () {
    "use strict";

    var D = window.AUTHOR_DATA;
    var html = document.documentElement;
    var params = new URLSearchParams(location.search);
    var AUTHOR_STATES = ["none", "empty", "yes", "unreadable", "offline"];
    var S = {
        author: AUTHOR_STATES.indexOf(params.get("author")) >= 0 ? params.get("author") : "yes",
        scope: params.get("scope") === "first" ? "first" : "full",
        vw: ["800", "1024", "1280"].indexOf(params.get("vw")) >= 0 ? params.get("vw") : "1024",
        tab: "author",
        open: {}, /* expanded version rows: "<id>@<v>" → true */
        editing: null, /* "<id>@<v>" whose notes are being edited */
        bell: false,
        keyShown: false,
        created: null, /* id of a widget created a moment ago — the page greets it once */
        wiz: null,
        dlg: null
    };
    var emptyWidgets = [];

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
        if (l && l.state === "checking") return "checking";
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
        if (h[0] === "w" && h[1]) return { kind: "widget", id: decodeURIComponent(h[1]), sec: h[2] || "overview", release: h[3] === "release" };
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
        var r = route();
        if (S.tab === "catalog") root.innerHTML = renderUserView();
        else if (S.tab !== "author") root.innerHTML = '<div class="placeholder-tab">' + esc(T("au.otherTab")) + "</div>";
        else root.innerHTML = renderAuthor(r);
        /* the wizard follows the route, so a link to it opens it */
        if (S.tab === "author" && r.kind === "widget" && r.release && find(r.id) && S.author !== "none" && S.author !== "unreadable") {
            /* an open wizard is left alone, so a background re-render never eats what is being typed */
            if (!S.wiz || S.wiz.id !== r.id) {
                startWizard(r.id);
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
        var unread = D.notifications.length;
        var bell =
            '<div class="bell later">' +
            '<button class="btn btn-icon" data-act="bell" title="' + esc(T("au.bell.title")) + '" aria-label="' + esc(T("au.bell.title")) + '">' + icon("bell") + "</button>" +
            '<span class="badge ph">' + unread + "</span>" +
            (S.bell ? renderBellPop() : "") +
            "</div>";
        return (
            '<div class="ws-bar">' +
            '<span class="avatar">' + esc(a.name.charAt(0)) + "</span>" +
            '<div class="who"><b>' + esc(a.name) + "</b><span>" + esc(T("au.bar.idHere")) + "</span></div>" +
            '<span class="grow"></span>' +
            '<button class="btn btn-primary btn-sm" data-act="new-widget">' + icon("plus") + esc(T("au.newWidget")) + "</button>" +
            bell +
            '<a class="btn btn-sm" href="#/profile">' + icon("user") + esc(T("au.profile")) + "</a>" +
            "</div>"
        );
    }
    function renderBellPop() {
        var rows = D.notifications
            .map(function (n) {
                var color = n.kind === "danger" ? "var(--danger)" : n.kind === "warn" ? "var(--warn)" : "var(--ok)";
                return (
                    '<a class="note-row" href="' + n.href + '" data-act="bell-close"><span class="status-dot" style="color:' + color + '"></span><span><span class="ph">' + esc(n.text) + "</span><small>" + fmtDT(n.at) + "</small></span></a>"
                );
            })
            .join("");
        return '<div class="bell-pop"><h3>' + esc(T("au.bell.title")) + later() + "</h3>" + rows + '<p class="hint" style="padding:6px 8px 2px">' + esc(T("au.bell.hint")) + "</p></div>";
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
            n.actions = '<button class="btn" data-act="restore" data-id="' + esc(w.id) + '">' + esc(T("au.restore")) + "</button>";
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
        if (w.pendingName) meta += ' <span class="chip chip-warn">' + esc(T("au.pendingName", { name: w.pendingName })) + "</span>";
        meta += ' <span class="idline">ID ' + esc(w.id) + ' <button data-act="copy" data-text="' + esc(w.id) + '" title="' + esc(T("au.copyId")) + '">' + icon("copy", "sm") + "</button></span>";
        var canRelease = w.state !== "takendown" && w.state !== "withdrawn" && !(pend && pend.state === "checking");
        var menu =
            '<details class="menu"><summary class="btn btn-icon" aria-label="' + esc(T("au.more")) + '">' + icon("more") + '</summary><div class="menu-list">' +
            (linked(w) ? '<button data-toast="au.toast.openedPanel">' + icon("panel") + esc(T("au.openPanel")) + '</button><button data-toast="au.toast.openedWindow">' + icon("window") + esc(T("au.openWindow")) + "</button><hr/>" : "") +
            (w.state === "withdrawn" ? '<button data-act="restore" data-id="' + esc(w.id) + '">' + icon("undo") + esc(T("au.restore")) + "</button>" : w.state !== "takendown" && w.state !== "draft" ? '<button data-act="withdraw" data-id="' + esc(w.id) + '">' + icon("archive") + esc(T("au.withdraw")) + "</button>" : "") +
            (!w.everApproved ? '<button class="danger" data-act="delete" data-id="' + esc(w.id) + '">' + icon("trash") + esc(T("au.delete")) + "</button>" : "") +
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
                    (v.state === "approved" && !v.current ? '<button class="later" data-toast="au.toast.later">' + icon("undo") + esc(T("au.v.rollback")) + later() + "</button>" : "") +
                    (v.state === "approved" && v.current ? '<button class="later" data-toast="au.toast.later">' + icon("flask") + esc(T("au.v.prerelease")) + later() + "</button>" : "") +
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
        if (v.permissions && v.permissions.indexOf("trading") >= 0) items.push('<li><span class="plus">+</span><span>' + esc(T("au.diff.perm")) + " «" + esc(scopeLabel("trading")) + "»</span></li>");
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
        out += '<div class="card"><h2 class="sec">' + esc(T("au.access.visibility")) + "</h2>" + vis + "</div>";

        var life = "";
        if (w.state === "withdrawn") life += row(T("au.restore"), T("au.access.restoreBody"), '<button class="btn" data-act="restore" data-id="' + esc(w.id) + '">' + icon("undo") + esc(T("au.restore")) + "</button>");
        else if (w.state !== "takendown" && w.everApproved) life += row(T("au.withdraw"), T("au.withdraw.tip"), '<button class="btn" data-act="withdraw" data-id="' + esc(w.id) + '">' + icon("archive") + esc(T("au.withdraw")) + "</button>");
        if (w.everApproved) {
            life += '<div class="later">' + row(T("au.access.deprecate") + " ", T("au.access.deprecateBody"), '<button class="btn" data-toast="au.toast.later">' + esc(T("au.access.deprecateAction")) + "</button>", true) + "</div>";
            life += '<div class="later">' + row(T("au.access.transfer") + " ", T("au.access.transferBody"), '<button class="btn" data-toast="au.toast.later">' + icon("transfer") + esc(T("au.access.transferAction")) + "</button>", true) + "</div>";
        }
        if (life) out += '<div class="card"><h2 class="sec">' + esc(T("au.access.lifecycle")) + "</h2>" + life + "</div>";
        out +=
            '<div class="card danger-zone"><h2 class="sec">' + esc(T("au.delete")) + "</h2>" +
            (w.everApproved
                ? '<p class="dim">' + esc(T("au.access.cantDelete")) + "</p>"
                : '<div class="row-actions" style="justify-content:space-between"><p class="dim" style="flex:1;min-width:240px">' + esc(T("au.access.deleteBody")) + '</p><button class="btn btn-danger" data-act="delete" data-id="' + esc(w.id) + '">' + icon("trash") + esc(T("au.delete")) + "</button></div>") +
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

    /* ---------- profile and author ID ---------- */
    function profileFields(a) {
        a = a || {};
        function f(id, label, hint, val, mono) {
            return '<label class="field" style="margin-bottom:8px"><span>' + esc(label) + '</span><input class="input' + (mono ? " mono" : "") + '" id="' + id + '" value="' + esc(val || "") + '"/><span class="hint">' + esc(hint) + "</span></label>";
        }
        return (
            '<div class="fieldgroup"><div class="gh"><b>' + esc(T("au.p.public")) + "</b><span>" + esc(T("au.p.publicHint")) + "</span></div>" +
            f("p-name", T("au.p.name"), T("au.p.nameHint"), a.name) +
            f("p-yt", T("au.p.youtube"), T("au.p.youtubeHint"), a.youtube, true) +
            f("p-tg", T("au.p.telegram"), T("au.p.telegramHint"), a.telegram, true) +
            "</div>" +
            '<div class="fieldgroup"><div class="gh"><b>' + esc(T("au.p.private")) + "</b><span>" + esc(T("au.p.privateHint")) + "</span></div>" +
            f("p-email", T("au.p.email"), T("au.p.emailHint"), a.email) +
            f("p-contact", T("au.p.contact"), T("au.p.contactHint"), a.contactTg, true) +
            f("p-src", T("au.p.source"), T("au.p.sourceHint"), a.sourceCode, true) +
            "</div>"
        );
    }
    function renderProfile() {
        var a = D.author;
        return (
            '<a class="btn btn-link btn-sm back-link" href="#/">' + icon("arrow-left") + esc(T("au.back")) + "</a>" +
            '<h1 style="font-size:var(--fs-xl);margin-bottom:10px">' + esc(T("au.rail.profile")) + "</h1>" +
            '<div class="grid-2"><div class="stack">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.heading")) + "</h2>" + profileFields(a) +
            '<div class="row-actions" style="margin-top:10px"><button class="btn btn-primary" data-toast="au.toast.saved">' + esc(T("au.save")) + '</button><button class="btn">' + esc(T("au.p.revert")) + "</button></div></div>" +
            '</div><div class="stack">' +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.idHeading")) + '</h2><div class="share"><input class="input mono ph" readonly value="' + esc(a.id) + '"/><button class="btn" data-act="copy" data-text="' + esc(a.id) + '">' + icon("copy") + esc(T("au.copy")) + "</button></div>" +
            '<p class="hint" style="margin-top:6px">' + esc(T("au.p.idHint")) + "</p></div>" +
            '<div class="card later"><h2 class="sec">' + esc(T("au.p.devices")) + later() + '</h2><p class="dim">' + esc(T("au.p.devicesBody")) + '</p><div class="row-actions" style="margin-top:8px"><button class="btn" data-toast="au.toast.later">' + esc(T("au.p.addDevice")) + '</button><button class="btn" data-toast="au.toast.later">' + esc(T("au.p.recovery")) + "</button></div></div>" +
            '<div class="card later"><h2 class="sec">' + icon("megaphone") + " " + esc(T("au.p.announce")) + later() + '</h2><p class="dim">' + esc(T("au.p.announceBody")) + "</p></div>" +
            '<div class="card"><h2 class="sec">' + esc(T("au.p.otherHeading")) + '</h2><details class="more"><summary>' + icon("chevron-right", "sm") + esc(T("au.p.useOther")) + '</summary><div class="share" style="margin-top:6px"><input class="input mono" placeholder="' + esc(T("au.p.pastePlaceholder")) + '"/><button class="btn" data-toast="au.toast.later">' + esc(T("au.p.verify")) + '</button></div><p class="hint">' + esc(T("au.p.useOtherHint")) + "</p></details>" +
            '<div class="row-actions" style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><button class="btn btn-danger btn-sm" data-act="forget">' + esc(T("au.p.forget")) + '</button><span class="hint">' + esc(T("au.p.forgetHint")) + "</span></div></div>" +
            "</div></div>"
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
                '<div class="row-actions" style="margin-top:12px"><button class="btn btn-primary" data-act="key-saved">' + esc(T("au.key.saved")) + "</button></div></div></div>"
            );
        }
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
            '<details class="more" style="margin-top:12px"><summary>' + icon("chevron-right", "sm") + esc(T("au.have.heading")) + '</summary><p class="hint" style="margin:4px 0">' + esc(T("au.have.hint")) + '</p><div class="share"><input class="input mono" placeholder="' + esc(T("au.p.pastePlaceholder")) + '"/><button class="btn" data-act="key-saved">' + esc(T("au.p.verify")) + "</button></div></details>" +
            "</div></div>"
        );
    }
    function renderUnreadable() {
        return '<div class="onboard"><div class="card notice-danger" style="grid-column:1/-1;max-width:640px"><h2 class="sec">' + esc(T("au.unreadable.heading")) + '</h2><p class="dim">' + esc(T("au.unreadable.body")) + "</p></div></div>";
    }

    /* ---------- the user's side: the Каталог tab (S15) ---------- */
    function renderUserView() {
        var f = find("funding-monitor") || D.widgets[0];
        var r = find("liquidation-radar") || D.widgets[1];
        var v = pendingOf(f) || latest(f);
        var notes = (v && v.notesRu) || "";
        return (
            '<div class="uv"><div>' +
            '<div class="banner banner-info">' + icon("eye") + '<div class="banner-body">' + esc(T("au.uv.banner", { v: v ? v.v : "" })) + ' <a href="#" data-act="tab" data-tab="author">' + esc(T("au.uv.back")) + "</a></div></div>" +
            '<div class="cat-row">' + wicon(f) + '<div style="min-width:0"><div class="t">' + esc(f.name) + ' <span class="by">' + esc(D.author.name) + '</span></div><div class="d">' + esc(f.descRu) + "</div>" +
            (notes ? '<div class="wn" title="' + esc(notes) + '"><b>' + esc(T("au.uv.whatsNewIn", { v: v.v })) + "</b> " + ph(notes.split("\n")[0], true) + "</div>" : "") +
            '</div><button class="btn btn-sm btn-fetch" data-toast="au.toast.updated">' + esc(T("au.uv.update")) + "</button></div>" +
            '<div class="cat-row">' + wicon(r) + '<div style="min-width:0"><div class="t">' + esc(r.name) + ' <span class="by">' + esc(D.author.name) + '</span></div><div class="d">' + esc(r.descRu) + '</div></div><span class="dim small">' + icon("check", "sm") + " " + esc(T("au.uv.installed")) + "</span></div>" +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.uv.noNotesRule")) + "</p>" +
            "</div>" +
            '<div class="card listing"><div class="row-actions">' + wicon(f, true) + "<div><h2>" + esc(f.name) + '</h2><span class="dim small">' + esc(D.author.name) + " · " + esc(catLabel(f.category)) + "</span></div></div>" +
            '<p style="margin-top:8px">' + esc(f.descRu) + "</p>" +
            (notes ? '<div class="wn-block"><h3>' + esc(T("au.uv.whatsNewIn", { v: v.v })) + '</h3><div class="quote ph">' + esc(notes) + "</div></div>" : "") +
            '<div class="impact" style="margin-top:10px"><h4>' + icon("shield", "sm") + " " + esc(T("au.uv.consent.title")) + '</h4><p class="dim small">' + esc(T("au.uv.consent.body", { host: "www.okx.com" })) + "</p></div>" +
            '<div class="row-actions" style="margin-top:12px"><button class="btn btn-fetch" data-toast="au.toast.updated">' + esc(T("au.uv.updateTo", { v: v ? v.v : "" })) + "</button></div></div>" +
            "</div>"
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
    function startWizard(id) {
        var w = find(id);
        var hi = highest(w);
        S.wiz = {
            id: id,
            step: 1,
            /* "first" = nothing approved yet: the catalog choice applies and the notes are optional */
            first: !w.everApproved,
            choice: hi ? "patch" : "manifest",
            custom: "",
            notesRu: "",
            notesEn: "",
            packed: false,
            visibility: "catalog",
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
        if (!parseV(v)) return T("au.wiz.v.badFormat");
        if (hi && cmpV(v, hi.v) <= 0) return T("au.wiz.v.notAfter", { v: hi.v });
        return null;
    }
    function renderWizard() {
        var z = S.wiz;
        var w = find(z.id);
        var steps = ["au.wiz.s1", "au.wiz.s2", "au.wiz.s3", "au.wiz.s4"];
        var stepper =
            '<ol class="stepper">' +
            steps
                .map(function (k, i) {
                    var n = i + 1;
                    return "<li" + (n === z.step ? ' aria-current="step"' : n < z.step ? ' class="done"' : "") + ">" + esc(T(k)) + "</li>";
                })
                .join("") +
            "</ol>";
        var body;
        var next = "";
        var block = !linked(w);
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
            dlgHead(T("au.wiz.title", { name: w.name })) + stepper + '<div class="wiz-body">' + body + "</div>" +
                '<div class="actions"><button class="btn btn-link" data-act="wiz-cancel" style="margin-right:auto">' + esc(T("au.cancel")) + "</button>" + next + "</div>"
        );
    }
    function wizSource(w) {
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
            "<span>" + esc(T("au.wiz.inFolder")) + " <b>" + esc(w.code.manifestVersion) + "</b></span></div>";
        function radio(choice, v, title, sub) {
            return (
                '<label class="radio"><input type="radio" name="wv" data-act="wiz-choice" value="' + choice + '"' + (z.choice === choice ? " checked" : "") + "/><div><b>" + (v ? '<span class="mono">' + esc(v) + "</span> · " : "") + esc(title) + "</b>" + (sub ? "<span>" + esc(sub) + "</span>" : "") +
                (choice === "custom" ? '<input class="input input-sm inline-input" id="wiz-custom" placeholder="1.2.3" value="' + esc(z.custom) + '"/>' : "") + "</div></label>"
            );
        }
        var base = hi ? hi.v : null;
        var radios = hi
            ? radio("patch", bump(base, "patch"), T("au.wiz.v.patch"), T("au.wiz.v.patchSub")) + radio("minor", bump(base, "minor"), T("au.wiz.v.minor"), T("au.wiz.v.minorSub")) + radio("major", bump(base, "major"), T("au.wiz.v.major"), T("au.wiz.v.majorSub")) + radio("custom", null, T("au.wiz.v.custom"), null)
            : radio("manifest", w.code.manifestVersion, T("au.wiz.v.fromManifest"), T("au.wiz.v.fromManifestSub")) + radio("custom", null, T("au.wiz.v.custom"), null);
        var err = wizVersionError(w);
        return (
            wizSource(w) + facts + '<div class="vis">' + radios + "</div>" +
            (err && (z.choice === "custom" && z.custom) ? '<p class="err" style="margin-top:6px">' + esc(err) + "</p>" : "") +
            '<p class="hint" style="margin-top:8px">' + esc(T("au.wiz.v.written")) + "</p>"
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
        var vis;
        if (z.first) {
            vis =
                '<h4 style="margin:10px 0 6px">' + esc(T("au.wiz.vis.title")) + "</h4>" +
                '<div class="vis">' +
                '<label class="radio"><input type="radio" name="wvis" value="catalog" data-act="wiz-vis"' + (z.visibility === "catalog" ? " checked" : "") + "/><div><b>" + esc(T("au.vis.catalog")) + "</b><span>" + esc(T("au.wiz.vis.catalogSub")) + "</span></div></label>" +
                '<label class="radio"><input type="radio" name="wvis" value="link" data-act="wiz-vis"' + (z.visibility === "link" ? " checked" : "") + "/><div><b>" + esc(T("au.vis.link")) + "</b><span>" + esc(T("au.wiz.vis.linkSub")) + "</span></div></label></div>" +
                '<p class="hint" style="margin-top:6px">' + esc(T("au.wiz.vis.firstReview")) + "</p>";
        } else {
            vis = '<p class="dim" style="margin-top:8px">' + esc(T("au.wiz.vis.current", { vis: w.visibility === "link" ? T("au.state.link") : T("au.state.live") })) + "</p>";
        }
        var err = z.error ? '<div class="banner banner-error" style="margin-top:10px">' + icon("warn") + '<div class="banner-body">' + esc(z.error) + "</div></div>" : "";
        return sum + vis + err;
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
        if (!z.first && w.live) {
            var add = w.code.egress.filter(function (h) {
                return w.live.egress.indexOf(h) < 0;
            });
            if (add.length) nv.added = { egress: add };
        }
        w.versions.unshift(nv);
        w.code.manifestVersion = v;
        if (!w.share) w.share = "Nw3Qe8Rt1Yu6Io9Pa4Sd7Fg2Hj5Kl0Zx3Cv8Bn1Mq6W";
        if (z.first) w.catalogRequested = z.visibility === "catalog";
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
                render();
                break;
            case "bell-close":
                S.bell = false;
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
            case "wiz-back":
                S.wiz.step--;
                S.wiz.error = null;
                renderWizard();
                break;
            case "wiz-cancel":
                wizCancel();
                break;
            case "wiz-submit":
                wizSubmit();
                break;
            /* mock bar */
            case "vw":
                S.vw = el.getAttribute("data-v");
                render();
                break;
            case "author-state":
                S.author = el.getAttribute("data-v");
                S.keyShown = false;
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
        if (el.id === "wiz-custom") {
            S.wiz.custom = el.value;
            var w = find(S.wiz.id);
            var btn = dlg.querySelector('[data-act="wiz-next"]');
            if (btn) btn.disabled = !!wizVersionError(w);
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
        z.step++;
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
