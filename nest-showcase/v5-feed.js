/* Variant 5 — FEED. The terminal's rail stays; «Обзор» on top of it is Nest's news: the partner
   announcement beside a partners panel, the top of the week as a leaderboard, the new widgets,
   fresh versions with what changed, categories with their numbers. Lists are two-line rows with
   numbers on the right. «Партнёры» is a magazine spread — a poster block per partner, alternating
   sides. */
(function () {
    "use strict";
    var X = window.SHOW;
    var T = X.T, esc = X.esc, svg = X.svg;

    function head(icon, title, sub, sec, cls) {
        return (
            '<div class="sec-head' + (cls ? " " + cls : "") + '"><h2>' + svg(icon) + esc(title) + "</h2>" + (sub ? '<span class="sub">' + esc(sub) + "</span>" : "") +
            (sec ? '<button type="button" class="more-link" data-sec="' + sec + '">' + esc(T("seeAll")) + svg("x-chevron-right") + "</button>" : "") +
            "</div>"
        );
    }

    function partnersPanel() {
        var ps = X.sortRows(X.listings.filter(function (e) { return e.partner; }), { key: "installs", dir: -1 });
        return (
            '<section class="f-ppanel">' +
            head("x-handshake", T("partners.title"), "", "partners", "partner") +
            ps.map(function (e) {
                return (
                    '<div class="pp-row" style="--tint:' + X.tintOf(e) + '">' + X.iconHtml(e, 38) +
                    '<div class="pp-main"><div class="pp-name">' + esc(e.name) + "</div>" +
                    '<div class="pp-sub">' + X.authorHtml(e, { channels: false }) + '<span class="sep">·</span>' + X.statInline(e, ["installs", "week"]) + "</div></div>" +
                    X.actionsHtml(e, { compact: true, menu: false }) + "</div>"
                );
            }).join("") +
            "</section>"
        );
    }

    function leaderboard() {
        var rows = X.sortRows(X.listings, { key: "active", dir: -1 }).slice(0, 7);
        var max = X.maxOf("activeUsers7d");
        return (
            '<section class="f-box">' + head("x-trophy", T("feed.top"), T("feed.top.sub")) +
            '<ol class="lb">' +
            rows.map(function (e, i) {
                return (
                    '<li class="' + (e.partner ? "lb-partner" : "") + '"><span class="lb-rank">' + (i + 1) + "</span>" + X.iconHtml(e, 26) +
                    '<span class="lb-name"><b>' + esc(e.name) + "</b>" + (e.partner ? svg("x-handshake", "lb-p") : "") + '<span class="dim">' + esc(e.author || "") + "</span></span>" +
                    '<span class="lb-bar"><i style="width:' + Math.round((e.activeUsers7d / max) * 100) + '%"></i></span><span class="lb-v">' + X.fmtNum(e.activeUsers7d) + "</span></li>"
                );
            }).join("") +
            "</ol></section>"
        );
    }

    function newBox() {
        var rows = X.sortRows(X.listings.filter(X.isNew), { key: "newest", dir: -1 });
        if (!rows.length) return "";
        return (
            '<section class="f-box">' + head("x-sparkles", T("feed.new"), X.countWidgets(rows.length), "new") +
            rows.map(function (e) {
                return (
                    '<div class="nw' + (e.partner ? " nw-partner" : "") + '">' + X.iconHtml(e, 36) +
                    '<div class="nw-main"><div class="nw-l1"><b>' + esc(e.name) + '</b><span class="badges">' + (e.partner ? X.partnerBadge(false) : "") + '</span><span class="nw-when">' + esc(X.fmtRel(e.firstListedAtMs)) + "</span></div>" +
                    X.descHtml(e, "desc clamp-2") + "</div>" +
                    X.actionsHtml(e, { compact: true, menu: false }) + "</div>"
                );
            }).join("") +
            "</section>"
        );
    }

    function updatesBox() {
        var rows = X.listings
            .filter(function (e) { return e.listedAtMs && e.listedAtMs !== e.firstListedAtMs; })
            .sort(function (a, b) { return b.listedAtMs - a.listedAtMs; })
            .slice(0, 6);
        return (
            '<section class="f-box f-updates">' + head("i-refresh", T("feed.updates"), T("feed.updates.sub")) +
            '<div class="up-list">' +
            rows.map(function (e) {
                var n = X.notesOf(e);
                return (
                    '<div class="up' + (e.partner ? " up-partner" : "") + '"><span class="up-date">' + esc(X.fmtShortDate(e.listedAtMs)) + "</span>" + X.iconHtml(e, 30) +
                    '<div class="up-main"><div class="up-l1"><b>' + esc(e.name) + '</b><span class="up-ver">v' + esc(e.version) + "</span>" + (e.partner ? X.partnerBadge(false) : "") + "</div>" +
                    (n ? '<p class="desc clamp-2">' + esc(n.text) + "</p>" : '<p class="faint up-none">' + esc(T("feed.noNotes")) + "</p>") + "</div>" +
                    X.actionsHtml(e, { compact: true, menu: false }) + "</div>"
                );
            }).join("") +
            "</div></section>"
        );
    }

    function categoriesBox() {
        return (
            '<section class="f-cats-wrap">' + head("x-layers", T("feed.categories")) +
            '<div class="f-cats">' +
            X.categoriesPresent().map(function (k) {
                var rows = X.sortRows(X.listings.filter(function (e) { return e.category === k; }), { key: "installs", dir: -1 });
                var inst = rows.reduce(function (s, e) { return s + (e.installs || 0); }, 0);
                return (
                    '<button type="button" class="fc" data-sec="cat:' + k + '"><span class="fc-icon">' + X.catIcon(k) + "</span>" +
                    '<span class="fc-main"><b>' + esc(X.catLabel(k)) + '</b><span class="dim">' + esc(X.countWidgets(rows.length)) + " · " + esc(T("feed.catInstalls", { n: X.fmtNum(inst) })) + "</span></span>" +
                    '<span class="fc-stack">' + rows.slice(0, 4).map(function (e) { return X.iconHtml(e, 22); }).join("") + "</span></button>"
                );
            }).join("") +
            "</div></section>"
        );
    }

    function home() {
        return (
            '<div class="f-row f-top">' + X.announcementHtml({ cls: "f-ann" }) + partnersPanel() + "</div>" +
            '<div class="f-row f-two">' + leaderboard() + newBox() + "</div>" +
            updatesBox() +
            categoriesBox()
        );
    }

    function feedRow(e) {
        return (
            '<div class="fr' + (e.partner ? " fr-partner" : "") + '">' + X.iconHtml(e, 40) +
            '<div class="fr-main">' +
            '<div class="fr-l1"><b>' + esc(e.name) + '</b><span class="ver">v' + esc(e.version) + '</span><span class="badges">' + X.badgesHtml(e) + "</span></div>" +
            (X.updateNotesHtml(e, "notes-line clamp-1") || X.descHtml(e, "desc clamp-1")) +
            '<div class="fr-l3">' + X.authorHtml(e) + '<span class="sep">·</span>' + X.catIcon(e.category) + "<span>" + esc(X.catLabel(e.category)) + '</span><span class="sep">·</span>' + X.trustIconsHtml(e) + "</div>" +
            "</div>" +
            '<div class="fr-nums"><span class="fr-n"><b>' + X.fmtNum(e.installs) + "</b><span>" + esc(T("stat.installs.short")) + "</span></span>" +
            '<span class="fr-n"><b>' + X.fmtNum(e.activeUsers7d) + "</b><span>" + esc(T("stat.week.short")) + "</span>" + X.barHtml(e, "activeUsers7d", e.partner ? "partner" : "") + "</span></div>" +
            '<div class="fr-when" title="' + esc(T("stat.updated") + " " + X.fmtDate(e.updatedAtMs)) + '">' + svg("i-refresh") + esc(X.fmtRel(e.updatedAtMs)) + "</div>" +
            '<div class="fr-act">' + X.actionsHtml(e, { compact: true }) + "</div>" +
            "</div>"
        );
    }
    function listView(c, S) {
        var title = S.section.indexOf("cat:") === 0 ? X.catLabel(S.section.slice(4)) : T("sec." + (S.section === "home" ? "all" : S.section));
        return (
            '<div class="f-listhead"><h2>' + esc(title) + '</h2><span class="dim">' + esc(X.countWidgets(c.rows.length)) + "</span></div>" +
            (c.rows.length ? '<div class="fr-list">' + c.page.rows.map(feedRow).join("") + "</div>" + X.pagerHtml(c.page.shown, c.page.total) : X.emptyHtml())
        );
    }

    /* «Партнёры»: the magazine spread */
    function spread(e, i) {
        return (
            '<article class="mag' + (i % 2 ? " flip" : "") + '" style="--tint:' + X.tintOf(e) + '">' +
            X.posterHtml(e, { icon: 96, name: false, coverNote: true, cls: "mag-poster" }) +
            '<div class="mag-body">' +
            '<div class="mag-kicker">' + X.partnerBadge(true) + '<span class="dim">' + X.catIcon(e.category) + esc(X.catLabel(e.category)) + "</span>" + X.badgesHtml(e, { noPartner: true }) + "</div>" +
            '<h3 class="mag-name">' + esc(e.name) + ' <span class="ver">v' + esc(e.version) + "</span></h3>" +
            '<div class="mag-by">' + X.authorHtml(e, { channels: false }) + X.channelsHtml(e, true) + "</div>" +
            X.descHtml(e, "desc mag-desc") +
            '<div class="mag-nums">' +
            '<div><b>' + X.fmtNum(e.installs) + "</b><span>" + esc(T("stat.installs")) + "</span></div>" +
            '<div><b>' + X.fmtNum(e.activeInstalls) + "</b><span>" + esc(T("stat.active")) + "</span></div>" +
            '<div><b>' + X.fmtNum(e.activeUsers7d) + "</b><span>" + esc(T("stat.week")) + "</span></div>" +
            "</div>" +
            '<div class="mag-trust">' + X.trustIconsHtml(e, { labels: true }) + '<span class="chips">' + X.tagChipsHtml(e, 3) + "</span></div>" +
            '<div class="mag-foot">' + X.actionsHtml(e, { size: "lg" }) + '<button type="button" class="btn btn-link btn-sm" data-act="page" data-id="' + esc(e.id) + '">' + esc(T("act.page")) + " →</button></div>" +
            "</div></article>"
        );
    }
    function partnersView(c) {
        var rows = X.sortRows(c.rows, { key: "installs", dir: -1 });
        return (
            '<div class="partners-lead"><span class="pl-icon">' + svg("x-handshake") + "</span><div><h2>" + esc(T("partners.title")) + "</h2><p>" + esc(T("partners.lead")) + "</p></div></div>" +
            (X.anyFilter() ? "" : X.announcementHtml({ cls: "f-ann-wide" })) +
            (rows.length ? rows.map(spread).join("") : X.emptyHtml())
        );
    }

    X.register({
        id: "feed",
        defaultSection: "home",
        render: function (c, S) {
            var body = c.view === "home" ? home() : c.view === "partners" ? partnersView(c) : listView(c, S);
            return (
                X.railHtml({ home: true }) +
                '<div class="v5-main">' +
                '<div class="v5-top">' + X.searchHtml("v5-search") + X.authorChipHtml() + X.tagMenuHtml() + X.sortMenuHtml() + "</div>" +
                '<div class="v5-scroll scroll" data-scroll="main">' + body + "</div>" +
                "</div>"
            );
        }
    });
})();
