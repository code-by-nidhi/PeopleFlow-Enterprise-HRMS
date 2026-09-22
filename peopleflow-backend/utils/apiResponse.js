const sendSuccess = (res, { statusCode = 200, message = 'OK', data = null, meta } = {}) => {
    const body = { success: true, message, data }
    if (meta) body.meta = meta
    return res.status(statusCode).json(body)
}

/** Reads ?page & ?limit and returns skip/limit plus a meta builder. */
const getPagination = (query, defaultLimit = 10) => {
    const page = Math.max(parseInt(query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100)
    return {
        page,
        limit,
        skip: (page - 1) * limit,
        buildMeta: (total) => ({ page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) })
    }
}

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

module.exports = { sendSuccess, getPagination, escapeRegex }
