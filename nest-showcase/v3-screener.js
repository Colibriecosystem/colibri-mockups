/* Variant 3 — SCREENER. The catalog read like a coin screener: one table, sorted by clicking a
   header, numbers in columns with an activity bar, trust facts as three icons, a row that expands in
   place to everything the card knows. Partners are PINNED on top as their own group (a toggle in the
   filter row); «Партнёры» turns into a side-by-side comparison of the partners. */
(function () {
    "use strict";
    var X = window.SHOW;
    var T = X.T, esc = X.esc, svg = X.svg;

    function th(key, label, cls, S) {
        if (!key) return '<th scope="col" class="' + (cls || "") + '">' + esc(label) + "</th>";
        var on = S.sort.key === key;
        return (
            '<th scope="col" class="' + (cls || "") + (on ? " sorted" : "") + '"><button type="button" data-sort="' + key + '"' + (on ? ' title="' + esc(T("sort.again")) + '"' : "") + ">" +
            esc(label) + '<span class="arr">' + (on ? (S.sort.dir > 0 ? "↑" : "↓") : "↕") + "</span></button></th>"
        );
    }

    /* the columns that fit the window: a table hides a column by not drawing it, so a group row's
       colspan always matches what is on screen */
    function columns(c) {
        var out = ["rank", "widget"];
        if (c.wide) out.push("desc");
        out.push("inst");
        if (!c.narrow) out.push("active");
        out.push("week", "upd");
        if (c.wide) out.push("added");
        if (!c.narrow) out.push("trust");
        out.push("act");
        return out;
    }

    function cell(k, e, i, pinned) {
        var p = e.partner;
        var keep = X.keepShare(e);
        switch (k) {
            case "rank": return '<td class="c-rank">' + (p ? svg("x-handshake") : i) + "</td>";
            case "widget":
                return (
                    '<td class="c-widget"><div class="w">' + X.iconHtml(e, p ? 34 : 28) +
                    '<div class="w-id"><div class="w-name"><span class="nm">' + esc(e.name) + '</span><span class="ver">v' + esc(e.version) + '</span><span class="badges">' + X.badgesHtml(e, { noPartner: pinned }) + "</span></div>" +
                    '<div class="w-sub">' + X.authorHtml(e) + '<span class="w-cat">· ' + esc(X.catLabel(e.category)) + "</span></div>" +
                    (p ? X.descHtml(e, "desc clamp-1 w-desc") : "") +
                    "</div></div></td>"
                );
            case "desc": return '<td class="c-desc">' + (p ? "" : X.descHtml(e, "desc clamp-2")) + "</td>";
            case "inst": return '<td class="num c-inst">' + X.fmtNum(e.installs) + "</td>";
            case "active": return '<td class="num c-active">' + X.fmtNum(e.activeInstalls) + (keep !== null ? '<span class="keep" title="' + esc(T("stat.keep.title")) + '">' + keep + "%</span>" : "") + "</td>";
            case "week": return '<td class="num c-week"><span class="wk">' + X.fmtNum(e.activeUsers7d) + "</span>" + X.barHtml(e, "activeUsers7d", p ? "partner" : "") + "</td>";
            case "upd": return '<td class="c-upd" title="' + esc(X.fmtDate(e.updatedAtMs)) + '">' + esc(X.fmtRelShort(e.updatedAtMs)) + "</td>";
            case "added": return '<td class="c-added">' + esc(X.fmtDate(e.firstListedAtMs)) + "</td>";
            case "trust": return '<td class="c-trust">' + X.trustIconsHtml(e) + "</td>";
            case "act": return '<td class="c-act">' + X.actionsHtml(e, { compact: true }) + "</td>";
        }
        return "";
    }

    function row(e, i, S, cols, pinned) {
        var open = !!S.expanded[e.id];
        return (
            '<tr class="r' + (e.partner ? " r-partner" : "") + (open ? " r-open" : "") + '" data-row-toggle="' + esc(e.id) + '">' +
            cols.map(function (k) { return cell(k, e, i, pinned); }).join("") +
            "</tr>" +
            (open ? expandRow(e, cols.length) : "")
        );
    }

    function expandRow(e, span) {
        var notes = X.notesOf(e);
        var keep = X.keepShare(e);
        return (
            '<tr class="x-row' + (e.partner ? " r-partner" : "") + '"><td colspan="' + span + '"><div class="x-grid">' +
            '<div class="x-col">' + X.descHtml(e, "desc x-desc") +
            (notes ? '<p class="notes-line"><b>' + esc(T("insp.notes", { v: e.version })) + ":</b> " + esc(notes.text) + "</p>" : "") +
            '<div class="x-links">' + X.channelsHtml(e, true) + '<button type="button" class="btn btn-link btn-sm" data-act="page" data-id="' + esc(e.id) + '">' + esc(T("act.page")) + " →</button></div></div>" +
            '<div class="x-col">' + X.chipGroupsHtml(e, { longScopes: true }) + '<div class="cg-row"><span class="cg-label">' + esc(T("insp.network")) + "</span>" + X.hostsHtml(e, 10) + "</div></div>" +
            '<dl class="x-facts">' +
            "<dt>" + esc(T("stat.version")) + '</dt><dd class="mono">' + esc(e.version) + "</dd>" +
            "<dt>" + esc(T("stat.size")) + "</dt><dd>" + esc(X.fmtBytes(e.sizeBytes)) + "</dd>" +
            "<dt>" + esc(T("stat.hash")) + '</dt><dd class="mono" title="' + esc(e.hash) + '">' + esc((e.hash || "").slice(0, 8)) + "…</dd>" +
            "<dt>" + esc(T("stat.listed")) + "</dt><dd>" + esc(X.fmtDate(e.firstListedAtMs)) + "</dd>" +
            "<dt>" + esc(T("stat.updated")) + "</dt><dd>" + esc(X.fmtDate(e.updatedAtMs)) + "</dd>" +
            "<dt>" + esc(T("stat.surfaces")) + "</dt><dd>" + (e.surfaces || []).map(function (s) { return esc(T("surface." + s)); }).join(" · ") + "</dd>" +
            (keep !== null ? "<dt>" + esc(T("stat.keep")) + '</dt><dd title="' + esc(T("stat.keep.title")) + '">' + keep + "%</dd>" : "") +
            "</dl></div></td></tr>"
        );
    }

    function table(c, S) {
        var rows = c.page.rows;
        var cols = columns(c);
        var pin = S.pinPartners && S.section !== "partners";
        var heads = {
            rank: '<th scope="col" class="c-rank">#</th>',
            widget: th("name", T("col.widget"), "c-widget", S),
            desc: th(null, T("col.desc"), "c-desc", S),
            inst: th("installs", T("col.installs"), "num c-inst", S),
            active: th(null, T("col.active"), "num c-active", S),
            week: th("active", T("col.week"), "num c-week", S),
            upd: th("updated", T("col.updated"), "c-upd", S),
            added: th("newest", T("col.added"), "c-added", S),
            trust: th(null, T("col.trust"), "c-trust", S),
            act: '<th scope="col" class="c-act"></th>'
        };
        var head = '<table class="scr"><thead><tr>' + cols.map(function (k) { return heads[k]; }).join("") + "</tr></thead><tbody>";
        var span = cols.length;
        var body = "";
        if (pin) {
            var ps = rows.filter(function (e) { return e.partner; });
            var rest = rows.filter(function (e) { return !e.partner; });
            if (ps.length) body += '<tr class="grp grp-partner"><td colspan="' + span + '">' + svg("x-handshake") + esc(T("partners.pinned")) + '<span class="dim">' + ps.length + "</span></td></tr>" + ps.map(function (e, i) { return row(e, i + 1, S, cols, true); }).join("");
            if (rest.length && ps.length) body += '<tr class="grp"><td colspan="' + span + '">' + esc(T("partners.rest")) + '<span class="dim">' + rest.length + "</span></td></tr>";
            body += rest.map(function (e, i) { return row(e, i + 1, S, cols, false); }).join("");
        } else body = rows.map(function (e, i) { return row(e, i + 1, S, cols, false); }).join("");
        return head + body + "</tbody></table>";
    }

    /* «Партнёры»: the comparison — one column per partner, the same facts on the same line */
    function compare(c) {
        var rows = X.sortRows(c.rows, { key: "installs", dir: -1 });
        if (!rows.length) return X.emptyHtml();
        var best = function (f) { var m = -1; rows.forEach(function (e) { if ((e[f] || 0) > m) m = e[f] || 0; }); return m; };
        var lead = { installs: best("installs"), activeInstalls: best("activeInstalls"), activeUsers7d: best("activeUsers7d") };
        var numCell = function (e, f) {
            var v = e[f];
            if (typeof v !== "number") return "<td></td>";
            return '<td><div class="cmp-num"><b>' + X.fmtNum(v) + "</b>" + (v === lead[f] && rows.length > 1 ? '<span class="lead-mark" title="max">▲</span>' : "") + "</div>" + X.barHtml(e, f, "partner") + "</td>";
        };
        var line = function (label, cells) {
            return '<tr><th scope="row">' + esc(label) + "</th>" + rows.map(cells).join("") + "</tr>";
        };
        var pk = function (e) { var f = X.packageFact(e); return '<td><span class="chip chip-' + f.cls + '" title="' + esc(f.tip) + '">' + esc(f.chip) + "</span></td>"; };
        return (
            '<div class="cmp-scroll"><table class="cmp" style="--n:' + rows.length + '"><thead><tr><th class="cmp-corner"><span>' + esc(T("partners.compare")) + "</span></th>" +
            rows.map(function (e) {
                return '<th class="cmp-head" style="--tint:' + X.tintOf(e) + '">' + X.posterHtml(e, { icon: 52, name: true, cls: "cmp-poster" }) + "</th>";
            }).join("") +
            "</tr></thead><tbody>" +
            line(T("col.author"), function (e) { return '<td><div class="cmp-by">' + X.authorHtml(e, { channels: false }) + X.channelsHtml(e) + "</div></td>"; }) +
            line(T("insp.about"), function (e) { return "<td>" + X.descHtml(e, "desc clamp-4") + "</td>"; }) +
            line(T("col.category"), function (e) { return '<td><span class="cmp-cat">' + X.catIcon(e.category) + esc(X.catLabel(e.category)) + "</span></td>"; }) +
            line(T("stat.installs"), function (e) { return numCell(e, "installs"); }) +
            line(T("stat.active"), function (e) { return numCell(e, "activeInstalls"); }) +
            line(T("stat.week"), function (e) { return numCell(e, "activeUsers7d"); }) +
            line(T("stat.updated"), function (e) { return '<td><span class="mono">v' + esc(e.version) + "</span> · " + esc(X.fmtRel(e.updatedAtMs)) + '<div class="badges">' + X.badgesHtml(e, { noPartner: true }) + "</div></td>"; }) +
            line(T("stat.listed"), function (e) { return "<td>" + esc(X.fmtDate(e.firstListedAtMs)) + "</td>"; }) +
            line(T("grp.package"), pk) +
            line(T("grp.scopes"), function (e) { return '<td><div class="chips">' + ((e.permissions || []).length ? e.permissions.map(function (s) { return '<span class="chip" title="' + esc(T("scope." + s)) + '">' + esc(T("scopeShort." + s)) + "</span>"; }).join("") : '<span class="dim">' + esc(T("chip.none")) + "</span>") + "</div></td>"; }) +
            line(T("grp.network"), function (e) { var g = e.egress || []; return "<td>" + (g.length ? '<span class="chip" title="' + esc(g.join("\n")) + '">' + esc(T("chip.network", { n: g.length })) + "</span>" : '<span class="chip chip-ok">' + esc(T("chip.noNetwork")) + "</span>") + "</td>"; }) +
            line(T("grp.tags"), function (e) { return '<td><div class="chips">' + X.tagChipsHtml(e, 3) + "</div></td>"; }) +
            '<tr class="cmp-acts"><th scope="row"></th>' + rows.map(function (e) { return "<td>" + X.actionsHtml(e, { size: "md" }) + "</td>"; }).join("") + "</tr>" +
            "</tbody></table></div>"
        );
    }

    function summary(c) {
        var rows = c.rows;
        var sum = function (f) { return rows.reduce(function (s, e) { return s + (e[f] || 0); }, 0); };
        return (
            '<div class="v3-summary">' +
            "<span><b>" + rows.length + "</b> " + esc(T("summary.widgets")) + "</span>" +
            "<span><b>" + X.fmtNum(sum("installs")) + "</b> " + esc(T("summary.installs")) + "</span>" +
            "<span><b>" + X.fmtNum(sum("activeUsers7d")) + "</b> " + esc(T("summary.week")) + "</span>" +
            '<span class="s-partner"><b>' + rows.filter(function (e) { return e.partner; }).length + "</b> " + esc(T("summary.partners")) + "</span>" +
            '<span class="s-new"><b>' + rows.filter(X.isNew).length + "</b> " + esc(T("summary.new")) + "</span>" +
            "</div>"
        );
    }

    function segmented(S, counts) {
        var b = function (sec, label, n, cls, icon) {
            var on = S.section === sec || (sec === "all" && S.section.indexOf("cat:") === 0);
            return '<button type="button" class="' + (cls || "") + '" data-sec="' + sec + '" aria-pressed="' + on + '">' + (icon ? svg(icon) : "") + esc(label) + '<span class="pc">' + n + "</span></button>";
        };
        return (
            '<div class="v3-seg">' +
            b("all", T("sec.all"), counts.all) +
            b("new", T("sec.new"), counts.new, "seg-new", "x-sparkles") +
            b("partners", T("sec.partners"), counts.partners, "seg-partner", "x-handshake") +
            "</div>"
        );
    }

    X.register({
        id: "screener",
        defaultSection: "all",
        render: function (c, S) {
            var isPartners = c.view === "partners";
            return (
                '<div class="v3-top">' +
                '<div class="v3-row">' + segmented(S, c.counts) + X.categoryMenuHtml() + X.searchHtml("v3-search") + X.authorChipHtml() + X.tagMenuHtml(true) +
                (isPartners ? "" : '<button type="button" class="btn btn-sm v3-pin' + (S.pinPartners ? " is-on" : "") + '" data-pin aria-pressed="' + S.pinPartners + '">' + svg("x-handshake") + "<span>" + esc(T("pin.label")) + "</span></button>") +
                "</div>" +
                (isPartners ? "" : summary(c)) +
                "</div>" +
                '<div class="v3-scroll scroll" data-scroll="main">' +
                (isPartners
                    ? (X.anyFilter() ? "" : X.announcementHtml({ cls: "v3-ann" })) + compare(c)
                    : c.rows.length ? table(c, S) + X.pagerHtml(c.page.shown, c.page.total) : X.emptyHtml()) +
                "</div>"
            );
        }
    });
})();
