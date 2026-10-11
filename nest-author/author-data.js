/* The author, their widgets, versions and conversations: everything the prototype draws.

   Real: the author name Colibri and its two public catalog widgets (Фандинг-монитор, Радар
   ликвидаций): id, name, category, tags, both descriptions, permissions, network hosts, version
   1.0.0 and size, as the public catalog serves them.
   Invented (shown with a dashed underline on the page, `ph: true` here): every other widget, every
   date, count, pending update, release note, conversation, folder path and the author's contact
   details. Invented states (declined, refused, taken down) sit on invented widgets only.

   "Today" is pinned, so the dates read the same on every visit. */
window.AUTHOR_DATA = (function () {
    "use strict";
    var DAY = 864e5;
    var NOW = Date.UTC(2026, 9, 4, 7, 0); /* Sunday 04.10.2026, 11:00 at UTC+4 */
    function ago(days, hours) {
        return NOW - days * DAY - (hours || 0) * 36e5;
    }

    var widgets = [
        {
            id: "funding-monitor",
            name: "Фандинг-монитор",
            letter: "Ф",
            color: "#2f7d6d",
            real: true,
            state: "live",
            everApproved: true,
            visibility: "catalog",
            category: "analytics",
            tags: ["funding", "screener"],
            descRu: "Ставки финансирования по шести биржам — в годовых, отсортированы по экстремальности, с обратным отсчётом расчёта и алертами по порогу.",
            descEn: "Funding rates across six venues, annualized and sorted by extremity, with settlement countdowns and threshold alerts.",
            iconSet: true,
            sizeBytes: 72302,
            surfaces: ["slot", "window"],
            live: {
                permissions: ["notifications", "signalLevels", "storage"],
                egress: ["fapi.binance.com", "api.bybit.com", "api.gateio.ws", "api-futures.kucoin.com", "futures.kraken.com", "api.hyperliquid.xyz"]
            },
            code: {
                path: "D:\\widgets\\funding-monitor",
                manifestId: "funding-monitor",
                manifestVersion: "1.1.0",
                changedAt: ago(1, 3),
                hot: true,
                permissions: ["notifications", "signalLevels", "storage"],
                egress: ["fapi.binance.com", "api.bybit.com", "api.gateio.ws", "api-futures.kucoin.com", "futures.kraken.com", "api.hyperliquid.xyz", "www.okx.com"],
                /* the folder's widget.json raises the oldest terminal it supports (invented) */
                minColibri: "1.4.0"
            },
            share: "q3V9xTn2L8wRk4mZ0pYs7HcBfA1dJ6uE5gQiNoKtWvM",
            versions: [
                {
                    v: "1.1.0",
                    state: "pending",
                    ph: true,
                    submitted: ago(1, 2),
                    due: Date.UTC(2026, 9, 7, 7, 0),
                    notesRu: "Добавлена OKX — теперь семь бирж.\nАлерт по порогу можно задать отдельно для каждой биржи.",
                    notesEn: "OKX added — seven venues now.\nThe threshold alert can be set per venue.",
                    added: { egress: ["www.okx.com"] },
                    minColibri: "1.4.0",
                    thread: [
                        {
                            from: "moderator",
                            at: ago(0, 3),
                            body: "Зачем виджету www.okx.com — только публичные ставки фандинга? Ответьте здесь, и мы продолжим проверку."
                        }
                    ]
                },
                {
                    v: "1.0.0",
                    state: "approved",
                    current: true,
                    ph: true,
                    submitted: ago(41),
                    decided: ago(39),
                    notesRu: "",
                    notesEn: "",
                    thread: []
                }
            ],
            stats: { installs: 412, activeInstalls: 377, active7: 268, versions: [{ v: "1.0.0", n: 361 }, { v: null, n: 16 }] },
            /* The listing page beyond the card — all invented: the long text, the features, the pictures,
               the video and the links. Pictures are drawn by the page, not files: `art` names the drawing. */
            page: {
                aboutRu:
                    "## Что показывает\nСтавки финансирования шести бирж в одной таблице: текущая, прогноз и в годовых. Сверху — то, что платит больше всего в любую сторону.\n\n## Алерты\n- Порог в годовых — общий или свой для каждой биржи\n- Звук и окно терминала, когда порог пройден\n- Обратный отсчёт до расчёта в каждой строке\n\n## Где работает\nНа панели рядом со стаканом и в отдельном окне — например, на втором мониторе.",
                aboutEn:
                    "## What it shows\nFunding rates of six venues in one table: current, predicted and annualized. The top rows pay the most either way.\n\n## Alerts\n- An annualized threshold, shared or per venue\n- A sound and a terminal popup when it is crossed\n- A countdown to settlement on every row\n\n## Where it runs\nOn a panel beside the order book, or in its own window — on a second monitor, say.",
                features: [
                    { titleRu: "Шесть бирж в одной таблице", titleEn: "Six venues in one table", bodyRu: "Binance, Bybit, Gate, KuCoin, Kraken и Hyperliquid — без переключения вкладок.", bodyEn: "Binance, Bybit, Gate, KuCoin, Kraken and Hyperliquid — no tab switching." },
                    { titleRu: "Годовые и прогноз", titleEn: "Annualized and predicted", bodyRu: "Ставка приведена к годовым, рядом прогноз следующего расчёта.", bodyEn: "Each rate annualized, with the next settlement's prediction beside it." },
                    { titleRu: "Алерт по порогу", titleEn: "Threshold alert", bodyRu: "Звук и окно, когда ставка уходит за ваш порог.", bodyEn: "A sound and a popup when a rate crosses your line." }
                ],
                shots: [
                    { rev: "a1", art: "table" },
                    { rev: "b2", art: "alert" },
                    { rev: "c3", art: "window" }
                ],
                cover: true,
                video: "https://www.youtube.com/watch?v=Fm7Q2xKp9Lw",
                links: {
                    website: "https://example.org/funding-monitor",
                    docs: "https://example.org/funding-monitor/docs",
                    support: "https://t.me/example_support",
                    terms: "",
                    telegram: "https://t.me/example_news",
                    youtube: ""
                },
                languages: ["ru", "en"]
            }
        },
        {
            id: "liquidation-radar",
            name: "Радар ликвидаций",
            letter: "Р",
            color: "#8a3b2a",
            real: true,
            state: "live",
            everApproved: true,
            visibility: "catalog",
            category: "alerts",
            tags: ["liquidations", "market-wide"],
            descRu: "Живая лента ликвидаций по Binance, OKX, Bitget, Gate и Bybit — по всему рынку, с корзинами по размеру и звуковым порогом.",
            descEn: "Live liquidation feed across Binance, OKX, Bitget, Gate and Bybit — market-wide, with size buckets and a sound threshold.",
            iconSet: true,
            sizeBytes: 75162,
            surfaces: ["slot"],
            live: {
                permissions: ["notifications", "signalLevels", "storage"],
                egress: ["fstream.binance.com", "ws.okx.com:8443", "www.okx.com", "ws.bitget.com", "fx-ws.gateio.ws", "api.gateio.ws", "stream.bybit.com", "api.bybit.com"]
            },
            code: {
                path: "D:\\widgets\\liquidation-radar",
                manifestId: "liquidation-radar",
                manifestVersion: "1.0.0",
                changedAt: ago(0, 2),
                hot: true,
                permissions: ["notifications", "signalLevels", "storage"],
                egress: ["fstream.binance.com", "ws.okx.com:8443", "www.okx.com", "ws.bitget.com", "fx-ws.gateio.ws", "api.gateio.ws", "stream.bybit.com", "api.bybit.com", "www.deribit.com"]
            },
            share: "Zk8pR2mXw5Qe9LtB0vNc3HyJ7sAf4DgU1oKiW6rTqEa",
            versions: [
                {
                    v: "1.0.0",
                    state: "approved",
                    current: true,
                    ph: true,
                    submitted: ago(33),
                    decided: ago(31),
                    notesRu: "",
                    notesEn: "",
                    thread: []
                },
                {
                    /* invented: an earlier approved version, so «Откатиться» has somewhere to go */
                    v: "0.9.0",
                    state: "approved",
                    ph: true,
                    submitted: ago(52),
                    decided: ago(50),
                    notesRu: "",
                    notesEn: "",
                    permissions: ["notifications", "signalLevels", "storage"],
                    egress: ["fstream.binance.com", "ws.okx.com:8443", "www.okx.com", "fx-ws.gateio.ws", "api.gateio.ws", "stream.bybit.com", "api.bybit.com"],
                    thread: []
                }
            ],
            /* deliberately no stats: absent renders as nothing, never as zero */
            stats: null
        },
        {
            id: "5d1e8c2a-7f43-4b9e-a0c6-2e9b71f4d835",
            name: "Тепловая карта стакана",
            letter: "Т",
            color: "#4b4fa8",
            ph: true,
            state: "draft",
            everApproved: false,
            category: null,
            tags: [],
            descRu: "",
            descEn: "",
            iconSet: true,
            code: null,
            share: null,
            versions: [],
            stats: null
        },
        {
            id: "a83f0b6e-1c27-4d55-9e8a-f04c6b2d9e17",
            name: "Спред-сканер",
            letter: "С",
            color: "#7a5a12",
            ph: true,
            state: "draft",
            everApproved: false,
            category: "market-data",
            tags: ["спред", "арбитраж"],
            descRu: "Спред одной монеты между спотом и фьючерсом на пяти биржах, с подсветкой расхождений.",
            descEn: "One coin's spot-to-futures spread across five venues, with divergences highlighted.",
            iconSet: true,
            surfaces: ["slot", "window"],
            code: {
                path: "D:\\widgets\\spread-scanner",
                manifestId: "a83f0b6e-1c27-4d55-9e8a-f04c6b2d9e17",
                manifestVersion: "1.0.0",
                changedAt: ago(0, 5),
                hot: true,
                permissions: ["marketData", "storage"],
                egress: ["api.binance.com", "fapi.binance.com", "api.bybit.com"]
            },
            share: null,
            versions: [],
            stats: null
        },
        {
            id: "3c9a6f10-8b2d-4e71-b5f4-91d0e7a2c468",
            name: "Алерты объёма",
            letter: "А",
            color: "#9c2f5e",
            ph: true,
            state: "draft",
            everApproved: false,
            category: "alerts",
            tags: ["объём", "алерты"],
            descRu: "Звук и уведомление, когда минутный объём монеты превышает средний в N раз.",
            descEn: "A sound and a notification when a coin's one-minute volume exceeds its average N times.",
            iconSet: true,
            surfaces: ["slot"],
            code: {
                path: "D:\\widgets\\volume-alerts",
                manifestId: "3c9a6f10-8b2d-4e71-b5f4-91d0e7a2c468",
                manifestVersion: "1.0.0",
                changedAt: ago(0, 20),
                hot: false,
                permissions: ["marketData", "notifications", "storage"],
                egress: []
            },
            share: "Hn4Lq8Tz1Wc6Yx3Ve9Bk0Rm5Ps2Jd7Fa4Gu8Oi1NtEh",
            versions: [
                {
                    v: "1.0.0",
                    state: "rejected",
                    ph: true,
                    submitted: ago(5),
                    decided: ago(2, 4),
                    notesRu: "",
                    notesEn: "",
                    rejection: { source: "moderator", code: "review.excess-permissions" },
                    permissions: ["marketData", "notifications", "trading", "storage"],
                    thread: [
                        {
                            from: "moderator",
                            at: ago(2, 4),
                            body: "Виджет запрашивает «Выставление и отмена ордеров», но в коде нет ни одного ордера. Уберите trading из permissions и отправьте новую версию."
                        }
                    ]
                }
            ],
            stats: null
        },
        {
            id: "e2b47d91-6a0c-4f38-8d15-c7a93f2e0b64",
            name: "Кластерный поиск",
            letter: "К",
            color: "#3d6b2e",
            ph: true,
            state: "draft",
            everApproved: false,
            category: "analytics",
            tags: ["кластеры"],
            descRu: "Ищет кластеры крупных сделок на выбранных монетах.",
            descEn: "Finds clusters of large trades on the chosen coins.",
            iconSet: false,
            surfaces: ["window"],
            code: {
                path: "D:\\widgets\\cluster-search",
                manifestId: "e2b47d91-6a0c-4f38-8d15-c7a93f2e0b64",
                manifestVersion: "0.3.0",
                changedAt: ago(0, 1),
                hot: true,
                permissions: ["marketData", "storage"],
                egress: ["api.cluster-data.example"]
            },
            share: null,
            versions: [
                {
                    v: "0.3.0",
                    state: "refused",
                    ph: true,
                    submitted: ago(0, 6),
                    decided: ago(0, 6),
                    notesRu: "",
                    notesEn: "",
                    rejection: {
                        source: "checks",
                        code: "egress-ws.undeclared-host",
                        check: "egress-ws",
                        detail: "wss://stream.cluster-data.example/ws is opened in app.js but stream.cluster-data.example is not declared in egress."
                    },
                    failAt: 9,
                    thread: []
                }
            ],
            stats: null
        },
        {
            id: "71f0c3d8-2e9a-4b6c-8f17-5a4d0e9b3c21",
            name: "Мини-график сделок",
            letter: "М",
            color: "#2b5f8f",
            ph: true,
            state: "link",
            everApproved: true,
            visibility: "link",
            category: "market-data",
            tags: ["лента", "график"],
            descRu: "Компактный график ленты сделок для узкой панели.",
            descEn: "A compact trade-tape chart for a narrow panel.",
            iconSet: true,
            surfaces: ["slot"],
            live: { permissions: ["marketData", "storage"], egress: [] },
            code: {
                path: "D:\\widgets\\mini-tape",
                manifestId: "71f0c3d8-2e9a-4b6c-8f17-5a4d0e9b3c21",
                manifestVersion: "1.0.0",
                changedAt: ago(9),
                hot: true,
                permissions: ["marketData", "storage"],
                egress: [],
                /* an older folder: its widget.json still names the widget, though the name and the
                   icon now live on the widget in Nest and nothing reads them from the file (invented) */
                legacyFields: ["name", "icon"]
            },
            share: "Pb7Kx2Nd9Qw4Ls1Mv8Ry3Tc6Hj0Fz5Ga2Ue7Wo4IkXs",
            versions: [
                {
                    v: "1.0.0",
                    state: "pending",
                    ph: true,
                    submitted: ago(8),
                    due: ago(3),
                    overdue: true,
                    notesRu: "Тики крупнее порога выделяются цветом.",
                    notesEn: "Ticks above the threshold are colour-coded.",
                    thread: [{ from: "author", at: ago(1, 5), body: "Здравствуйте! Подскажите, нужно ли что-то поменять, чтобы версию посмотрели?" }]
                },
                {
                    v: "0.9.2",
                    state: "approved",
                    current: true,
                    ph: true,
                    submitted: ago(26),
                    decided: ago(24),
                    notesRu: "Первая версия для тестеров.",
                    notesEn: "",
                    thread: []
                }
            ],
            stats: { installs: 37, activeInstalls: 33, active7: 21, versions: [{ v: "0.9.2", n: 33 }] }
        },
        {
            id: "b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954",
            name: "Старый тикер",
            letter: "С",
            color: "#5b5f66",
            ph: true,
            state: "withdrawn",
            everApproved: true,
            visibility: "catalog",
            category: "market-data",
            tags: ["тикер"],
            descRu: "Бегущая строка цен по избранным монетам.",
            descEn: "A scrolling price ticker for favourite coins.",
            iconSet: true,
            surfaces: ["slot"],
            live: { permissions: ["marketData"], egress: [] },
            code: null,
            share: "Tr5Wm1Qx8Lc3Nb6Vz0Kp9Jd2Hs7Fy4Ga1Ue8Oi5RkMw",
            withdrawnAt: ago(12),
            /* retired the gentle way: marked out of date with a replacement, then taken out of the
               catalog. Users who have it see both (invented) */
            deprecated: true,
            successor: "crypto-market-map",
            versions: [
                { v: "2.1.0", state: "approved", current: true, ph: true, submitted: ago(140), decided: ago(138), notesRu: "Тёмная тема.", notesEn: "Dark theme.", thread: [] },
                { v: "2.0.0", state: "approved", ph: true, submitted: ago(200), decided: ago(197), notesRu: "", notesEn: "", thread: [] }
            ],
            stats: { installs: 1290, activeInstalls: 1027, active7: 64, versions: [{ v: "2.1.0", n: 822 }, { v: "2.0.0", n: 193 }, { v: null, n: 12 }] }
        },
        {
            id: "0d6c2f85-9a14-4e7b-b3c0-8e51f9a27d46",
            name: "Копи-сигналы",
            letter: "К",
            color: "#6e3a8c",
            ph: true,
            state: "takendown",
            everApproved: true,
            visibility: "catalog",
            category: "trading",
            tags: ["сигналы"],
            descRu: "Сигналы из канала автора прямо на панели.",
            descEn: "Signals from the author's channel right on the panel.",
            iconSet: true,
            surfaces: ["slot"],
            live: { permissions: ["notifications", "storage"], egress: ["api.signals.example"] },
            code: null,
            share: "Vc2Ny7Lm4Qb9Kx1Ts6Hw3Jp8Fd0Gz5Ra2Ue7Oi4WkLn",
            takedown: { at: ago(6), reason: "В описании обещана доходность, а виджет ведёт в платный канал. Это против правил содержания Nest." },
            versions: [{ v: "1.2.0", state: "approved", current: true, ph: true, submitted: ago(60), decided: ago(58), notesRu: "", notesEn: "", thread: [] }],
            stats: { installs: 88, activeInstalls: 71, active7: 5, versions: [{ v: "1.2.0", n: 71 }] }
        }
    ];

    /* The public catalog the successor picker searches: the real listings of the catalog mock, id,
       name and author only. */
    var catalog = [
        { id: "algoradar", name: "AlgoRadar", author: "Vazgen", color: "#4a5a8c" },
        { id: "colibri-screener", name: "Colibri Screener", author: "Stepan", color: "#2f6d7d" },
        { id: "crypto-market-map", name: "Карта рынка", author: "Aleksandr", color: "#3d7a4a" },
        { id: "funding-monitor", name: "Фандинг-монитор", author: "Colibri", color: "#2f7d6d" },
        { id: "large-tick-timer", name: "Таймер Крупных Тиков", author: "Exchange Speculator", color: "#7d5a2f" },
        { id: "liquidation-radar", name: "Радар ликвидаций", author: "Colibri", color: "#8a3b2a" },
        { id: "oi-monitor", name: "OI Monitor", author: "Michael Khodos", color: "#5a3d7a" },
        { id: "scalp-lenta", name: "Pump & Dump / Impulse", author: "Exchange Speculator", color: "#7a3d5a" },
        { id: "scalpy-net", name: "SCALPY.NET", author: "Armen Lalayan", color: "#3d5f7a" },
        { id: "twap-radar", name: "TWAP-радар", author: "Hayk Kupalyan", color: "#6d6d2f" }
    ];

    /* A widget another author is handing to this one: what the code on the mock's example button
       opens. All invented. */
    var incoming = {
        code: "T7R4X-K2M9Q-8HVNC-3WDPB",
        from: "Тигран М.",
        expires: NOW + 5 * DAY,
        widget: {
            id: "c4e81a0f-3b6d-4f29-9a57-d10e6b8c2f93",
            name: "Объёмы по часам",
            letter: "О",
            color: "#3a6e8c",
            ph: true,
            state: "live",
            everApproved: true,
            visibility: "catalog",
            category: "analytics",
            tags: ["объём", "сессии"],
            descRu: "Объём торгов по часам суток за последние 30 дней — видно, когда рынок живой.",
            descEn: "Trading volume by hour of day over the last 30 days — shows when the market is alive.",
            iconSet: true,
            surfaces: ["slot", "window"],
            live: { permissions: ["marketData", "storage"], egress: [] },
            code: null,
            share: "Ux4Mb8Lq1Nd6Kw3Rz9Ts2Hc7Fp0Gj5Va2Ye8Oi4XkWn",
            versions: [{ v: "1.3.0", state: "approved", current: true, ph: true, submitted: ago(33), decided: ago(31), notesRu: "Выбор биржи.", notesEn: "Venue picker.", thread: [] }],
            stats: { installs: 214, activeInstalls: 188, active7: 97, versions: [{ v: "1.3.0", n: 188 }] }
        }
    };

    return {
        NOW: NOW,
        DAY: DAY,
        /* The four starters of the SDK's release, as its starters.json names them: the tiles of
           «Из шаблона». serve is the folder the terminal links; node marks a project that needs
           Node.js to edit (its ready build is in the zip, so it runs at once without it). */
        starters: [
            {
                key: "plain",
                title: "Простой",
                desc: "Одна HTML-страница без сборки: живая цена из стакана и сохранённая настройка.",
                serve: "widget",
                edit: "widget\\index.html",
                node: false
            },
            {
                key: "react",
                title: "TypeScript + React",
                desc: "Vite, TypeScript и React с типами API. Готовая сборка работает сразу; править — с Node.js.",
                serve: "dist",
                edit: "src\\App.tsx",
                node: true
            },
            {
                key: "trading",
                title: "Торговый",
                desc: "Счёт подключения вживую и лимитная заявка — только по подтверждённому клику.",
                serve: "dist",
                edit: "src\\App.tsx",
                node: true
            },
            {
                key: "chart",
                title: "График",
                desc: "Свечи из живых сделок на canvas, без сторонних библиотек и без сборки.",
                serve: "widget",
                edit: "widget\\chart.js",
                node: false
            }
        ],
        starterParent: "C:\\Users\\Anna\\ColibriWidgets",
        catalog: catalog,
        incoming: incoming,
        registry: "https://nest.colibritech.xyz",
        author: {
            name: "Colibri",
            /* the key has the real shape: 43 base64url characters. Invented. */
            id: "q3V9k1Lx7Rz0TfA2mWcN8pYh4sJdG6uEbK5oXiQ1vZw",
            email: "nest-team@example.com",
            youtube: "",
            telegram: "https://t.me/colibri_terminal",
            contactTg: "@colibri_team",
            sourceCode: "",
            /* Keys and co-maintainers. Everything below is invented. A key with no member is the
               owner's; «этот ПК» is k1 for the owner and k3 for the co-maintainer Анна. */
            machine: "DESKTOP-4F7K2",
            keys: [
                { id: "k1", label: "Рабочий ПК", member: null, origin: "created", added: ago(41), lastUsed: ago(0) },
                { id: "k2", label: "Ноутбук", member: null, origin: "pairing", added: ago(12), lastUsed: ago(3) },
                { id: "k3", label: "DESKTOP-7Q2M", member: "m1", origin: "invitation", added: ago(5), lastUsed: ago(1) }
            ],
            members: [
                { id: "m1", name: "Анна", status: "active", added: ago(5) },
                { id: "m2", name: "Давид", status: "invited", expires: NOW + 5 * DAY }
            ],
            recoverySetAt: null,
            emailVerified: false,
            /* The codes a dialog shows, Crockford base32 in groups of five. Invented. */
            /* Анна's key on her PC, for the co-maintainer view. Invented. */
            maintKey: "Hn2mK8pR4vT0yW6qZ1cX9bF3jL5sD7gA0eU2iO4kM8n",
            codes: {
                pairing: "7KQ2M-H9XRT-4VN8C-WD3PJ",
                invitation: "M4T9X-2RKQH-8CVNW-J6PD3",
                recovery: "K7M2Q-9XRT4-HV8NC-3WDPJ-6FB1G-ZE5YA",
                email: "B3N7R-5TQ2X-K8WMH-9CVDJ",
                transfer: "R2W8K-M5QTX-9HCVN-4JDPF"
            }
        },
        widgets: widgets,
        /* "code first": a dev folder loaded in the terminal that Nest has never heard of */
        local: [{ key: "my-orderflow", path: "D:\\dev\\my-orderflow", manifestId: "my-orderflow", manifestVersion: "0.1.0", changedAt: ago(0, 1), hot: true }],
        /* The user's side («глазами пользователя»): the user has Фандинг-монитор 1.0.0, and the
           pending 1.1.0 is drawn as approved today. `between` is the "several versions behind"
           example: two more approved versions between 1.0.0 and 1.1.0, one of them revoked. All
           invented. */
        userView: {
            installed: "1.0.0",
            between: [
                {
                    v: "1.0.2",
                    released: ago(12),
                    notesRu: "Обратный отсчёт до расчёта виден прямо в строке биржи.\nСортировка по экстремальности учитывает знак ставки.",
                    notesEn: "The settlement countdown is right in the venue's row.\nSorting by extremity respects the rate's sign."
                },
                {
                    v: "1.0.1",
                    released: ago(26),
                    revoked: true,
                    notesRu: "Исправлен пересчёт ставки в годовые для Kraken.",
                    notesEn: "Fixed the annualized rate for Kraken."
                }
            ]
        },
        /* The author's feed under the bell, newest first. Only moderator decisions, replies, takedowns and
           Nest's own notices land here — never what the author did. Takedowns and revocations also go
           out by e-mail. The first `unread` rows are new. */
        unread: 3,
        events: [
            { kind: "review.reply", widget: "funding-monitor", v: "1.1.0", at: ago(0, 3) },
            /* a moderator checked an edit after the fact and removed one picture, saying why */
            {
                kind: "listing.moderated",
                widget: "funding-monitor",
                parts: "скриншот 4",
                reason: "На скриншоте виден чужой API-ключ — закройте его и загрузите снова.",
                at: ago(0, 6),
                ph: true
            },
            { kind: "version.declined", widget: "3c9a6f10-8b2d-4e71-b5f4-91d0e7a2c468", v: "1.0.0", reason: "review.excess-permissions", at: ago(2, 4) },
            /* a request for the catalog, answered on its own — no version came with it */
            {
                kind: "catalog.declined",
                widget: "71f0c3d8-2e9a-4b6c-8f17-5a4d0e9b3c21",
                reason: "Добавьте описание на английском — без него в каталог не берём. Ссылка работает как прежде.",
                at: ago(4, 2),
                ph: true
            },
            {
                kind: "widget.taken-down",
                widget: "0d6c2f85-9a14-4e7b-b3c0-8e51f9a27d46",
                reason: "В описании обещана доходность, а виджет ведёт в платный канал. Это против правил содержания Nest.",
                at: ago(6)
            },
            /* the Nest team voided a transfer code the author had made; the widget stayed theirs */
            { kind: "transfer.voided", widget: "b09e4a72-5d31-4c8f-a6e0-3f7b28d1c954", at: ago(9), ph: true },
            { kind: "notice", title: "Панели виджетов: что изменится в следующей версии Colibri", url: "https://example.org/nest/notices", at: ago(12), ph: true },
            /* a widget handed to another author: it is no longer in the list, so the row names it itself */
            { kind: "widget.transferred", name: "Сигнальная линия", to: "Тигран М.", at: ago(20), ph: true },
            { kind: "version.approved", widget: "liquidation-radar", v: "1.0.0", at: ago(31) }
        ]
    };
})();
