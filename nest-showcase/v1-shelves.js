/* Variant 1 — SHELVES. A storefront: an «Обзор» home of horizontal shelves (partners first, then
   new, popular this week, recently updated, and a by-category block), sections as pills above.
   Any section, search, tag or author turns the page into a grid of the same tiles.
   Partners: a banner card with the icon's colour on the home; «Партнёры» is a hall of wide
   posters, one per partner, with everything about the widget on the card. */
(function () {
    "use strict";
    var X = window.SHOW;
    var T = X.T, esc = X.esc, svg = X.svg;

    function tile(e, opts) {
        opts = opts || {};
        var body = opts.notes && X.notesOf(e)
            ? '<p class="t-notes clamp-2"><b>' + esc(e.version) + "</b> · " + esc(X.notesOf(e).text) + "</p>"
            : X.descHtml(e, "desc clamp-2 t-desc");
        return (
            '<article class="tile' + (e.partner ? " is-partner" : "") + '">' +
            (opts.rank ? '<span class="t-rank">' + opts.rank + "</span>" : "") +
            '<div class="t-head">' + X.iconHtml(e, 40) +
            '<div class="t-id"><div class="t-name"><span class="clamp-1">' + esc(e.name) + "</span></div>" +
            '<div class="t-by">' + X.authorHtml(e, { channels: false }) + '<span class="ver">v' + esc(e.version) + "</span></div></div></div>" +
            '<div class="badges t-badges">' + X.badgesHtml(e) + (opts.updatedAgo ? '<span class="t-when">' + esc(X.fmtRel(e.listedAtMs)) + "</span>" : "") + "</div>" +
            body +
            '<div class="t-foot"><span class="stats-inline">' + X.statInline(e, ["installs", "week"]) + "</span>" + X.actionsHtml(e, { compact: true, menu: false }) + "</div>" +
            "</article>"
        );
    }

    function shelf(key, title, icon, rows, opts) {
        if (!rows.length) return "";
        opts = opts || {};
        return (
            '<section class="shelf">' +
            '<div class="sec-head"><h2>' + svg(icon) + esc(title) + '</h2><span class="sub">' + esc(opts.sub || X.countWidgets(rows.length)) + "</span>" +
            (opts.sec ? '<button type="button" class="more-link" data-sec="' + opts.sec + '">' + esc(T("seeAll")) + svg("x-chevron-right") + "</button>" : "") +
            '<span class="shelf-arrows"><button type="button" class="btn btn-sm btn-icon" data-shelf="prev" aria-label="' + esc(T("shelf.prev")) + '">' + svg("x-chevron-left") +
            '</button><button type="button" class="btn btn-sm btn-icon" data-shelf="next" aria-label="' + esc(T("shelf.next")) + '">' + svg("x-chevron-right") + "</button></span></div>" +
            '<div class="shelf-track">' + rows.map(function (e, i) { return tile(e, { rank: opts.ranked ? i + 1 : 0, notes: opts.notes, updatedAgo: opts.updatedAgo }); }).join("") + "</div>" +
            "</section>"
        );
    }

    /* the home's partner banner card */
    function partnerCard(e) {
        return (
            '<article class="pcard is-partner" style="--tint:' + X.tintOf(e) + '">' +
            '<div class="pc-banner poster"><span class="poster-glow"></span>' + X.partnerBadge(false) + "</div>" +
            '<div class="pc-body">' +
            '<div class="pc-head">' + X.iconHtml(e, 52, "pc-icon") +
            '<span class="badges">' + X.badgesHtml(e, { noPartner: true }) + "</span>" + X.trustIconsHtml(e) + "</div>" +
            '<div class="pc-id"><div class="pc-name">' + esc(e.name) + ' <span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="pc-by">' + X.authorHtml(e) + "</div></div>" +
            X.descHtml(e, "desc clamp-2") +
            '<div class="pc-foot"><span class="stats-inline">' + X.statInline(e, ["installs", "week"]) + "</span>" + X.actionsHtml(e, { compact: true, menu: false }) + "</div>" +
            "</div></article>"
        );
    }

    function categoryBlock(key) {
        var rows = X.sortRows(X.listings.filter(function (e) { return e.category === key; }), { key: "installs", dir: -1 });
        return (
            '<div class="catblock">' +
            '<button type="button" class="cb-head" data-sec="cat:' + key + '">' + X.catIcon(key) + "<b>" + esc(X.catLabel(key)) + '</b><span class="dim">' + rows.length + "</span>" + svg("x-chevron-right", "mlauto") + "</button>" +
            rows.slice(0, 4).map(function (e) {
                return (
                    '<div class="cb-row' + (e.partner ? " cb-partner" : "") + '">' + X.iconHtml(e, 22) + '<span class="cb-name">' + esc(e.name) + "</span>" +
                    (e.partner ? X.svg("x-handshake", "cb-p") : "") +
                    '<span class="si">' + svg("x-download") + X.fmtNum(e.installs) + "</span></div>"
                );
            }).join("") +
            "</div>"
        );
    }

    function home(c) {
        var L = X.listings;
        var partners = X.sortRows(L.filter(function (e) { return e.partner; }), { key: "installs", dir: -1 });
        var fresh = X.sortRows(L.filter(X.isNew), { key: "newest", dir: -1 });
        var popular = X.sortRows(L, { key: "active", dir: -1 }).slice(0, 8);
        var updated = L.filter(function (e) { return e.listedAtMs && e.listedAtMs !== e.firstListedAtMs; })
            .sort(function (a, b) { return b.listedAtMs - a.listedAtMs; })
            .slice(0, 8);
        return (
            '<section class="v1-partners">' +
            '<div class="sec-head partner"><h2>' + svg("x-handshake") + esc(T("shelf.partners")) + '</h2><span class="sub">' + esc(T("partners.lead")) + "</span>" +
            '<button type="button" class="more-link" data-sec="partners">' + esc(T("partners.all")) + svg("x-chevron-right") + "</button></div>" +
            '<div class="pcards">' + partners.map(partnerCard).join("") + "</div></section>" +
            shelf("new", T("shelf.new"), "x-sparkles", fresh, { sec: "new" }) +
            shelf("popular", T("shelf.popular"), "x-trophy", popular, { ranked: true, sub: T("feed.top.sub") }) +
            shelf("updated", T("shelf.updated"), "i-refresh", updated, { notes: true, updatedAgo: true, sub: T("feed.updates.sub") }) +
            '<section class="v1-cats"><div class="sec-head"><h2>' + svg("x-layers") + esc(T("shelf.byCategory")) + "</h2></div>" +
            '<div class="catblocks">' + X.categoriesPresent().map(categoryBlock).join("") + "</div></section>"
        );
    }

    function listView(c) {
        if (!c.rows.length) return X.emptyHtml();
        return '<div class="tile-grid">' + c.page.rows.map(function (e) { return tile(e, {}); }).join("") + "</div>" + X.pagerHtml(c.page.shown, c.page.total);
    }

    /* «Партнёры»: the hall — one wide poster card per partner */
    function hallCard(e) {
        var notes = X.notesOf(e);
        return (
            '<article class="hall" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 84, name: true, coverNote: true, cls: "hall-poster" }) +
            '<div class="hall-body">' +
            '<div class="hall-top"><div><div class="hall-name">' + esc(e.name) + ' <span class="ver">v' + esc(e.version) + "</span></div>" +
            '<div class="hall-by">' + X.authorHtml(e, { channels: false }) + X.channelsHtml(e, true) + "</div></div>" +
            '<div class="badges">' + X.partnerBadge(true) + X.badgesHtml(e, { noPartner: true }) + "</div></div>" +
            X.descHtml(e, "desc hall-desc") +
            (notes ? '<p class="notes-line clamp-2"><b>' + esc(T("insp.notes", { v: e.version })) + ":</b> " + esc(notes.text) + "</p>" : "") +
            '<div class="stat-tiles">' +
            '<div class="stat-tile"><b>' + X.fmtNum(e.installs) + "</b><span>" + esc(T("stat.installs")) + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeInstalls) + "</b><span>" + esc(T("stat.active")) + "</span></div>" +
            '<div class="stat-tile"><b>' + X.fmtNum(e.activeUsers7d) + "</b><span>" + esc(T("stat.week")) + "</span></div>" +
            '<div class="stat-tile"><b>' + esc(X.fmtRelShort(e.updatedAtMs)) + "</b><span>" + esc(T("stat.updated")) + "</span></div></div>" +
            '<div class="hall-foot">' + X.trustIconsHtml(e, { labels: true }) + '<span class="chips">' + X.tagChipsHtml(e, 4) + "</span>" +
            '<span class="mlauto acts-wrap">' + X.actionsHtml(e, { size: "md" }) + '<button type="button" class="btn btn-link btn-sm" data-act="page" data-id="' + esc(e.id) + '">' + esc(T("act.page")) + " →</button></span></div>" +
            "</div></article>"
        );
    }
    function partnersView(c) {
        var rows = c.rows;
        var sum = function (f) { return rows.reduce(function (s, e) { return s + (e[f] || 0); }, 0); };
        return (
            '<div class="partners-lead"><span class="pl-icon">' + svg("x-handshake") + "</span><div><h2>" + esc(T("partners.title")) + "</h2><p>" + esc(T("partners.lead")) + "</p></div>" +
            '<div class="pl-stats"><div><b>' + rows.length + "</b><span>" + esc(T("summary.partners")) + "</span></div><div><b>" + X.fmtNum(sum("installs")) + "</b><span>" + esc(T("summary.installs")) + "</span></div><div><b>" + X.fmtNum(sum("activeUsers7d")) + "</b><span>" + esc(T("summary.week")) + "</span></div></div></div>" +
            (X.anyFilter() ? "" : X.announcementHtml({ cls: "v1-ann" })) +
            (rows.length ? '<div class="halls">' + rows.map(hallCard).join("") + "</div>" : X.emptyHtml())
        );
    }

    X.register({
        id: "shelves",
        defaultSection: "home",
        render: function (c, S) {
            var body = c.view === "home" ? home(c) : c.view === "partners" ? partnersView(c) : listView(c);
            var listHead = c.view === "list"
                ? '<div class="v1-listhead"><b>' + esc(S.section.indexOf("cat:") === 0 ? X.catLabel(S.section.slice(4)) : T("sec." + (S.section === "home" ? "all" : S.section))) + '</b><span class="dim">' + esc(X.countWidgets(c.rows.length)) + "</span></div>"
                : "";
            return (
                '<div class="v1-top">' + X.searchHtml("v1-search") + X.authorChipHtml() + X.tagMenuHtml() + X.sortMenuHtml() + "</div>" +
                '<div class="v1-nav">' + X.sectionPillsHtml({ home: true }) + "</div>" +
                '<div class="v1-main scroll" data-scroll="main">' + listHead + body + "</div>"
            );
        }
    });
})();
