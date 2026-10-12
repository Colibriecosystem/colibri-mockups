/* Variant 2 — TILES. The terminal's rail stays; the list becomes a grid of dense cards: three
   lines of description, three numbers, three trust facts, the action. A partner's card is twice as
   wide, with a poster in the icon's colour. «Партнёры» is a mosaic: the first partner (by installs)
   takes a 2×2 block with everything, the others 1×1 beside it. */
(function () {
    "use strict";
    var X = window.SHOW;
    var T = X.T, esc = X.esc, svg = X.svg;

    function nums(e) {
        var cell = function (v, label, title) {
            return v === null || v === undefined ? "" : '<div title="' + esc(title) + '"><b>' + X.fmtNum(v) + "</b><span>" + esc(label) + "</span></div>";
        };
        return (
            '<div class="c2-nums">' +
            cell(e.installs, T("stat.installs.short"), T("stat.installs")) +
            cell(e.activeInstalls, T("stat.active.short"), T("stat.active")) +
            cell(e.activeUsers7d, T("stat.week.short"), T("stat.week")) +
            "</div>"
        );
    }
    function body(e, clamp) {
        return X.updateNotesHtml(e, "notes-line clamp-" + clamp) || X.descHtml(e, "desc clamp-" + clamp);
    }

    function card(e) {
        if (e.partner) return wideCard(e);
        return (
            '<article class="c2">' +
            '<header class="c2-head">' + X.iconHtml(e, 36) +
            '<div class="c2-id"><div class="c2-name"><span>' + esc(e.name) + '</span><span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="c2-by">' + X.authorHtml(e) + '<span class="badges">' + X.badgesHtml(e) + "</span></div></div>" + X.menuFor(e) + "</header>" +
            body(e, 2) +
            nums(e) +
            '<footer class="c2-foot">' + X.trustIconsHtml(e) + X.actionsHtml(e, { compact: true, menu: false }) + "</footer>" +
            "</article>"
        );
    }

    function wideCard(e) {
        return (
            '<article class="c2 c2-wide is-partner" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 64, name: false, cls: "c2-poster" }) +
            '<div class="c2-wbody">' +
            '<header class="c2-head"><div class="c2-id"><div class="c2-name big"><span>' + esc(e.name) + '</span><span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="c2-by">' + X.authorHtml(e) + "</div></div>" + X.menuFor(e) + "</header>" +
            '<div class="badges c2-badges">' + X.partnerBadge(true) + X.badgesHtml(e, { noPartner: true }) + '<span class="c2-cat">' + X.catIcon(e.category) + esc(X.catLabel(e.category)) + "</span></div>" +
            body(e, 3) +
            nums(e) +
            '<footer class="c2-foot">' + X.trustIconsHtml(e, { labels: true }) + X.actionsHtml(e, { compact: true, menu: false }) + "</footer>" +
            "</div></article>"
        );
    }

    function listView(c, S) {
        var title = S.section.indexOf("cat:") === 0 ? X.catLabel(S.section.slice(4)) : T("sec." + S.section);
        return (
            '<div class="v2-head"><h2>' + esc(title) + '</h2><span class="dim">' + esc(X.countWidgets(c.rows.length)) + "</span></div>" +
            (c.rows.length ? '<div class="c2-grid">' + c.page.rows.map(card).join("") + "</div>" + X.pagerHtml(c.page.shown, c.page.total) : X.emptyHtml())
        );
    }

    /* «Партнёры»: the mosaic */
    function heroCard(e) {
        return (
            '<article class="bento-hero is-partner" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 80, name: true, coverNote: true, cls: "bento-poster" }) +
            '<div class="bento-body">' +
            '<div class="bento-top"><div><div class="bento-name">' + esc(e.name) + ' <span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="c2-by">' + X.authorHtml(e, { channels: false }) + X.channelsHtml(e, true) + "</div></div>" +
            '<div class="badges">' + X.partnerBadge(true) + X.badgesHtml(e, { noPartner: true }) + "</div></div>" +
            X.descHtml(e, "desc bento-desc") +
            '<div class="stat-tiles">' +
            '<div class="stat-tile"><b>' + X.fmtNum(e.installs) + "</b><span>" + esc(T("stat.installs")) + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeInstalls) + "</b><span>" + esc(T("stat.active")) + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeUsers7d) + "</b><span>" + esc(T("stat.week")) + "</span></div>" +
            '<div class="stat-tile"><b>' + esc(X.fmtRelShort(e.updatedAtMs)) + "</b><span>" + esc(T("stat.updated")) + "</span></div></div>" +
            X.chipGroupsHtml(e) +
            '<div class="bento-foot">' + X.actionsHtml(e, { size: "lg" }) + '<button type="button" class="btn btn-link btn-sm" data-act="page" data-id="' + esc(e.id) + '">' + esc(T("act.page")) + " →</button></div>" +
            "</div></article>"
        );
    }
    function smallCard(e) {
        return (
            '<article class="bento-small is-partner" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 48, name: false, cls: "bento-sposter" }) +
            '<div class="bento-sbody">' +
            '<div class="c2-name big"><span>' + esc(e.name) + '</span><span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="c2-by">' + X.authorHtml(e) + "</div>" +
            '<div class="badges">' + X.partnerBadge(false) + X.badgesHtml(e, { noPartner: true }) + "</div>" +
            X.descHtml(e, "desc clamp-3") +
            nums(e) +
            '<footer class="c2-foot">' + X.trustIconsHtml(e) + X.actionsHtml(e, { compact: true }) + "</footer>" +
            "</div></article>"
        );
    }
    function partnersView(c) {
        var rows = X.sortRows(c.rows, { key: "installs", dir: -1 });
        var sum = function (f) { return rows.reduce(function (s, e) { return s + (e[f] || 0); }, 0); };
        return (
            '<div class="partners-lead"><span class="pl-icon">' + svg("x-handshake") + "</span><div><h2>" + esc(T("partners.title")) + "</h2><p>" + esc(T("partners.lead")) + "</p></div>" +
            '<div class="pl-stats"><div><b>' + rows.length + "</b><span>" + esc(T("summary.partners")) + "</span></div><div><b>" + X.fmtNum(sum("installs")) + "</b><span>" + esc(T("summary.installs")) + "</span></div><div><b>" + X.fmtNum(sum("activeUsers7d")) + "</b><span>" + esc(T("summary.week")) + "</span></div></div></div>" +
            (rows.length
                ? '<div class="bento">' + heroCard(rows[0]) + rows.slice(1).map(smallCard).join("") + (X.anyFilter() ? "" : X.announcementHtml({ cls: "bento-ann" })) + "</div>"
                : X.emptyHtml())
        );
    }

    X.register({
        id: "tiles",
        defaultSection: "all",
        render: function (c, S) {
            return (
                X.railHtml() +
                '<div class="v2-main">' +
                '<div class="v2-top">' + X.searchHtml("v2-search") + X.authorChipHtml() + X.tagMenuHtml() + X.sortMenuHtml() + "</div>" +
                '<div class="v2-scroll scroll" data-scroll="main">' + (c.view === "partners" ? partnersView(c) : listView(c, S)) + "</div>" +
                "</div>"
            );
        }
    });
})();
