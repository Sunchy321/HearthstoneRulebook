const { MongoClient } = require('mongodb');
const fs = require('fs');

const client = new MongoClient('mongodb://localhost:27017');
const carddefs = fs.readFileSync('./card-defs.tex').toString();
const missingcards = fs.readFileSync('./missing-cards.txt').toString();

const setMap = {
    van: '怀旧',
    legacy: '基本',
    basic: '基本',
    skin: '基本',
    classic: '经典',
    core21: '核心2021',
    core22: '核心2022',
    naxx: '纳克萨玛斯',
    gvg: '地精大战侏儒',
    brm: '黑石山',
    tgt: '冠军的试炼',
    loe: '探险者协会',
    wog: '古神',
    onk: '卡拉赞',
    msg: '加基森',
    jug: '安戈洛',
    kft: '冰封王座',
    knc: '狗头人',
    tww: '女巫森林',
    tbp: '砰砰计划',
    sou: '奥丹姆',
    rkr: '拉斯塔哈',
    ros: '暗影崛起',
    dod: '巨龙降临',
    gra: '迦拉克隆的觉醒',
    dhi: '恶魔猎手新兵',
    aoo: '外域',
    sma: '通灵学园',
    mdf: '马戏团',
    fib: '贫瘠之地',
    uis: '暴风城',
    fav: '奥特兰克',
    vsc: '沉没之城',
    mcn: '纳斯利亚堡',
    bgs: '酒馆战棋'
};

const setBlackList = [
    'mercenaries',
    'mission',
    'tb',
    'tot',
];

const typeMap = {
    minion:     '随从',
    spell:      '法术',
    weapon:     '武器',
    hero:       '英雄',
    hero_power: '英雄技能',
};

const classMap = {
    neutral:      '中立',
    mage:         '法师',
    druid:        '德鲁伊',
    hunter:       '猎人',
    paladin:      '圣骑士',
    priest:       '牧师',
    rogue:        '潜行者',
    shaman:       '萨满祭司',
    warlock:      '术士',
    warrior:      '战士',
    demon_hunter: '恶魔猎手',
    death_knight: '死亡骑士',
    dream:        '梦境',

    'mage-rogue': '法贼双职业',
    'druid-shaman': '德萨双职业',
    'priest-warlock': '牧术双职业',
    'shaman-mage': '萨法双职业',
    'warlock-demon_hunter': '术瞎双职业',
    'demon_hunter-hunter': '瞎猎双职业',

    'mage-priest-warlock': '暗金教'
};

const raceMap = {
    beast:     '野兽',
    demon:     '恶魔',
    dragon:    '龙',
    elemental: '元素',
    mech:      '机械',
    murloc:    '鱼人',
    naga:      '娜迦',
    pirate:    '海盗',
    totem:     '图腾',
};

function sortBy(map) {
    const keys = Object.keys(map);

    return (a, b) => keys.indexOf(a) - keys.indexOf(b);
}

function parentOf(id) {
    if (id === 'GAME_005e') { return null; }

    const m = /(e|t|t2|p)$/.exec(id);

    if (m == null) { return null; }

    return id.slice(0, -m[0].length);
}

function escape(id) {
    return id.replace(/_/g, '-');
}

function unescape(id) {
    return id.replace(/-/g, '_');
}

// 合并卡牌列表
const cards = [];

for (const line of carddefs.split('\n')) {
    const m = /^\\card@def(?:\[(.*?)\])?\{(.*?)\}\{(.*?)\}/.exec(line);

    if (m != null) {
        cards.push({
            parent: m[1] ? unescape(m[1]) : null,
            id: unescape(m[2]),
            name: m[3],
            isOld: true
        });
    }
}

for (const line of missingcards.split('\n')) {
    if (line.startsWith('!')) {
        cards.push({ id: unescape(line.slice(1)) });
    } else {
        cards.push({ name: line });
    }
}

for (const c of cards) {
    if (c.id == null) {
        continue;
    }

    const parent = c.parent ?? parentOf(c.id);

    if (parent == null) {
        continue;
    }

    if (!cards.some(v => v.id === parent)) {
        if (c.parent == null) {
            c.parent = parent;
        }

        cards.push({ id: parent });
    }
}

async function run() {
    await client.connect();

    const patches = await client.db('hearthstone').collection('patches');

    const patchList = await patches.find().sort('number', -1).toArray();

    const entities = await client.db('hearthstone').collection('entities');

    const cardData = await entities.find({
        cardId: { $not: /^Story|Puzzle$/ },
        set: { $nin: setBlackList },
        versions: patchList[0].number,
        $or: [
            { cardId: { $in: cards.filter(c => c.id != null).map(c => c.id ) }},
            { localization: {
                $elemMatch: {
                    lang: { $in: ['en', 'zhs'] },
                    name: { $in: cards.filter(c => c.name != null).map(c => c.name ) },
                }
            }}
        ]
    });

    const result = [];

    // 生成卡牌定义TeX代码
    await cardData.forEach(c => {
        const loc = c.localization.find(c => c.lang === 'zhs');

        const id = c.cardId;
        const set = c.set;
        const type = c.cardType;
        const classes = c.classes.join('-');
        const cost = c.cost || 0;
        const name = loc.name;
        const text = (loc.text || '')
            .replace(/\n/g, ' ')
            .replace(/%/g, '\\%');

        const oldCardsWithName = cards.filter(v => v.name === name && v.isOld);

        // 不包含状态
        if (type === 'enchantment') {
            return;
        }

        // 一些同名牌被包括进来了，并且没有明确指定此id的牌
        if (
            oldCardsWithName.length > 0 &&
            !oldCardsWithName.some(v => v.id === id) &&
            !cards.some(c => c.id === id)
        ) {
            return;
        }

        const brief = (() => {
            if (type === 'enchantment') {
                return '';
            }

            let result = '';

            result += classMap[classes] || classes;

            if (['minion', 'weapon'].includes(type)){
                result += `${cost}/${c.attack || 0}/${c.health || c.durability || 0}`
            } else {
                result += `${cost}费`;
            }

            if (c.race) {
                result += raceMap[c.race] || c.race;
            } else {
                result += typeMap[type] || type;
            }

            return result;
        })();

        const parent = cards.find(v => v.id === id)?.parent ?? parentOf(id);

        const value = {
            id, parent, set, type, classes, cost,
            enName: c.localization.find(l => l.lang === 'en')[0]?.name ?? '',
            def: parent != null
                ? `\\card@def[${escape(parent)}]{${escape(id)}}{${name}}{${brief}}{${text}}`
                : `\\card@def{${escape(id)}}{${name}}{${brief}}{${text}}`
        }

        result.push(value);
    })

    let carddefs = '';

    const mainCards = [];
    const derivedCards = [];

    // 分离独立卡牌和衍生卡牌
    for (let v of result) {
        if (v.parent == null || cards.every(c => c.id !== v.parent)) {
            mainCards.push(v);
        } else {
            derivedCards.push(v);
        }
    }

    const groups = {};

    // 按扩展包分组
    for (let v of mainCards) {
        if (groups[v.set] == null) {
            groups[v.set] = [];
        }

        groups[v.set].push(v);
    }

    const sorter = (a, b) => {
        const sortByClass = sortBy(classMap)(a.classes, b.classes);
        if (sortByClass !== 0) { return sortByClass; }

        const sortByCost = a.cost - b.cost;
        if (sortByCost !== 0) { return sortByCost; }

        const sortByType = sortBy(typeMap)(a.type, b.type);
        if (sortByType !== 0) { return sortByType; }

        return a.enName > b.enName ? 1 : a.enName < b.enName ? -1 : 0;
    }

    // 按扩展包排序
    for (let s of Object.keys(groups).sort(sortBy(setMap))) {
        // 按类型、职业、费用排序
        const g = groups[s].sort(sorter);

        carddefs += `% ${setMap[s] || s}\n`;

        for (const v of g) {
            carddefs += v.def + '\n';

            const children = derivedCards.filter(u => u.parent === v.id);

            for (const c of children) {
                carddefs += c.def + '\n';
                c.used = true;
            }
        }

        carddefs += '\n';
    }

    console.log(
        cards.filter(v => v.id === 'GILA_BOSS_35p' || v.name === '嗜血渴望')
    )

    fs.writeFileSync('./card-defs.tex', carddefs.trim());

    await client.close();
}

run();