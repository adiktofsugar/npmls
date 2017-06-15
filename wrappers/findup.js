const findupCb = require("findup");
const Promise = require("promise");

module.exports = (...args) => new Promise((resolve, reject) => {
  const cb = (err, dir) => {
    if (err) return reject(err);
    resolve(dir);
  };
  args.push(cb);
  findupCb(...args);
})
