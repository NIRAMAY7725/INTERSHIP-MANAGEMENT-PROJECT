/**
 * API Optimization Middleware
 * - Adds X-Response-Time header for performance debugging
 * - Sets Cache-Control hints for API responses
 * - Helps mobile clients minimize redundant requests
 */

const apiOptimize = (req, res, next) => {
    const start = process.hrtime.bigint();

    // Set default API cache headers (no-cache for mutable data)
    res.set("Cache-Control", "no-cache, must-revalidate");
    res.set("Vary", "Accept-Encoding");

    // Override finish to add timing header
    const originalEnd = res.end;
    res.end = function (...args) {
        const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms
        res.set("X-Response-Time", `${elapsed.toFixed(2)}ms`);
        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Static data cache middleware — use on read-only endpoints
 * that don't change frequently (e.g., listing categories)
 */
const cacheFor = (seconds) => (req, res, next) => {
    res.set("Cache-Control", `public, max-age=${seconds}`);
    next();
};

module.exports = { apiOptimize, cacheFor };
