/* Catalog-mock strings, both languages complete.

   Loaded BETWEEN kit/i18n.js and kit/mockup.js: i18n.js creates window.NEST_I18N, mockup.js captures
   it into a local `dict` at parse time, so these keys are MERGED into the existing tables and the
   object is never reassigned.

   Every line names the terminal resource key it maps to, so the build can
   lift the wording straight out of here:
     /* = Strings.Nest.X (exists) */
//        the desktop already ships this string — the value below is copied VERBATIM from
//        the shipped terminal resources, so the mock cannot
//        invent desktop wording.
//     /* Strings.Nest.X — NEW */
//        a key the build has to add, ru + en drafted here.
//     /* mock only, no XAML key */
//        mock-bar chrome that never ships.
//
//   Wire data (widget names, authors, descriptions, tags, hosts, hashes) is NOT in here — it renders
//   verbatim from catalog-data.js, per the kit's rule.

(function () {
    "use strict";
    /* The mock OWNS the dictionary. The kit ships an i18n.js of its own, but these pages use nine
       strings from it and the rest of that file is the moderation console's vocabulary, which has no
       business on a public page. So the nine are declared here and the kit's file is not vendored. */
    var d = window.NEST_I18N || (window.NEST_I18N = { ru: {}, en: {} });

    Object.assign(d.ru, {
        /* ---- the nine strings kit/mockup.js and the shared chrome need ---- */
        "lang.label": "Язык",
        "theme.label": "Тема",
        "theme.dark": "Тёмная",
        "theme.light": "Светлая",
        "theme.system": "Как в системе",
        "action.copied": "Скопировано",
        "unit.b": "Б",
        "unit.kb": "КБ",
        "unit.mb": "МБ",

        /* ---- window chrome ---- */
        "cat.title": "Nest" /* = Strings.Nest.Title (exists) */,
        "cat.tab.catalog": "Каталог" /* = Strings.Nest.Tab.Catalog (exists) */,
        "cat.tab.myWidgets": "Мои виджеты" /* = Strings.Nest.Tab.MyWidgets (exists) */,
        "cat.tab.author": "Автор" /* = Strings.Nest.Tab.Author (exists) */,
        "cat.tab.settings": "Настройки" /* = Strings.Nest.Tab.Settings (exists) */,
        "cat.verified": "✓ Colibri" /* = Strings.Nest.Verified (exists) */,

        /* ---- toolbar ---- */
        "cat.search": "Поиск виджетов…" /* = Strings.Nest.Search.Watermark (exists) */,
        "cat.tagSearch": "Фильтр тегов…" /* = Strings.Nest.TagSearch.Watermark (exists) */,
        "cat.tags": "Теги" /* mock only, no XAML key — the desktop button is the ☰ ▾ glyph pair */,
        "cat.all": "Все" /* = Strings.Nest.Cat.All (exists) */,

        /* ---- left rail: curated categories ---- */
        "cat.category.alerts": "Алерты" /* = Strings.Nest.Category.alerts (exists) */,
        "cat.category.analytics": "Аналитика" /* = Strings.Nest.Category.analytics (exists) */,
        "cat.category.market-data": "Рыночные данные" /* = Strings.Nest.Category.market-data (exists) */,
        "cat.category.research": "Исследования" /* = Strings.Nest.Category.research (exists) */,
        "cat.category.trading": "Торговля" /* = Strings.Nest.Category.trading (exists) */,
        "cat.category.portfolio": "Портфель" /* = Strings.Nest.Category.portfolio (exists) */,
        "cat.category.productivity": "Продуктивность" /* = Strings.Nest.Category.productivity (exists) */,
        "cat.category.other": "Прочее" /* = Strings.Nest.Category.other (exists) */,

        /* ---- the trust strip, pinned to the rail's bottom ---- */
        "cat.trust.network": "🔌 Сеть — по декларации. Разрешённые домены объявлены заранее и контролируются терминалом." /* = Strings.Nest.Trust.Network (exists) */,
        "cat.trust.trading": "⚡ Торговля — только по гранту. На конкретный аккаунт, с лимитами; отзывается в один клик." /* = Strings.Nest.Trust.Trading (exists) */,
        "cat.trust.transparency": "🏷 Прозрачность вместо запретов. Режим, домены и права — на каждой карточке." /* = Strings.Nest.Trust.Transparency (exists) */,

        /* ---- the state-flipping primary + the ⋯ menu ---- */
        "cat.install": "Установить" /* = Strings.Nest.Install (exists) */,
        "cat.update": "↑ Обновить" /* = Strings.Nest.Update (exists) */,
        "cat.openWindow": "Открыть в окне" /* = Strings.Widget.Menu.OpenAsWindow (exists) */,
        "cat.installed": "Установлен" /* = Strings.Nest.Installed (exists) */,
        "cat.slotOnly": "· только в панели" /* = Strings.Nest.SlotOnly (exists) */,
        "cat.menu.more": "Ещё" /* mock only, no XAML key — aria-label for the ⋯ button */,
        "cat.menu.notifications": "Уведомления" /* = Strings.Nest.Row.Notifications (exists) */,
        "cat.menu.pinBookmark": "Закрепить снизу" /* = Strings.Nest.Row.PinBookmark (exists) */,
        "cat.menu.proxy": "Прокси" /* = Strings.Nest.Row.Proxy (exists) */,
        "cat.menu.revoke": "Отозвать права" /* = Strings.Nest.Row.RevokeGrants (exists) */,
        "cat.menu.uninstall": "Удалить" /* = Strings.Nest.Row.Uninstall (exists) */,

        /* ---- chips (NestChipBuilder order; the desktop keeps these two English on purpose) ---- */
        "cat.chip.bundled": "bundled · hash ✓" /* = Strings.Nest.Chip.Bundled (exists) */,
        "cat.chip.hosted": "hosted" /* = Strings.Nest.Chip.Hosted (exists) */,
        "cat.chip.noNetwork": "без сети" /* = Strings.Nest.Chip.NoNetwork (exists) */,
        "cat.chip.network": "сеть · {n}" /* = Strings.Nest.Chip.NetworkFormat (exists) */,
        "cat.chip.url": "url" /* = Strings.Nest.Chip.Url (exists) */,
        "cat.chip.embeds": "embeds {host}" /* = Strings.Nest.Chip.EmbedsFormat (exists) */,
        "cat.chip.embedsCount": "embeds · {n}" /* = Strings.Nest.Chip.EmbedsCountFormat (exists) */,
        "cat.chip.more": "+{n}" /* = the desktop's trailing "…" overflow marker; a count reads better on a wide row */,

        /* ---- permission scopes: the consent-dialog vocabulary, verbatim ---- */
        "cat.scope.marketData": "Рыночные данные из открытых панелей" /* = Strings.Widget.Scope.MarketData (exists) */,
        "cat.scope.account:read": "Чтение позиций, ордеров и балансов" /* = Strings.Widget.Scope.AccountRead (exists) */,
        "cat.scope.trading": "Выставление и отмена ордеров" /* = Strings.Widget.Scope.Trading (exists) */,
        "cat.scope.panels": "Открытие и расстановка панелей" /* = Strings.Widget.Scope.Panels (exists) */,
        "cat.scope.notifications": "Отправка уведомлений" /* = Strings.Widget.Scope.Notifications (exists) */,
        "cat.scope.signalLevels": "Управление ценовыми алертами" /* = Strings.Widget.Scope.SignalLevels (exists) */,
        "cat.scope.storage": "Хранение своих настроек" /* = Strings.Widget.Scope.Storage (exists) */,

        /* ---- sort control ---- */
        "cat.sort.label": "Сортировка" /* Strings.Nest.Sort.Label — NEW */,
        "cat.sort.name": "По названию" /* Strings.Nest.Sort.Name — NEW */,
        "cat.sort.newest": "Сначала новые" /* Strings.Nest.Sort.Newest — NEW */,
        "cat.sort.updated": "Недавно обновлённые" /* Strings.Nest.Sort.Updated — NEW */,
        "cat.sort.installs": "По установкам" /* Strings.Nest.Sort.Installs — NEW */,
        "cat.sort.active": "По активности" /* Strings.Nest.Sort.Active — NEW */,

        /* ---- paging, page of 25 ---- */
        "cat.showMore": "Показать ещё" /* Strings.Nest.ShowMore — NEW */,
        "cat.shown": "Показано {shown} из {total}" /* Strings.Nest.ShownFormat — NEW */,

        /* ---- counts + dates: PLACEHOLDERS until планируется в реестре ---- */
        "cat.badge.new": "NEW" /* Strings.Nest.Badge.New — NEW (planned, 14-day window) */,
        "cat.badge.new.title": "В каталоге меньше 14 дней" /* Strings.Nest.Badge.New.Tooltip — NEW */,
        "cat.installs": "Установок" /* Strings.Nest.Installs — NEW (planned) */,
        "cat.active7d": "Активных за 7 дн" /* Strings.Nest.ActiveUsers7d — NEW (planned) */,
        "cat.active7d.short": "за 7 дн" /* Strings.Nest.ActiveUsers7d.Short — NEW */,
        "cat.firstListed": "В каталоге с" /* Strings.Nest.FirstListed — NEW (planned) */,
        "cat.updated": "Обновлён" /* Strings.Nest.Updated — NEW (planned) */,
        "cat.unknown": "—" /* Strings.Nest.Unknown — NEW; absent ⇒ nothing, never a zero */,
        "cat.unknown.aria": "нет данных" /* Strings.Nest.Unknown.Aria — NEW */,
        "cat.likes": "♥" /* Strings.Nest.Likes — NEW, DEFERRED; a marked slot only */,
        "cat.likes.title": "Место под ♥ — отдельная итерация рейтинга" /* mock only, no XAML key */,

        /* ---- package facts (the listing hero's cost column, reused on a wide row) ---- */
        "cat.facts.mode": "Режим" /* = Strings.Nest.Listing.Mode (exists) */,
        "cat.facts.origin": "Точка входа (origin)" /* = Strings.Nest.Listing.Origin (exists) */,
        "cat.facts.version": "Версия" /* = Strings.Nest.Listing.Version (exists) */,
        "cat.facts.size": "Размер" /* = Strings.Nest.Listing.Size (exists) */,
        "cat.facts.hash": "Хеш (закрепляется при установке)" /* = Strings.Nest.Listing.Hash (exists) */,
        "cat.facts.hashShort": "Хеш" /* Strings.Nest.Row.Hash — NEW; the row has no space for the hero's full label */,
        "cat.facts.surfaces": "Поверхности" /* = Strings.Nest.Listing.Surfaces (exists) */,
        "cat.facts.egress": "Сеть (egress)" /* = Strings.Nest.Listing.Egress (exists) */,
        "cat.facts.embeds": "Встроенные страницы" /* = Strings.Nest.Listing.Embeds (exists) */,
        "cat.facts.apiVersion": "Версия API" /* = Strings.Nest.Listing.ApiVersion (exists) */,
        "cat.facts.compat": "Совместимость" /* NEW */,
        "cat.facts.compatValue": "Colibri {v} и новее" /* NEW */,
        "cat.needsColibri": "Нужен Colibri {v} или новее" /* NEW */,
        "cat.needsColibri.hint": "Этой версии нужен Colibri {v} или новее. Обновите терминал, и виджет можно будет установить." /* NEW */,
        "cat.facts.permissions": "Разрешения" /* = Strings.Nest.Listing.Permissions (exists) */,
        "cat.facts.noEgress": "нет — работает без сети" /* = Strings.Nest.Listing.NoEgress (exists) */,
        "cat.facts.noPermissions": "нет" /* = Strings.Nest.Listing.NoPermissions (exists) */,
        "cat.facts.none": "нет" /* = Strings.Nest.Listing.NoPermissions (exists) */,
        "cat.surface.slot": "слот" /* = Strings.Nest.Surface.Slot (exists) */,
        "cat.surface.window": "окно" /* = Strings.Nest.Surface.Window (exists) */,
        "cat.author.youtube": "YouTube" /* = Strings.Nest.Author.Channel.Youtube (exists) */,
        "cat.author.telegram": "Telegram" /* = Strings.Nest.Author.Channel.Telegram (exists) */,

        /* ---- row groups + expander (variant 3) ---- */
        "cat.group.mode": "Пакет" /* Strings.Nest.Row.Group.Package — NEW */,
        "cat.group.scopes": "Права" /* Strings.Nest.Row.Group.Permissions — NEW */,
        "cat.group.network": "Сеть" /* Strings.Nest.Row.Group.Network — NEW */,
        "cat.group.tags": "Теги" /* Strings.Nest.Row.Group.Tags — NEW */,
        "cat.row.expand": "Подробнее" /* Strings.Nest.Row.Expand — NEW */,
        "cat.row.collapse": "Свернуть" /* Strings.Nest.Row.Collapse — NEW */,

        /* ---- table headers (variant 1 / 3) ---- */
        "cat.th.widget": "Виджет" /* Strings.Nest.Col.Widget — NEW */,
        "cat.th.author": "Автор" /* Strings.Nest.Col.Author — NEW */,
        "cat.th.usage": "Установки · активные" /* Strings.Nest.Col.Usage — NEW */,
        "cat.th.dates": "В каталоге · обновлён" /* Strings.Nest.Col.Dates — NEW */,
        "cat.th.package": "Пакет" /* Strings.Nest.Col.Package — NEW */,
        "cat.th.actions": "Действия" /* Strings.Nest.Col.Actions — NEW */,
        "cat.tableCaption": "Каталог виджетов Nest" /* Strings.Nest.Catalog.TableCaption — NEW */,

        /* ---- mock bar ---- */
        "cat.mock.label": "MOCKUP" /* mock only, no XAML key */,
        "cat.mock.width": "Ширина" /* mock only, no XAML key */,
        "cat.mock.rows": "Каталог" /* mock only, no XAML key */,
        "cat.mock.rows10": "10 виджетов (как сегодня)" /* mock only, no XAML key */,
        "cat.mock.rows28": "28 (пагинация)" /* mock only, no XAML key */,
        "cat.mock.likes": "♥ слот" /* mock only, no XAML key */,
        "cat.mock.expandAll": "развернуть всё" /* mock only, no XAML key */,
        "cat.mock.note": "Пунктиром подчёркнуто то, чего ещё нет на проводе: установки, активные за 7 дн, даты, NEW. Остальное — реальные данные каталога от 07.09.2026." /* mock only, no XAML key */,
        "cat.mock.copy": "(копия {n})" /* mock only, no XAML key */,
        "cat.mock.copyTitle": "Повтор реальной строки — только чтобы показать пагинацию" /* mock only, no XAML key */,
        "cat.mock.placeholder": "заглушка — этого поля ещё нет на проводе (планируется в реестре)" /* mock only, no XAML key */
    });

    Object.assign(d.en, {
        /* ---- the nine strings kit/mockup.js and the shared chrome need ---- */
        "lang.label": "Language",
        "theme.label": "Theme",
        "theme.dark": "Dark",
        "theme.light": "Light",
        "theme.system": "Follow system",
        "action.copied": "Copied",
        "unit.b": "B",
        "unit.kb": "KB",
        "unit.mb": "MB",

        /* ---- window chrome ---- */
        "cat.title": "Nest" /* = Strings.Nest.Title (exists) */,
        "cat.tab.catalog": "Catalog" /* = Strings.Nest.Tab.Catalog (exists) */,
        "cat.tab.myWidgets": "My widgets" /* = Strings.Nest.Tab.MyWidgets (exists) */,
        "cat.tab.author": "Author" /* = Strings.Nest.Tab.Author (exists) */,
        "cat.tab.settings": "Settings" /* = Strings.Nest.Tab.Settings (exists) */,
        "cat.verified": "✓ Colibri" /* = Strings.Nest.Verified (exists) */,

        /* ---- toolbar ---- */
        "cat.search": "Search widgets…" /* = Strings.Nest.Search.Watermark (exists) */,
        "cat.tagSearch": "Filter tags…" /* = Strings.Nest.TagSearch.Watermark (exists) */,
        "cat.tags": "Tags" /* mock only, no XAML key */,
        "cat.all": "All" /* = Strings.Nest.Cat.All (exists) */,

        /* ---- left rail ---- */
        "cat.category.alerts": "Alerts" /* = Strings.Nest.Category.alerts (exists) */,
        "cat.category.analytics": "Analytics" /* = Strings.Nest.Category.analytics (exists) */,
        "cat.category.market-data": "Market data" /* = Strings.Nest.Category.market-data (exists) */,
        "cat.category.research": "Research" /* = Strings.Nest.Category.research (exists) */,
        "cat.category.trading": "Trading" /* = Strings.Nest.Category.trading (exists) */,
        "cat.category.portfolio": "Portfolio" /* = Strings.Nest.Category.portfolio (exists) */,
        "cat.category.productivity": "Productivity" /* = Strings.Nest.Category.productivity (exists) */,
        "cat.category.other": "Other" /* = Strings.Nest.Category.other (exists) */,

        /* ---- trust strip ---- */
        "cat.trust.network": "🔌 Network by declaration. Allowed domains are declared up front and enforced by the terminal." /* = Strings.Nest.Trust.Network (exists) */,
        "cat.trust.trading": "⚡ Trading only by grant. Named accounts with limits; revocable in one click." /* = Strings.Nest.Trust.Trading (exists) */,
        "cat.trust.transparency": "🏷 Transparency instead of bans. Mode, domains and permissions are on every card." /* = Strings.Nest.Trust.Transparency (exists) */,

        /* ---- primary + ⋯ menu ---- */
        "cat.install": "Install" /* = Strings.Nest.Install (exists) */,
        "cat.update": "↑ Update" /* = Strings.Nest.Update (exists) */,
        "cat.openWindow": "Open as window" /* = Strings.Widget.Menu.OpenAsWindow (exists) */,
        "cat.installed": "Installed" /* = Strings.Nest.Installed (exists) */,
        "cat.slotOnly": "· slot only" /* = Strings.Nest.SlotOnly (exists) */,
        "cat.menu.more": "More" /* mock only, no XAML key */,
        "cat.menu.notifications": "Notifications" /* = Strings.Nest.Row.Notifications (exists) */,
        "cat.menu.pinBookmark": "Pin to bottom bar" /* = Strings.Nest.Row.PinBookmark (exists) */,
        "cat.menu.proxy": "Proxy" /* = Strings.Nest.Row.Proxy (exists) */,
        "cat.menu.revoke": "Revoke permissions" /* = Strings.Nest.Row.RevokeGrants (exists) */,
        "cat.menu.uninstall": "Uninstall" /* = Strings.Nest.Row.Uninstall (exists) */,

        /* ---- chips ---- */
        "cat.chip.bundled": "bundled · hash ✓" /* = Strings.Nest.Chip.Bundled (exists) */,
        "cat.chip.hosted": "hosted" /* = Strings.Nest.Chip.Hosted (exists) */,
        "cat.chip.noNetwork": "no network" /* = Strings.Nest.Chip.NoNetwork (exists) */,
        "cat.chip.network": "network · {n}" /* = Strings.Nest.Chip.NetworkFormat (exists) */,
        "cat.chip.url": "url" /* = Strings.Nest.Chip.Url (exists) */,
        "cat.chip.embeds": "embeds {host}" /* = Strings.Nest.Chip.EmbedsFormat (exists) */,
        "cat.chip.embedsCount": "embeds · {n}" /* = Strings.Nest.Chip.EmbedsCountFormat (exists) */,
        "cat.chip.more": "+{n}",

        /* ---- scopes ---- */
        "cat.scope.marketData": "Market data from open panels" /* = Strings.Widget.Scope.MarketData (exists) */,
        "cat.scope.account:read": "Read your positions, orders and balances" /* = Strings.Widget.Scope.AccountRead (exists) */,
        "cat.scope.trading": "Place and cancel orders" /* = Strings.Widget.Scope.Trading (exists) */,
        "cat.scope.panels": "Open and arrange panels" /* = Strings.Widget.Scope.Panels (exists) */,
        "cat.scope.notifications": "Raise notifications" /* = Strings.Widget.Scope.Notifications (exists) */,
        "cat.scope.signalLevels": "Manage price alerts" /* = Strings.Widget.Scope.SignalLevels (exists) */,
        "cat.scope.storage": "Store its own settings" /* = Strings.Widget.Scope.Storage (exists) */,

        /* ---- sort ---- */
        "cat.sort.label": "Sort" /* Strings.Nest.Sort.Label — NEW */,
        "cat.sort.name": "Name" /* Strings.Nest.Sort.Name — NEW */,
        "cat.sort.newest": "Newest" /* Strings.Nest.Sort.Newest — NEW */,
        "cat.sort.updated": "Recently updated" /* Strings.Nest.Sort.Updated — NEW */,
        "cat.sort.installs": "Most installed" /* Strings.Nest.Sort.Installs — NEW */,
        "cat.sort.active": "Most active" /* Strings.Nest.Sort.Active — NEW */,

        /* ---- paging ---- */
        "cat.showMore": "Show more" /* Strings.Nest.ShowMore — NEW */,
        "cat.shown": "Showing {shown} of {total}" /* Strings.Nest.ShownFormat — NEW */,

        /* ---- counts + dates (placeholders) ---- */
        "cat.badge.new": "NEW" /* Strings.Nest.Badge.New — NEW (planned) */,
        "cat.badge.new.title": "Listed less than 14 days ago" /* Strings.Nest.Badge.New.Tooltip — NEW */,
        "cat.installs": "Installs" /* Strings.Nest.Installs — NEW (planned) */,
        "cat.active7d": "Active (7 d)" /* Strings.Nest.ActiveUsers7d — NEW (planned) */,
        "cat.active7d.short": "in 7 d" /* Strings.Nest.ActiveUsers7d.Short — NEW */,
        "cat.firstListed": "Listed" /* Strings.Nest.FirstListed — NEW (planned) */,
        "cat.updated": "Updated" /* Strings.Nest.Updated — NEW (planned) */,
        "cat.unknown": "—" /* Strings.Nest.Unknown — NEW */,
        "cat.unknown.aria": "no data" /* Strings.Nest.Unknown.Aria — NEW */,
        "cat.likes": "♥" /* Strings.Nest.Likes — NEW, DEFERRED */,
        "cat.likes.title": "Reserved for ♥ — a separate rating iteration" /* mock only, no XAML key */,

        /* ---- package facts ---- */
        "cat.facts.mode": "Mode" /* = Strings.Nest.Listing.Mode (exists) */,
        "cat.facts.origin": "Entry origin" /* = Strings.Nest.Listing.Origin (exists) */,
        "cat.facts.version": "Version" /* = Strings.Nest.Listing.Version (exists) */,
        "cat.facts.size": "Size" /* = Strings.Nest.Listing.Size (exists) */,
        "cat.facts.hash": "Hash (pinned at install)" /* = Strings.Nest.Listing.Hash (exists) */,
        "cat.facts.hashShort": "Hash" /* Strings.Nest.Row.Hash — NEW */,
        "cat.facts.surfaces": "Surfaces" /* = Strings.Nest.Listing.Surfaces (exists) */,
        "cat.facts.egress": "Network (egress)" /* = Strings.Nest.Listing.Egress (exists) */,
        "cat.facts.embeds": "Embedded pages" /* = Strings.Nest.Listing.Embeds (exists) */,
        "cat.facts.apiVersion": "API version" /* = Strings.Nest.Listing.ApiVersion (exists) */,
        "cat.facts.compat": "Compatibility" /* NEW */,
        "cat.facts.compatValue": "Colibri {v} and newer" /* NEW */,
        "cat.needsColibri": "Requires Colibri {v} or newer" /* NEW */,
        "cat.needsColibri.hint": "This version requires Colibri {v} or newer. Update the terminal and the widget can be installed." /* NEW */,
        "cat.facts.permissions": "Permissions" /* = Strings.Nest.Listing.Permissions (exists) */,
        "cat.facts.noEgress": "none — works without the network" /* = Strings.Nest.Listing.NoEgress (exists) */,
        "cat.facts.noPermissions": "none" /* = Strings.Nest.Listing.NoPermissions (exists) */,
        "cat.facts.none": "none" /* = Strings.Nest.Listing.NoPermissions (exists) */,
        "cat.surface.slot": "slot" /* = Strings.Nest.Surface.Slot (exists) */,
        "cat.surface.window": "window" /* = Strings.Nest.Surface.Window (exists) */,
        "cat.author.youtube": "YouTube" /* = Strings.Nest.Author.Channel.Youtube (exists) */,
        "cat.author.telegram": "Telegram" /* = Strings.Nest.Author.Channel.Telegram (exists) */,

        /* ---- row groups + expander ---- */
        "cat.group.mode": "Package" /* Strings.Nest.Row.Group.Package — NEW */,
        "cat.group.scopes": "Permissions" /* Strings.Nest.Row.Group.Permissions — NEW */,
        "cat.group.network": "Network" /* Strings.Nest.Row.Group.Network — NEW */,
        "cat.group.tags": "Tags" /* Strings.Nest.Row.Group.Tags — NEW */,
        "cat.row.expand": "Details" /* Strings.Nest.Row.Expand — NEW */,
        "cat.row.collapse": "Collapse" /* Strings.Nest.Row.Collapse — NEW */,

        /* ---- table headers ---- */
        "cat.th.widget": "Widget" /* Strings.Nest.Col.Widget — NEW */,
        "cat.th.author": "Author" /* Strings.Nest.Col.Author — NEW */,
        "cat.th.usage": "Installs · active" /* Strings.Nest.Col.Usage — NEW */,
        "cat.th.dates": "Listed · updated" /* Strings.Nest.Col.Dates — NEW */,
        "cat.th.package": "Package" /* Strings.Nest.Col.Package — NEW */,
        "cat.th.actions": "Actions" /* Strings.Nest.Col.Actions — NEW */,
        "cat.tableCaption": "Nest widget catalog" /* Strings.Nest.Catalog.TableCaption — NEW */,

        /* ---- mock bar ---- */
        "cat.mock.label": "MOCKUP",
        "cat.mock.width": "Width",
        "cat.mock.rows": "Catalog",
        "cat.mock.rows10": "10 widgets (as today)",
        "cat.mock.rows28": "28 (paging)",
        "cat.mock.likes": "♥ slot",
        "cat.mock.expandAll": "expand all",
        "cat.mock.note": "Dashed underline = not on the wire yet: installs, active (7 d), dates, NEW. Everything else is the real catalog of 2026-09-07.",
        "cat.mock.copy": "(copy {n})",
        "cat.mock.copyTitle": "A repeat of a real row — only to exercise paging",
        "cat.mock.placeholder": "placeholder — not on the wire yet (планируется в реестре)"
    });
})();
