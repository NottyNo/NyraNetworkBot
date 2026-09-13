const { roleMultipliers, default: defaultMultiplier } = require('../config/xpMultipliers.json');

function getMultiplier(member) {
    let highest = defaultMultiplier;

    for (const [roleId, multiplier] of Object.entries(roleMultipliers)) {
        if (member.roles.cache.has(roleId) && multiplier > highest) {
            highest = multiplier;
        }
    }

    return highest;
}

function xpForLevel(level) {
    return 5 * (level ** 2) + 50 * level + 100;
}

module.exports = { getMultiplier, xpForLevel };