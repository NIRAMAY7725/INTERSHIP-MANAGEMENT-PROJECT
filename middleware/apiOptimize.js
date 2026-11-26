const apiOptimize = (req, res, next) => {
    const start = process.hrtime.bigint();
    res.set("Cache-Control", "no-store");
    res.vary("Accept-Encoding");
    const writeHead = res.writeHead;
    res.writeHead = function (...args) {
        if (!this.headersSent) {
            this.setHeader("X-Response-Time", (Number(process.hrtime.bigint() - start) / 1e6).toFixed(2) + "ms");
        }
        return writeHead.apply(this, args);
    };
    next();
};
const cacheFor = seconds => (req, res, next) => {
    res.set("Cache-Control", "public, max-age=" + seconds);
    next();
};
module.exports = { apiOptimize, cacheFor };
