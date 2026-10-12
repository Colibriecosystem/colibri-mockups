/* Variant 4 — LIST + CARD. A compact two-line list on the left; the selected widget's whole card
   on the right — numbers, what it may do, where it connects, what's new, the facts — so choosing
   needs no page. The list stays short because the card carries the detail. A partner's row carries
   the violet stripe; its card opens with a poster. «Партнёры» lists posters, and the partner's
   announcement sits on top of its card. */
(function () {
    "use strict";
    var X = window.SHOW;
    var T = X.T, esc = X.esc, svg = X.svg;

    function listRow(e, sel) {
        return (
            '<div class="lr' + (e.partner ? " lr-partner" : "") + (sel ? " is-sel" : "") + '" data-select="' + esc(e.id) + '">' +
            X.iconHtml(e, 36) +
            '<div class="lr-main">' +
            '<div class="lr-l1"><b>' + esc(e.name) + '</b><span class="ver">v' + esc(e.version) + '</span><span class="badges">' + X.badgesHtml(e) + "</span></div>" +
            '<div class="lr-l2">' + X.authorHtml(e, { channels: false }) + '<span class="sep">·</span><span class="lr-cat">' + esc(X.catLabel(e.category)) + "</span>" +
            '<span class="sep">·</span>' + X.statInline(e, ["installs", "week"]) + "</div>" +
            "</div>" +
            '<div class="lr-act">' + X.actionsHtml(e, { compact: true, menu: false }) + "</div>" +
            "</div>"
        );
    }
    function posterRow(e, sel) {
        return (
            '<div class="pr' + (sel ? " is-sel" : "") + '" data-select="' + esc(e.id) + '" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 40, cls: "pr-poster" }) +
            '<div class="pr-main">' +
            '<div class="lr-l1"><b>' + esc(e.name) + '</b><span class="ver">v' + esc(e.version) + '</span><span class="badges">' + X.badgesHtml(e, { noPartner: true }) + "</span></div>" +
            '<div class="lr-l2">' + X.authorHtml(e) + "</div>" +
            X.descHtml(e, "desc clamp-2") +
            '<div class="lr-l2">' + X.statInline(e, ["installs", "active", "week"]) + "</div>" +
            "</div></div>"
        );
    }

    function section(title, body, cls) {
        return body ? '<section class="is-sec' + (cls ? " " + cls : "") + '"><h3>' + esc(title) + "</h3>" + body + "</section>" : "";
    }
    function inspector(e) {
        if (!e) return '<div class="insp-empty">' + svg("x-layers", "lg") + "<span>" + esc(T("insp.empty")) + "</span></div>";
        var notes = X.notesOf(e);
        var keep = X.keepShare(e);
        var p = e.partner;
        var ann = X.announcement();
        var scopes = (e.permissions || []).length
            ? '<ul class="scope-lines">' + e.permissions.map(function (s) {
                  var cls = s === "trading" ? "danger" : s === "account:read" ? "warn" : "";
                  return '<li class="' + cls + '">' + svg("x-key") + "<span>" + esc(T("scope." + s)) + "</span></li>";
              }).join("") + "</ul>"
            : '<p class="dim">' + esc(T("trust.scopes.none")) + "</p>";
        var pk = X.packageFact(e);
        return (
            (p && ann && ann.e.id === e.id && !X.anyFilter() ? '<div class="insp-ann">' + X.announcementHtml({ cls: "ann-vertical" }) + "</div>" : "") +
            '<div class="insp-card' + (p ? " insp-partner" : "") + '" style="--tint:' + X.tintOf(e) + '">' +
            '<div class="insp-hero poster' + (p ? "" : " neutral") + '"><span class="poster-glow"></span>' + (p ? X.partnerBadge(true) : "") + (p ? '<span class="poster-note ph">' + esc(T("cover.placeholder")) + "</span>" : "") + "</div>" +
            '<div class="insp-head">' + X.iconHtml(e, 64, "insp-icon") + '<div class="insp-id"><div class="insp-name">' + esc(e.name) + "</div>" +
            '<div class="insp-sub"><span class="ver">v' + esc(e.version) + '</span><span class="badges">' + X.badgesHtml(e, { noPartner: true }) + "</span></div></div></div>" +
            '<div class="insp-by">' + X.authorHtml(e, { channels: false }) + X.channelsHtml(e, true) + "</div>" +
            '<div class="insp-acts">' + X.actionsHtml(e, { size: "md" }) + '<button type="button" class="btn btn-link btn-sm" data-act="page" data-id="' + esc(e.id) + '">' + esc(T("act.page")) + " →</button></div>" +
            '<div class="stat-tiles insp-stats">' +
            '<div class="stat-tile"><b>' + X.fmtNum(e.installs) + "</b><span>" + esc(T("stat.installs")) + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeInstalls) + "</b><span>" + esc(T("stat.active")) + (keep !== null ? " · " + keep + "%" : "") + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeUsers7d) + "</b><span>" + esc(T("stat.week")) + "</span></div>" +
            '<div class="stat-tile"><b>' + esc(X.fmtRelShort(e.updatedAtMs)) + "</b><span>" + esc(T("stat.updated")) + "</span></div></div>" +
            section(T("insp.about"), X.descHtml(e, "desc insp-desc")) +
            (notes ? section(T("insp.notes", { v: e.version }), '<p class="desc">' + esc(notes.text) + "</p>", "is-notes") : "") +
            section(T("insp.access"), '<div class="chips"><span class="chip chip-' + pk.cls + '" title="' + esc(pk.tip) + '">' + esc(pk.chip) + "</span></div>" + scopes) +
            section(T("insp.network") + ((e.egress || []).length ? " · " + e.egress.length : ""), X.hostsHtml(e, 14)) +
            ((e.tags || []).length ? section(T("grp.tags"), '<div class="chips">' + X.tagChipsHtml(e) + "</div>") : "") +
            section(
                T("insp.facts"),
                '<dl class="insp-facts">' +
                    "<dt>" + esc(T("col.category")) + "</dt><dd>" + X.catIcon(e.category) + " " + esc(X.catLabel(e.category)) + "</dd>" +
                    "<dt>" + esc(T("stat.listed")) + "</dt><dd>" + esc(X.fmtDate(e.firstListedAtMs)) + "</dd>" +
                    "<dt>" + esc(T("stat.updated")) + "</dt><dd>" + esc(X.fmtDate(e.updatedAtMs)) + "</dd>" +
                    "<dt>" + esc(T("stat.size")) + "</dt><dd>" + esc(X.fmtBytes(e.sizeBytes)) + "</dd>" +
                    "<dt>" + esc(T("stat.surfaces")) + "</dt><dd>" + (e.surfaces || []).map(function (s) { return esc(T("surface." + s)); }).join(" · ") + "</dd>" +
                    "<dt>" + esc(T("stat.hash")) + '</dt><dd class="mono" title="' + esc(e.hash) + '">' + esc((e.hash || "").slice(0, 16)) + "…</dd>" +
                    "</dl>"
            ) +
            "</div>"
        );
    }

    function tabs(S, counts) {
        var tab = function (sec, label, n, cls, icon) {
            return '<button type="button" class="v4-tab' + (cls ? " " + cls : "") + '" data-sec="' + sec + '" aria-pressed="' + (S.section === sec) + '">' + (icon ? svg(icon) : "") + "<span>" + esc(label) + '</span><span class="pc">' + n + "</span></button>";
        };
        return (
            '<div class="v4-tabs">' +
            tab("new", T("sec.new"), counts.new, "t-new", "x-sparkles") +
            tab("partners", T("sec.partners"), counts.partners, "t-partner", "x-handshake") +
            tab("all", T("sec.all"), counts.all) +
            '<span class="v4-catmenu">' + X.categoryMenuHtml() + "</span>" +
            "</div>"
        );
    }

    X.register({
        id: "inspector",
        defaultSection: "all",
        render: function (c, S) {
            var rows = c.page.rows;
            var sel = null;
            for (var i = 0; i < rows.length; i++) if (rows[i].id === S.selected) sel = rows[i];
            if (!sel) sel = rows[0] || null;
            var isPartners = c.view === "partners";
            var list = rows.length
                ? rows.map(function (e) { return isPartners ? posterRow(e, sel && sel.id === e.id) : listRow(e, sel && sel.id === e.id); }).join("") + X.pagerHtml(c.page.shown, c.page.total)
                : X.emptyHtml();
            return (
                '<div class="v4-list">' +
                '<div class="v4-top">' + X.searchHtml("v4-search") + X.tagMenuHtml(true) + X.sortMenuHtml() + "</div>" +
                tabs(S, c.counts) +
                (S.author ? '<div class="v4-filters">' + X.authorChipHtml() + "</div>" : "") +
                '<div class="v4-rows scroll' + (isPartners ? " v4-prows" : "") + '" data-scroll="list">' +
                (isPartners ? '<div class="v4-plead">' + svg("x-handshake") + "<div><b>" + esc(T("partners.title")) + "</b><span>" + esc(T("partners.lead")) + "</span></div></div>" : "") +
                list + "</div>" +
                "</div>" +
                '<aside class="v4-insp scroll" data-scroll="insp">' + inspector(sel) + "</aside>"
            );
        }
    });
})();
