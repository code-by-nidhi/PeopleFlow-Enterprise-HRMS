const crypto = require('crypto')

// Temporary passwords satisfy the same policy as user-chosen ones
const generateRandomPassword = () => {
    const pick = (chars) => chars[crypto.randomInt(chars.length)]
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower = 'abcdefghijkmnpqrstuvwxyz'
    const digits = '23456789'
    const special = '@$!%*?&'
    const all = upper + lower + digits + special

    const chars = [pick(upper), pick(lower), pick(digits), pick(special)]
    while (chars.length < 12) chars.push(pick(all))

    for (let i = chars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1)
        ;[chars[i], chars[j]] = [chars[j], chars[i]]
    }
    return chars.join('')
}

module.exports = generateRandomPassword
