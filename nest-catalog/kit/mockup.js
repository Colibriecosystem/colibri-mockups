/* Mockup runtime. Loaded BLOCKING in <head> (after i18n.js and icons.js) so the theme and the
   language land on <html> before the first paint — the same job Phase 2's external theme-boot.js
   does under a CSP that forbids inline scripts. Everything that needs the DOM waits for
   DOMContentLoaded. Nothing here fetches anything; a page must work from file:// with the
   network unplugged. */
(function () {
    "use strict";

    var LANG_KEY = "nest.lang";
    var THEME_KEY = "nest.theme";
    var LANGS = ["ru", "en"];
    var THEMES = ["dark", "light", "system"];
    var html = document.documentElement;
    var params = new URLSearchParams(location.search);

    function store(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            /* private mode / file:// quirks — the toggle still works for this page */
        }
    }
    function load(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    /* ---------- language: ?lang= wins for THIS load and is not persisted; the toggle persists ---------- */
    var queryLang = params.get("lang");
    var lang = LANGS.indexOf(queryLang) >= 0 ? queryLang : load(LANG_KEY);
    if (LANGS.indexOf(lang) < 0) lang = "ru";
    html.lang = lang;

    /* ---------- theme: preference (dark|light|system) → resolved (dark|light) ---------- */
    var media = window.matchMedia("(prefers-color-scheme: light)");
    var themePref = load(THEME_KEY);
    if (THEMES.indexOf(themePref) < 0) themePref = "dark";
    function applyTheme() {
        var resolved = themePref === "system" ? (media.matches ? "light" : "dark") : themePref;
        html.setAttribute("data-theme", resolved);
        html.setAttribute("data-theme-pref", themePref);
    }
    applyTheme();
    media.addEventListener("change", function () {
        if (themePref === "system") applyTheme();
    });

    /* ---------- i18n ---------- */
    var dict = window.NEST_I18N || { ru: {}, en: {} };
    var plurals = {};
    function pluralRules(l) {
        if (!plurals[l]) plurals[l] = new Intl.PluralRules(l);
        return plurals[l];
    }
    function interpolate(template, vars) {
        if (!vars) return template;
        return template.replace(/\{(\w+)\}/g, function (m, k) {
            return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m;
        });
    }
    function t(key, vars) {
        var table = dict[lang] || {};
        var v = table[key];
        if (v === undefined) {
            v = (dict.ru || {})[key];
            if (v === undefined) return "⟦" + key + "⟧"; /* visibly broken, on purpose */
        }
        if (typeof v === "object" && vars && typeof vars.n === "number") {
            var form = pluralRules(lang).select(vars.n);
            v = v[form] || v.other || v.many || v.one || "";
        }
        return interpolate(String(v), vars);
    }
    function pick(ru, en) {
        var want = lang === "ru" ? ru : en;
        var other = lang === "ru" ? en : ru;
        if (want) return { text: want, fallback: null };
        if (other) return { text: other, fallback: lang === "ru" ? "en" : "ru" };
        return { text: "", fallback: null };
    }
    var dtf = null;
    var dtfDate = null;
    function fmtDateTime(ms) {
        if (!dtf) dtf = new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" });
        return dtf.format(new Date(ms));
    }
    function fmtDate(ms) {
        if (!dtfDate) dtfDate = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });
        return dtfDate.format(new Date(ms));
    }
    function fmtBytes(n) {
        var units = [t("unit.b"), t("unit.kb"), t("unit.mb")];
        var i = 0;
        var v = n;
        while (v >= 1024 && i < units.length - 1) {
            v /= 1024;
            i++;
        }
        var nf = new Intl.NumberFormat(lang, { maximumFractionDigits: i === 0 ? 0 : 1 });
        return nf.format(v) + " " + units[i];
    }

    function applyI18n(root) {
        root = root || document;
        root.querySelectorAll("[data-i18n]").forEach(function (el) {
            var vars = el.hasAttribute("data-vars") ? JSON.parse(el.getAttribute("data-vars")) : null;
            el.textContent = t(el.getAttribute("data-i18n"), vars);
        });
        root.querySelectorAll("[data-i18n-html]").forEach(function (el) {
            el.innerHTML = t(el.getAttribute("data-i18n-html"));
        });
        root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
            var vars = el.hasAttribute("data-vars") ? JSON.parse(el.getAttribute("data-vars")) : null;
            el.getAttribute("data-i18n-attr")
                .split(",")
                .forEach(function (pair) {
                    var parts = pair.split(":");
                    if (parts.length === 2) el.setAttribute(parts[0].trim(), t(parts[1].trim(), vars));
                });
        });
        root.querySelectorAll("[data-ru],[data-en]").forEach(function (el) {
            var p = pick(el.getAttribute("data-ru"), el.getAttribute("data-en"));
            el.textContent = p.text;
            if (p.fallback) el.setAttribute("data-fallback", p.fallback);
            else el.removeAttribute("data-fallback");
        });
        root.querySelectorAll("time[data-ts]").forEach(function (el) {
            var ms = Number(el.getAttribute("data-ts"));
            var fmt = el.getAttribute("data-fmt") || "datetime";
            el.dateTime = new Date(ms).toISOString();
            el.textContent = fmt === "date" ? fmtDate(ms) : fmtDateTime(ms);
        });
        root.querySelectorAll("[data-bytes]").forEach(function (el) {
            el.textContent = fmtBytes(Number(el.getAttribute("data-bytes")));
        });
        document.querySelectorAll("[data-set-lang]").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
        });
        var titleKey = html.getAttribute("data-title-key");
        if (titleKey) document.title = t(titleKey) + " · Nest";
    }

    function setLang(next) {
        if (LANGS.indexOf(next) < 0 || next === lang) return;
        lang = next;
        dtf = null;
        dtfDate = null;
        html.lang = lang;
        store(LANG_KEY, lang);
        /* a copied link should carry the language the reader is looking at */
        var url = new URL(location.href);
        url.searchParams.set("lang", lang);
        history.replaceState(null, "", url);
        applyI18n();
    }
    function setTheme(next) {
        if (THEMES.indexOf(next) < 0) return;
        themePref = next;
        store(THEME_KEY, next);
        applyTheme();
        syncThemeButtons();
    }
    function syncThemeButtons() {
        document.querySelectorAll("[data-set-theme]").forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute("data-set-theme") === themePref));
        });
    }

    /* ---------- toasts ---------- */
    var region = null;
    function toast(text) {
        if (!region) {
            region = document.createElement("div");
            region.className = "toast-region";
            region.setAttribute("role", "status");
            region.setAttribute("aria-live", "polite");
            document.body.appendChild(region);
        }
        while (region.children.length >= 3) region.removeChild(region.firstChild);
        var el = document.createElement("div");
        el.className = "toast";
        el.innerHTML = '<svg class="icon"><use href="#i-check"/></svg><span></span>';
        el.lastChild.textContent = text;
        region.appendChild(el);
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 4000);
    }

    /* ---------- mock bar: [data-state-group] holds [data-state] sections; one is shown ---------- */
    function showState(group, name) {
        group.querySelectorAll(":scope > [data-state]").forEach(function (s) {
            s.hidden = s.getAttribute("data-state") !== name;
        });
        document.querySelectorAll('[data-show-state][data-group="' + (group.id || "") + '"]').forEach(function (b) {
            b.setAttribute("aria-pressed", String(b.getAttribute("data-show-state") === name));
        });
    }

    /* ---------- DOM wiring ---------- */
    document.addEventListener("DOMContentLoaded", function () {
        var body = document.body;
        var holder = document.createElement("div");
        holder.innerHTML = window.NEST_ICONS || "";
        body.insertBefore(holder.firstChild, body.firstChild);

        applyI18n();
        syncThemeButtons();

        if (params.get("bare") === "1") {
            document.querySelectorAll(".mock-bar").forEach(function (b) {
                b.hidden = true;
            });
        }
        document.querySelectorAll("[data-state-group]").forEach(function (g) {
            var first = g.querySelector(":scope > [data-state]");
            var wanted = params.get("state");
            var target = wanted && g.querySelector(':scope > [data-state="' + wanted + '"]') ? wanted : first && first.getAttribute("data-state");
            if (target) showState(g, target);
        });

        body.addEventListener("click", function (e) {
            var el = e.target.closest("[data-set-role],[data-set-lang],[data-set-theme],[data-show-state],[data-open-dialog],[data-close-dialog],[data-copy],[data-toast],[data-expand],[data-toggle-pressed]");
            if (!el) return;
            if (el.hasAttribute("data-set-role")) {
                /* the widget page renders for one principal; [data-only-role] sections show for that role only */
                html.setAttribute("data-role", el.getAttribute("data-set-role"));
                document.querySelectorAll("[data-set-role]").forEach(function (b) {
                    b.setAttribute("aria-pressed", String(b === el));
                });
                return;
            }
            if (el.hasAttribute("data-set-lang")) return setLang(el.getAttribute("data-set-lang"));
            if (el.hasAttribute("data-set-theme")) return setTheme(el.getAttribute("data-set-theme"));
            if (el.hasAttribute("data-show-state")) {
                var g = document.getElementById(el.getAttribute("data-group"));
                if (g) showState(g, el.getAttribute("data-show-state"));
                return;
            }
            if (el.hasAttribute("data-open-dialog")) {
                var d = document.getElementById(el.getAttribute("data-open-dialog"));
                if (d && typeof d.showModal === "function") d.showModal();
                return;
            }
            if (el.hasAttribute("data-close-dialog")) {
                var dd = el.closest("dialog");
                if (dd) dd.close();
                return;
            }
            if (el.hasAttribute("data-copy")) {
                var src = document.getElementById(el.getAttribute("data-copy"));
                var text = src ? src.textContent.trim() : el.getAttribute("data-copy");
                if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
                toast(t("action.copied"));
                return;
            }
            if (el.hasAttribute("data-toast")) return toast(t(el.getAttribute("data-toast")));
            if (el.hasAttribute("data-expand")) {
                var row = document.getElementById(el.getAttribute("data-expand"));
                var open = el.getAttribute("aria-expanded") === "true";
                el.setAttribute("aria-expanded", String(!open));
                if (row) row.hidden = open;
                return;
            }
            if (el.hasAttribute("data-toggle-pressed")) {
                el.setAttribute("aria-pressed", String(el.getAttribute("aria-pressed") !== "true"));
            }
        });

        /* an open overflow menu closes on any click outside it, and after choosing an item */
        document.addEventListener("click", function (e) {
            document.querySelectorAll("details.menu[open]").forEach(function (d) {
                if (!d.contains(e.target) || e.target.closest(".menu-list button, .menu-list a")) d.removeAttribute("open");
            });
        });

        /* a form inside a <dialog> never navigates in a mockup */
        body.addEventListener("submit", function (e) {
            if (e.target.closest("dialog") || e.target.hasAttribute("data-mock-submit")) {
                e.preventDefault();
                var dlg = e.target.closest("dialog");
                if (dlg) dlg.close();
                var key = e.target.getAttribute("data-toast-on-submit");
                if (key) toast(t(key));
            }
        });
    });

    window.NEST = { t: t, pick: pick, toast: toast, setLang: setLang, setTheme: setTheme, applyI18n: applyI18n };
})();
